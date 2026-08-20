import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class HoldBookingDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  partySize: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  shoeSizes?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  addonIds?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  bringOwnShoes?: boolean;
}

export class ConfirmBookingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
