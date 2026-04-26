export type { WorkspaceHealth } from '@supermarket-price-compare/shared';

/**
 * Ingestion framework for Israeli supermarket price and promotion files.
 * Parsers, validators, and pipeline orchestration will live here.
 */
export type IngestionContext = {
  /** Absolute or workspace-relative path to a raw feed file under `data/raw`. */
  inputPath: string;
};

export interface IngestionStep {
  readonly name: string;
  run(ctx: IngestionContext): Promise<void>;
}

export function createIngestionPipeline(_steps: readonly IngestionStep[]): {
  run: (ctx: IngestionContext) => Promise<void>;
} {
  return {
    async run(_ctx: IngestionContext): Promise<void> {
      // Skeleton: wire steps in a later iteration.
    },
  };
}
