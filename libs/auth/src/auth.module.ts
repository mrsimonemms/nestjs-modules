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
  DynamicModule,
  InjectionToken,
  Module,
  OptionalFactoryDependency,
  Provider,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  ACCOUNT_ENTITY,
  AUTH_OPTIONS,
  AUTH_PATH,
  JWT_SECRET,
  PASSPORT_STRATEGIES,
  USER_ENTITY,
} from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthModuleOptions } from './auth.interfaces';
import {
  ASYNC_OPTIONS_TYPE,
  ConfigurableModuleClass,
  OPTIONS_TYPE,
} from './auth.module-definition';
import { AuthService } from './auth.service';
import { JWTStrategy } from './auth.strategies';

@Module({})
export class AuthModule extends ConfigurableModuleClass {
  static register(opts: typeof OPTIONS_TYPE): DynamicModule {
    AuthModule.setControllerPath(opts.path);

    if (Object.keys(opts.passportStrategies ?? []).length === 0) {
      throw new Error(
        'Invalid configuration - at least one passport strategy required',
      );
    }

    if (!opts.entities?.user) {
      throw new Error('Invalid configuration - no User entity registered');
    }

    if (!opts.entities?.account) {
      throw new Error('Invalid configuration - no Account entity registered');
    }

    return {
      ...super.register(opts),
      imports: [
        TypeOrmModule.forFeature([opts.entities.user, opts.entities.account]),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: JWT_SECRET,
          useValue: opts.jwtSecret,
        },
        {
          provide: AUTH_PATH,
          useFactory: () => {
            return AuthModule.setControllerPath(opts.path);
          },
        },
        AuthService,
      ],
      exports: [],
    };
  }

  static registerAsync(opts: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
    if (Object.keys(opts.passportStrategies ?? []).length === 0) {
      throw new Error(
        'Invalid configuration - at least one passport strategy required',
      );
    }

    if (!opts.entities?.user) {
      throw new Error('Invalid configuration - no User entity registered');
    }

    if (!opts.entities?.account) {
      throw new Error('Invalid configuration - no Account entity registered');
    }

    return {
      ...super.registerAsync(opts),
      imports: [
        TypeOrmModule.forFeature([opts.entities.user, opts.entities.account]),
      ],
      controllers: [AuthController],
      providers: [...AuthModule.createAsyncProviders(opts), AuthService],
      exports: [],
    };
  }

  private static createAsyncProviders(
    opts: typeof ASYNC_OPTIONS_TYPE,
  ): Provider[] {
    if (!opts.useFactory) {
      throw new Error('Invalid configuration. Must provide useFactory');
    }

    const strategies: Array<InjectionToken | OptionalFactoryDependency> =
      (opts.passportStrategies as Array<
        InjectionToken | OptionalFactoryDependency
      >) ?? [];

    return [
      ...(opts.providers ?? []),
      {
        provide: AUTH_OPTIONS,
        inject: opts.inject,
        useFactory: opts.useFactory,
      },
      {
        provide: AUTH_PATH,
        inject: [AUTH_OPTIONS],
        useFactory: (opts: AuthModuleOptions) => {
          return AuthModule.setControllerPath(opts.path);
        },
      },
      {
        provide: JWT_SECRET,
        inject: [AUTH_OPTIONS],
        useFactory: (opts: AuthModuleOptions): string => opts.jwtSecret,
      },
      // Load the strategies into the IOC
      ...(opts.passportStrategies ?? []),
      // Now get the strategies by name
      {
        provide: PASSPORT_STRATEGIES,
        inject: strategies,
        useFactory: (
          ...args: (typeof PassportStrategy)[]
        ): Record<string, typeof PassportStrategy> => {
          return args.reduce(
            (result, inst) => {
              result[inst.name] = inst;

              return result;
            },
            {} as Record<string, typeof PassportStrategy>,
          );
        },
      },
      {
        provide: ACCOUNT_ENTITY,
        useValue: opts.entities?.account,
      },
      {
        provide: USER_ENTITY,
        useValue: opts.entities?.user,
      },
      JWTStrategy,
    ];
  }

  private static setControllerPath(path: string = 'auth') {
    Reflect.defineMetadata('path', path, AuthController);
    return path;
  }
}
