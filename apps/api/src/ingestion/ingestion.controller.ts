import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateIngestionRunDto } from './dto/create-ingestion-run.dto';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('run')
  startRun(@Body() dto: CreateIngestionRunDto) {
    return this.ingestionService.startRun(dto);
  }

  @Get('runs')
  listRuns() {
    return this.ingestionService.listRuns();
  }

  @Get('runs/:id')
  getRun(@Param('id') id: string) {
    return this.ingestionService.findRun(id);
  }
}
