import { Injectable } from '@nestjs/common';
import { workspaceHealthSchema } from '@supermarket-price-compare/shared';

@Injectable()
export class HealthService {
  getHealth(): {
    status: string;
    timestamp: string;
    shared: ReturnType<typeof workspaceHealthSchema.parse>;
  } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      shared: workspaceHealthSchema.parse({ ok: true }),
    };
  }
}
