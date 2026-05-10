import { z } from "zod";

export const createEvolutionSchema = z.object({
  content: z
    .string()
    .min(1, "O conteúdo da evolução é obrigatório")
    .max(5000, "O conteúdo deve ter no máximo 5000 caracteres"),
  is_public: z.boolean().default(true),
});

export type CreateEvolutionInput = z.infer<typeof createEvolutionSchema>;
