import { z } from 'zod';

export * from './domain/index.js';

/**
 * Lightweight workspace health check for wiring tests between apps and packages.
 */
export const workspaceHealthSchema = z.object({
  ok: z.literal(true),
});

export type WorkspaceHealth = z.infer<typeof workspaceHealthSchema>;
