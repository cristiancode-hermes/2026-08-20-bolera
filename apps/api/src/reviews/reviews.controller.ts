import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './reviews.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('lanes/:id/reviews')
  list(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
  ) {
    return this.reviews.listForLane(id, page ? Number(page) : 1);
  }

  @Post('lanes/:id/reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.reviews.create(user.userId, id, dto);
  }
}
