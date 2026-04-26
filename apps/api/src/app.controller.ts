import { Controller, Get } from '@nestjs/common';
import { workspaceHealthSchema } from '@supermarket-price-compare/shared';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health(): { status: string; shared: ReturnType<typeof workspaceHealthSchema.parse> } {
    return {
      status: this.appService.getHealth(),
      shared: workspaceHealthSchema.parse({ ok: true }),
    };
  }
}
