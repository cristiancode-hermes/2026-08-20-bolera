import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateSlotsDto {
  @ApiProperty({ example: '2026-08-20' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @ApiPropertyOptional({ type: [String], example: ['16:00', '17:00'] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  times?: string[];
}

export class BlockSlotDto {
  @ApiProperty()
  @IsBoolean()
  blocked: boolean;
}
