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
import { HttpException, HttpStatus } from '@nestjs/common';

export const ACCOUNT_ENTITY = Symbol('ACCOUNT_ENTITY');
export const AUTH_OPTIONS = Symbol('AUTH_OPTIONS');
export const AUTH_PATH = Symbol('AUTH_PATH');
export const AUTH_STRATEGIES = Symbol('AUTH_STRATEGIES');
export const JWT_SECRET = Symbol('JWT_SECRET');
export const PASSPORT_STRATEGIES = Symbol('PASSPORT_STRATEGIES');
export const USER_ENTITY = Symbol('USER_ENTITY');

export class CannotDeleteLastUserException extends HttpException {
  constructor() {
    super('Last User Error', HttpStatus.FORBIDDEN);
  }
}
