import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { apiCall } from '../utils/api-helper';

// Create Test Type Tool
export const createTestTypeTool = createTool({
  id: 'create-test-type',
  description: 'Create a new laboratory test type in the system. Required: name (descriptive name), code (unique code), product_id (ID of associated product).',
  inputSchema: z.object({
    name: z.string().describe('Descriptive name of the test type, e.g., "Glucosa en ayunas"'),
    code: z.string().describe('Unique code for the test type, e.g., "GLU-AYU"'),
    product_id: z.number().describe('ID of the product associated with this test in the system'),
  }),
  outputSchema: z.object({
    message: z.string().optional(),
    data: z.object({
      name: z.string().optional(),
      code: z.string().optional(),
      product_id: z.string().optional(),
    }).optional(),
    status: z.number().optional(),
  }),
  execute: async ({ context }) => {
    return await apiCall('/test-type', 'POST', {
      name: context.name,
      code: context.code,
      product_id: context.product_id,
    });
  },
});







