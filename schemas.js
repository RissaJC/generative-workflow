import { z } from 'zod';

export const GetSystemUsersInputSchema = z.object({
  // Query Parameters
  limit: z.number().int().min(0).default(10).optional(),
  skip: z.number().int().min(0).default(0).optional(),
  sort: z.string().default('').optional(), // As per OpenAPI, it's a string
  fields: z.string().default('').optional(), // As per OpenAPI, it's a string
  filter: z.array(z.string()).default([]).optional(), // As per trait filter
  search: z.string().default('').optional(), // As per trait search
});

export const CreateOrgScema = z.object({
    name: z.string()
})
