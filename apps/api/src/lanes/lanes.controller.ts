import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LanesService } from './lanes.service';
import { CreateLaneDto, UpdateLaneDto } from './lanes.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StaffGuard } from '../auth/current-user';

@ApiTags('lanes')
@Controller('lanes')
export class LanesController {
  constructor(private readonly lanes: LanesService) {}

  @Get()
  findAll(
    @Query('availableToday') availableToday?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
  ) {
    return this.lanes.findAll({
      availableToday,
      q,
      page: page ? Number(page) : 1,
    });
  }

  @Get('featured')
  featured() {
    return this.lanes.featured();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.lanes.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  create(@Body() dto: CreateLaneDto) {
    return this.lanes.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLaneDto) {
    return this.lanes.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, StaffGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.lanes.softDelete(id);
  }
}
