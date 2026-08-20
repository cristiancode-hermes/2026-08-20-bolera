import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  username: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(80)
  password: string;
}

export class LoginDto {
  @ApiProperty({ description: 'Username or email', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  identifier?: string;

  /** Alias accepted by clients (ROUTES.md) */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  login?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password: string;
}
