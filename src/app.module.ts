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
import { AuthModule } from '@mrsimonemms/auth';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Account } from './auth/entities/account.entity';
import { User } from './auth/entities/user.entity';
import { GitHubStrategy } from './auth/github.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({
          auth: {
            callbackDomain: 'http://localhost:3000',
            strategies: {
              github: {
                clientID: process.env.AUTH_GITHUB_CLIENT_ID ?? '',
                clientSecret: process.env.AUTH_GITHUB_CLIENT_SECRET ?? '',
              },
            },
          },
          jwt: { secret: 'my-super-secret-jwt-secret' },
          server: {
            port: 3000,
            host: '0.0.0.0',
          },
          session: {
            salt: 'mq9hDxBVDbspDR6n',
            secret: 'averylogphrasebiggerthanthirtytwochars',
            cookie: {
              sameSite: 'lax',
            },
          },
        }),
      ],
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
      synchronize: true,
      autoLoadEntities: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        signOptions: {
          issuer: 'simonemms.com',
          expiresIn: '30 days',
        },
      }),
    }),
    AuthModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      entities: { account: Account, user: User },
      passportStrategies: [GitHubStrategy],
      useFactory: (cfg: ConfigService) => {
        return {
          jwtSecret: cfg.getOrThrow('jwt.secret'),
          path: 'customPath',
        };
      },
    }),
  ],
})
export class AppModule {}
