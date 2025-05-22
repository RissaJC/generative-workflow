import { z } from 'zod';

export const GetPaginatedListSchema = z.object({
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

export const GetAdminOrganizations = z.object({
  id: z.string().describe('administrator id')
})

export const GiveAdminAccessToOrgSchema = z.object({
  adminId: z.string().describe('administrator id'),
  organizationId: z.string().describe('id of the organization that the admin will have access to')
})
export const AdministratorSchema = z.object({
  // Importantly, 'id' or '_id' should be part of this schema
  _id: z.string().optional().optional().describe("The internal database ID for the administrator. Often omitted on input(same as id)."), // Optional if backend handles generation or for update
  id: z.string().describe("The unique identifier for the administrator."), // This is the ID you'll use in the URL
  email: z.string().email().optional().describe("The administrator's email address."),
  firstname: z.string().optional().describe("The administrator's first name."),
  lastname: z.string().optional().describe("The administrator's last name."),
  suspended: z.boolean().optional().describe("Whether the administrator account is suspended."),
  enableMultiFactor: z.boolean().optional().describe("Whether multi-factor authentication is enabled for the administrator."),
  role: z.string().optional().describe("The ID of the administrator's role."),
  roleName: z.string().optional().describe("The name of the administrator's role (read-only)."), // Often read-only
  apiKeyAllowed: z.boolean().optional().describe("Whether API key access is allowed for the administrator."),
  apiKeySet: z.boolean().optional().describe("Whether an API key has been set for the administrator."),
  registered: z.boolean().optional().describe("Whether the administrator has completed registration."),
  // administratorOrganizations: z.array(z.string()).optional().describe("List of organization IDs the administrator belongs to."),
});

