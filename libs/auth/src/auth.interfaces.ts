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
import { Provider, Type } from '@nestjs/common';

export type AuthSession = { authCallbackURL: string };

export type Options = {
  entities: {
    account: Type<AccountEntity>;
    user: Type<UserEntity>;
  };
  passportStrategies: Provider[];
};

export interface AuthModuleOptions {
  jwtSecret: string;
  passportStrategies?: Options['passportStrategies'];
  path?: string;
}

export interface RouteListProviders {
  providers: string[];
}

// Interface for the database record
export interface AccountEntity extends ProviderUserData {
  id: string | number;
  user: UserEntity;
  createdDate: Date;
  updatedDate: Date;
}

// Description of the provider's data
export interface ProviderUserData {
  tokens: {
    [key: string]: unknown;
  };
  providerId: string;
  providerUserId: string;
  emailAddress?: string;
  name?: string;
  username?: string;
}

// Interface for the database record
export interface UserEntity {
  id: string | number;
  emailAddress: string;
  name: string;
  accounts: AccountEntity[];
  isActive: boolean;
  createdDate: Date;
  updatedDate: Date;
}

// Response from the PassportJS Strategy in the validate
export type StrategyUserDataResponse = Omit<ProviderUserData, 'providerId'>;

export type RequestType = { user: UserEntity };
