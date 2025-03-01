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
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Type,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Handler } from 'express';
import * as passport from 'passport';
import { DataSource, Not } from 'typeorm';

import {
  ACCOUNT_ENTITY,
  CannotDeleteLastUserException,
  PASSPORT_STRATEGIES,
  USER_ENTITY,
} from './auth.constants';
import { AccountEntity, ProviderUserData, UserEntity } from './auth.interfaces';
import { UpdateUserDTO } from './dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(this.constructor.name);

  @Inject(DataSource)
  private readonly dataSource: DataSource;

  @Inject(ACCOUNT_ENTITY)
  private readonly accountEntity: Type<AccountEntity>;

  @Inject(USER_ENTITY)
  private readonly userEntity: Type<UserEntity>;

  @Inject(PASSPORT_STRATEGIES)
  private readonly strategies: Record<string, typeof PassportStrategy>;

  @Inject(JwtService)
  private readonly jwtService: JwtService;

  async createOrUpdateUserFromProvider(
    providerUser: ProviderUserData,
  ): Promise<UserEntity> {
    let user = await this.findUserByProviderAndUserId(
      providerUser.providerId,
      providerUser.providerUserId,
    );

    if (!user) {
      this.logger.log('User not in database - creating');
      user = new this.userEntity();
      user.name = providerUser.name ?? '';
      user.emailAddress = providerUser.emailAddress ?? '';
    }

    this.logger.log('Updating account for user', {
      userId: user.id ?? 'new user',
    });

    // Ensure the accounts is an array
    if (!user.accounts) {
      user.accounts = [];
    }

    // Search for an existing version of this provider record in the user's accounts
    const accountId = user.accounts.findIndex(
      (account) =>
        account.providerId === providerUser.providerId &&
        account.providerUserId === providerUser.providerUserId,
    );

    let account: AccountEntity;
    if (accountId != -1) {
      this.logger.debug('Updating account record', { accountId });
      account = user.accounts[accountId];
      user.accounts.splice(accountId, 1);
    } else {
      this.logger.debug('Adding new account record');
      account = new this.accountEntity();
      account.providerId = providerUser.providerId;
      account.providerUserId = providerUser.providerUserId;
    }

    // Update the account data
    if (!account.tokens) {
      account.tokens = {};
    }

    account.tokens = providerUser.tokens;
    account.emailAddress = providerUser.emailAddress;
    account.name = providerUser.name;
    account.username = providerUser.username;
    account.updatedDate = new Date();

    // Store the data
    user.accounts.push(account);

    this.logger.log('Saving user record', {
      userId: user.id ?? 'new user',
    });

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    const savedUser = await queryRunner.manager.save(user);
    await queryRunner.release();

    return savedUser;
  }

  async deleteUserById(userId: UserEntity['id']) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    const [, count] = await queryRunner.manager.findAndCountBy(
      this.userEntity,
      {
        id: Not(userId),
      },
    );

    if (count > 0) {
      this.logger.log('Deleting user', { userId });
      await queryRunner.manager.delete(this.userEntity, { id: userId });
    }

    await queryRunner.release();

    if (count === 0) {
      throw new CannotDeleteLastUserException();
    }
  }

  async findUserByProviderAndUserId(
    providerId: string,
    providerUserId: string,
  ): Promise<UserEntity | null> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    const user = await queryRunner.manager.findOne(this.userEntity, {
      where: {
        accounts: {
          providerId,
          providerUserId,
        },
      },
    });
    await queryRunner.release();

    return user;
  }

  generateJWT(userId: UserEntity['id']): Promise<string> {
    return this.jwtService.signAsync(
      { userId },
      {
        notBefore: 0,
        subject: userId.toString(),
      },
    );
  }

  async getById(id: UserEntity['id']): Promise<UserEntity | null> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    const user = await queryRunner.manager.findOne(this.userEntity, {
      where: { id },
    });
    await queryRunner.release();

    return user;
  }

  getProvider(providerId: string): passport.Strategy {
    const provider = this.strategies[providerId];

    if (!provider) {
      throw new NotFoundException('Provider not registered');
    }

    return provider as unknown as passport.Strategy;
  }

  getProviderHandler(providerId: string): Handler {
    this.getProvider(providerId);

    return passport.authenticate(providerId, {
      session: false,
    }) as Handler;
  }

  listProviders(): string[] {
    return Object.keys(this.strategies);
  }

  async updateUserProfile(
    userId: UserEntity['id'],
    data: UpdateUserDTO,
  ): Promise<UserEntity> {
    const user = await this.getById(userId);

    if (!user) {
      throw new NotFoundException();
    }

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    const savedUser = await queryRunner.manager.save(this.userEntity, {
      ...user,
      name: data.name,
      emailAddress: data.emailAddress,
    });
    await queryRunner.release();

    return savedUser;
  }
}
