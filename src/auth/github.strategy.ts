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
import { AUTH_PATH, StrategyUserDataResponse } from '@mrsimonemms/auth';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-github2';

const strategyName = 'github-strategy-name';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, strategyName) {
  // Need to specify the name property to set the strategy name
  name = strategyName;

  constructor(
    @Inject(ConfigService) config: ConfigService,
    @Inject('GITHUB_VALUE') githubValue: string,
    @Inject(AUTH_PATH) path: string,
  ) {
    super({
      clientID: config.getOrThrow('auth.strategies.github.clientID'),
      clientSecret: config.getOrThrow('auth.strategies.github.clientSecret'),
      callbackURL: `${config.getOrThrow('auth.callbackDomain')}/${path}/login/${strategyName}/callback`,
      scope: ['read:user', 'user:email', 'repo'],
    });

    // This is a provider that's registered with the AuthModule - could be useful
    // if need to inject async values in here
    console.log({
      githubValue,
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): StrategyUserDataResponse {
    return {
      tokens: {
        accessToken,
        refreshToken,
      },
      emailAddress: profile?.emails?.[0]?.value,
      providerUserId: profile?.id,
      name: profile?.displayName,
      username: profile?.username,
    };
  }
}
