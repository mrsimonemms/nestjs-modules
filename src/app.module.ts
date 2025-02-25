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
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        () => ({
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
    AuthModule,
  ],
})
export class AppModule {}
