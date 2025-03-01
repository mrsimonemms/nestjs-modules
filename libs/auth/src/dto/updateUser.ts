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
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';
import { Column } from 'typeorm';

// This is for making changes to one's own user - isActive and other things
// are external to this DTO
export class UpdateUserDTO {
  @ApiProperty({
    description: 'User name',
    type: 'string',
    example: 'Simon Emms',
  })
  @Column({ length: 255 })
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'User email address',
    type: 'string',
    format: 'email',
    example: 'test@test.com',
  })
  @Column({ length: 255 })
  @IsEmail()
  @MaxLength(255)
  emailAddress: string;
}
