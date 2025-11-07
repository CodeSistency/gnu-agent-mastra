import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { apiCall } from '../utils/api-helper';

// Get Table Data Tool
export const getTableDataTool = createTool({
  id: 'get-table-data',
  description: 'Get data from a specific table in the database. Automation tool for retrieving table information.',
  inputSchema: z.object({
    table: z.string().describe('Name of the table to retrieve data from'),
  }),
  outputSchema: z.object({
    message: z.string().optional(),
    data: z.any().optional(),
    status: z.number().optional(),
  }),
  execute: async ({ context }) => {
    // GET request with table name in body (form-data)
    return await apiCall('/automatized', 'GET', { table: context.table });
  },
});







