import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user';

@ApiTags('favorites')
@Controller('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favs: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: { userId: number }) {
    return this.favs.list(user.userId);
  }

  @Post(':laneId')
  add(
    @Param('laneId', ParseIntPipe) laneId: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.favs.add(user.userId, laneId);
  }

  @Delete(':laneId')
  remove(
    @Param('laneId', ParseIntPipe) laneId: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.favs.remove(user.userId, laneId);
  }
}
