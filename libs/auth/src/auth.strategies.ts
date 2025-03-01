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
import { Inject, Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JWT_SECRET } from './auth.constants';
import { UserEntity } from './auth.interfaces';
import { AuthService } from './auth.service';

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    @Inject(AuthService) private readonly service: AuthService,
    @Inject(JWT_SECRET) secretOrKey: string,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      secretOrKey,
    });
  }

  async validate({ sub }: { sub: string }): Promise<UserEntity | null> {
    this.logger.debug('New user login - searching for user in DB');
    const user = await this.service.getById(sub);

    if (user?.isActive) {
      this.logger.debug('User valid and active');
      return user;
    }

    // Set as warn because someone has a valid key, but user invalid/inactive
    this.logger.warn('User not found or inactive', {
      userId: sub,
      active: user?.isActive,
    });
    return null;
  }
}
