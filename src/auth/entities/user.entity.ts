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
import { UpdateUserDTO, UserEntity } from '@mrsimonemms/auth';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Account } from './account.entity';

@Entity()
export class User extends UpdateUserDTO implements UserEntity {
  @ApiProperty({
    description: 'Unique user id',
    type: 'string',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Exclude()
  @OneToMany(() => Account, (account) => account.user, {
    cascade: true,
    eager: true,
  })
  accounts: Account[];

  @ApiProperty({
    description: 'Is the user active',
    type: 'boolean',
  })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Creation date',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn()
  createdDate: Date;

  @ApiProperty({
    description: 'Update date',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn()
  updatedDate: Date;
}
