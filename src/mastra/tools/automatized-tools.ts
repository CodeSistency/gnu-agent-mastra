import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { apiCall } from '../utils/api-helper';

// Get Table Data Tool
export const getTableDataTool = createTool({
  id: 'get-table-data',
  description: `Obtener datos de una tabla específica de la base de datos.

<tool>
Esta herramienta recupera información de una tabla del sistema GNU Health.
Herramienta de automatización para consultas de tablas.
Solo lectura, no requiere aprobación.
</tool>

<requirements>
- table: Nombre de la tabla de la cual obtener datos
</requirements>

<example>
<example_input>
table: "product_template"
</example_input>
<example_output>
Datos de la tabla product_template obtenidos exitosamente
</example_output>
</example>

<example>
<example_input>
table: "product_product"
</example_input>
<example_output>
Datos de la tabla product_product obtenidos exitosamente
</example_output>
</example>`,
  inputSchema: z.object({
    table: z.string().describe('Nombre de la tabla de la cual obtener datos'),
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







