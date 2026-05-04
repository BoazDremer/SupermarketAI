import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateIngestionRunDto } from './dto/create-ingestion-run.dto';

export type IngestionRunResponse = {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  completedAt?: string;
  retailerKey?: string;
  notes?: string;
};

@Injectable()
export class IngestionService {
  private readonly runs: IngestionRunResponse[] = [];

  constructor(private readonly prisma: PrismaService) {
    void this.prisma;
    this.runs.push({
      id: 'ing_run_seed',
      status: 'COMPLETED',
      startedAt: new Date(Date.now() - 86_400_000).toISOString(),
      completedAt: new Date(Date.now() - 86_400_000 + 60_000).toISOString(),
      retailerKey: 'sample',
      notes: 'Stub seed run',
    });
  }

  startRun(dto: CreateIngestionRunDto): IngestionRunResponse {
    const id = `ing_run_${randomUUID()}`;
    const run: IngestionRunResponse = {
      id,
      status: 'COMPLETED',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      retailerKey: dto.retailerKey,
      notes: dto.notes,
    };
    this.runs.unshift(run);
    return run;
  }

  listRuns(): IngestionRunResponse[] {
    return [...this.runs];
  }

  findRun(id: string): IngestionRunResponse {
    const run = this.runs.find((r) => r.id === id);
    if (!run) {
      throw new NotFoundException(`Ingestion run not found: ${id}`);
    }
    return run;
  }
}
