import { z } from 'zod';

/**
 * Workspace placeholder for shared domain types, DTOs, and Zod schemas.
 * Replace with real schemas as the domain model is defined.
 */
export const workspaceHealthSchema = z.object({
  ok: z.literal(true),
});

export type WorkspaceHealth = z.infer<typeof workspaceHealthSchema>;
