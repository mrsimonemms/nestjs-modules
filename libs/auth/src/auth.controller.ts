/*
 * Copyright 2025 Simon Emms <simon@simonemms.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Session as FastifySession } from '@fastify/secure-session';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  Inject,
  InternalServerErrorException,
  Logger,
  Param,
  Put,
  Query,
  Req,
  Res,
  Session,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { instanceToPlain } from 'class-transformer';
import { Request as ExpressReq } from 'express';
import { FastifyReply, FastifyRequest } from 'fastify';

import { JWTGuard } from './auth.guards';
import {
  AuthSession,
  ProviderUserData,
  RequestType,
  RouteListProviders,
  StrategyUserDataResponse,
  UserEntity,
} from './auth.interfaces';
import { AuthService } from './auth.service';
import { fastifyToExpress } from './auth.util';
import { UpdateUserDTO } from './dto';

@Controller()
@ApiTags('authentication')
export class AuthController {
  private readonly logger = new Logger(this.constructor.name);

  @Inject(AuthService)
  private readonly service: AuthService;

  @UseGuards(JWTGuard)
  @Delete('/user')
  @ApiBearerAuth()
  @ApiNoContentResponse({
    description: 'Delete the logged-in user',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden',
    type: ForbiddenException,
  })
  @HttpCode(204)
  deleteUser(@Req() { user }: RequestType): Promise<void> {
    return this.service.deleteUserById(user.id);
  }

  @UseGuards(JWTGuard)
  @Get('/user')
  @ApiBearerAuth()
  @ApiAcceptedResponse({
    description: 'User data',
  })
  getUser(@Req() { user }: RequestType) {
    return user;
  }

  @UseGuards(JWTGuard)
  @Put('/user')
  @ApiBearerAuth()
  @ApiBody({
    description: 'Input data',
    type: UpdateUserDTO,
  })
  @ApiOkResponse({
    description: 'User data',
  })
  updateUser(
    @Req() { user }: RequestType,
    @Body() data: UpdateUserDTO,
  ): Promise<UserEntity> {
    return this.service.updateUserProfile(user.id, data);
  }

  @Get('/providers')
  @ApiOperation({ summary: 'List the configured providers' })
  listProviders(): RouteListProviders {
    return { providers: this.service.listProviders() };
  }

  @Get('/login/:providerId')
  @ApiOperation({ summary: 'Dispatch to authentication provider' })
  @ApiResponse({
    status: 302,
    description: 'Dispatch to authentication provider login',
  })
  @ApiQuery({
    name: 'callback',
    description: 'Provide a redirection URL after successful login',
    example: 'https://shipittothe.cloud/login',
  })
  @ApiParam({
    name: 'providerId',
    description: 'Provider ID',
    example: 'github',
  })
  async loginToProvider(
    @Param('providerId') providerId: string,
    @Query('callback') callbackUrl: string,
    @Req() req: FastifyRequest, // This is actually FastifyRequest, but with decorators
    @Res() res: FastifyReply, // This is actually FastifyReply, but with decorators
    @Session() session: FastifySession<AuthSession>,
  ) {
    this.logger.debug('Attempting login', { providerId });

    // Remove any extant callback URLs
    session.set('authCallbackURL', undefined);

    if (callbackUrl) {
      this.logger.debug('Saving callback URL to session');
      session.set('authCallbackURL', callbackUrl);
    }

    const handler = this.service.getProviderHandler(providerId);

    const { req: expressReq, res: expressRes } = fastifyToExpress(req, res);

    return handler(
      expressReq,
      expressRes,
      (err?: Error | 'router' | 'route') => {
        // If we've gotten here, something has gone very wrong
        this.logger.error(
          'Provider middleware nextfunction has been triggered',
          {
            err,
          },
        );

        throw new InternalServerErrorException(err);
      },
    );
  }

  @Get('/login/:providerId/callback')
  @ApiOperation({ summary: 'Ingest the login data from the provider' })
  @ApiResponse({
    description: 'Dispatch to authentication provider login',
  })
  @ApiParam({
    name: 'providerId',
    description: 'Provider ID',
    example: 'github',
  })
  async loginCallback(
    @Param('providerId') providerId: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
    @Session() session: FastifySession<AuthSession>,
  ) {
    this.logger.debug('Attempting login callback', { providerId });

    const callbackUrl = session.get('authCallbackURL');

    const handler = this.service.getProviderHandler(providerId);

    const { req: expressReq, res: expressRes } = fastifyToExpress(req, res);

    return handler(
      expressReq,
      expressRes,
      (err?: Error | 'router' | 'route') => {
        void this.loginCallbackHandler(
          err,
          providerId,
          expressReq,
          // More jiggery-pokery. The res is actually the FastifyReply masquerading
          // as an Express Response and the redirect argments are reversed
          res as unknown as FastifyReply,
          session,
          callbackUrl,
        );
      },
    );
  }

  private async loginCallbackHandler(
    err: Error | 'router' | 'route' | undefined,
    providerId: string,
    req: ExpressReq,
    res: FastifyReply,
    session: FastifySession<AuthSession>,
    callbackUrl?: string,
  ) {
    try {
      // Delete the session data
      session.delete();

      // Handle any errors that may arise from the strategy
      if (err) {
        throw new InternalServerErrorException(err);
      }

      if (!req.user) {
        this.logger.debug('No user returned from Passport middleware');
        throw new UnauthorizedException();
      }

      // Save the user to the database
      const user = await this.service.createOrUpdateUserFromProvider({
        ...(req.user as StrategyUserDataResponse),
        providerId,
      } as ProviderUserData);

      // Generate the JWT
      const token = await this.service.generateJWT(user.id);

      if (callbackUrl) {
        this.logger.debug('Redirecting to callback URL', { callbackUrl });
        const redirectURL = new URL(callbackUrl);
        redirectURL.searchParams.set('token', token);

        res.redirect(redirectURL.toString(), 302);
        return;
      }

      this.logger.debug('Displaying login object');
      res.send(
        instanceToPlain({
          user,
          token,
        }),
      );
    } catch (err: unknown) {
      this.logger.error('Error in login callback', { err });

      const defaultError = new InternalServerErrorException();
      let statusCode = 500;
      let message = defaultError.message;
      let error = defaultError.message;

      if (err instanceof HttpException) {
        statusCode = err.getStatus();
        message = err.message;
        error = err.message;
      } else if (err instanceof Error) {
        message = err.message;
        error = err.message;
      }
      res.status(statusCode).send({ message, error, statusCode });
    }
  }
}
