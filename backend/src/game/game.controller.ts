import { Controller, Get, Post, Body } from '@nestjs/common';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('state')
  getGameState() {
    return this.gameService.getGameState();
  }

  @Post('battle')
  battle() {
    return this.gameService.battle();
  }

  @Post('upgrade')
  upgrade(
    @Body() body: { stat: 'health' | 'attack' | 'defense'; amount?: number },
  ) {
    return this.gameService.upgrade(body.stat, body.amount ?? 1);
  }

  @Post('reset')
  reset() {
    this.gameService.resetGame();
    return { message: '게임이 리셋되었습니다.' };
  }

  @Get('inventory')
  getInventory() {
    return this.gameService.getInventoryState();
  }

  @Post('equip')
  equip(@Body() body: { itemId: string }) {
    return this.gameService.equip(body.itemId);
  }
}

