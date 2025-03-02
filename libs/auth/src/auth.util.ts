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
import { Request as ExpressReq, Response as ExpressRes } from 'express';
import { FastifyReply, FastifyRequest } from 'fastify';

// Make the FastifyReply behave like the Express response. Do
// like this so the e2e tests still work
//
// @link https://github.com/nestjs/passport/issues/1655
export function fastifyToExpress(
  req: FastifyRequest,
  res: FastifyReply,
): { req: ExpressReq; res: ExpressRes } {
  const expressRes = res as unknown as ExpressRes;

  expressRes.setHeader = function (
    this: FastifyReply,
    name: string,
    value: number | string | readonly string[],
  ): ExpressRes {
    this.raw.setHeader(name, value);
    return this as unknown as ExpressRes;
  };

  expressRes.end = function (this: FastifyReply): ExpressRes {
    // Use send so the session cookie onSend hook is triggered
    this.send();
    return this as unknown as ExpressRes;
  };

  return {
    // Request has no changes requires
    req: req as unknown as ExpressReq,
    res: expressRes,
  };
}
