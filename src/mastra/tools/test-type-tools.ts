import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { apiCall } from '../utils/api-helper';

// Create Test Type Tool
export const createTestTypeTool = createTool({
  id: 'create-test-type',
  description: `Crear un nuevo tipo de prueba de laboratorio en el sistema.

<tool>
Esta herramienta crea un tipo de prueba de laboratorio asociado a un producto existente.
No requiere aprobación humana.
</tool>

<requirements>
Campos requeridos:
- name: Nombre descriptivo del tipo de prueba
- code: Código único para el tipo de prueba
- product_id: ID numérico del producto asociado (debe existir en el sistema)
</requirements>

<example>
<example_input>
name: "Glucosa en ayunas"
code: "GLU-AYU"
product_id: 384
</example_input>
<example_output>
Tipo de prueba "Glucosa en ayunas" (GLU-AYU) creado exitosamente
</example_output>
</example>

<example>
<example_input>
name: "Colesterol Total"
code: "COL-TOTAL"
product_id: 382
</example_input>
<example_output>
Tipo de prueba "Colesterol Total" (COL-TOTAL) creado exitosamente
</example_output>
</example>`,
  inputSchema: z.object({
    name: z.string().describe('Nombre descriptivo del tipo de prueba, ejemplo: "Glucosa en ayunas"'),
    code: z.string().describe('Código único para el tipo de prueba, ejemplo: "GLU-AYU"'),
    product_id: z.number().describe('ID numérico del producto asociado a esta prueba en el sistema'),
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







