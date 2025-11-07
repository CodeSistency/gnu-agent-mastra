import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { apiCall } from '../utils/api-helper';

// Helper function to determine if product creation requires approval
// Products with price > 1000 require human approval
const requiresApproval = (context: { list_price?: number }): boolean => {
  return (context.list_price ?? 0) > 1000;
};

// Create Product Tool
export const createProductTool = createTool({
  id: 'create-product',
  description: `Crear un nuevo producto en el sistema médico.

<tool>
Esta herramienta crea un producto médico en GNU Health.
Requiere aprobación humana si el precio es mayor a 1000.
</tool>

<requirements>
Campos requeridos:
- name: Nombre del producto
- type: Tipo de producto ("goods", "assets" o "service")
- default_uom: Unidad de medida (siempre 1)
- list_price: Precio del producto
- category: ID de categoría (1-6)

Categorías disponibles:
  1: Seguros
  2: Servicios de imágenes
  3: Servicios de laboratorio
  4: Medicamentos
  5: Medicamentos esenciales OMS
  6: Evaluación Médica

Campos opcionales (flags booleanos):
- is_medicament: Indica si es medicamento
- is_medical_supply: Indica si es suministro médico
- is_vaccine: Indica si es vacuna
- is_bed: Indica si es cama
- is_insurance_plan: Indica si es plan de seguros
- is_prothesis: Indica si es prótesis
</requirements>

<example>
<example_input>
name: "Paracetamol 500mg"
type: "goods"
list_price: 5.50
category: "4"
is_medicament: true
</example_input>
<example_output>
Producto "Paracetamol 500mg" creado exitosamente con ID 789
</example_output>
</example>

<example>
<example_input>
name: "Equipo de Rayos X"
type: "assets"
list_price: 50000
category: "2"
</example_input>
<example_output>
⚠️ Requiere aprobación (precio > 1000)
Producto "Equipo de Rayos X" creado exitosamente con ID 456
</example_output>
</example>`,
  requireApproval: requiresApproval,
  inputSchema: z.object({
    name: z.string().describe('Nombre del producto'),
    type: z.enum(['goods', 'assets', 'service']).describe('Tipo de producto: "goods" (bienes), "assets" (activos) o "service" (servicios)'),
    default_uom: z.number().default(1).describe('Unidad de medida (siempre debe ser 1)'),
    list_price: z.number().describe('Precio del producto'),
    category: z.enum(['1', '2', '3', '4', '5', '6']).describe('ID de categoría: 1=Seguros, 2=Servicios de imágenes, 3=Servicios de laboratorio, 4=Medicamentos, 5=Medicamentos esenciales OMS, 6=Evaluación Médica'),
    is_medicament: z.boolean().optional().describe('Indica si el producto es un medicamento (por defecto: false)'),
    is_medical_supply: z.boolean().optional().describe('Indica si el producto es un suministro médico (por defecto: false)'),
    is_vaccine: z.boolean().optional().describe('Indica si el producto es una vacuna (por defecto: false)'),
    is_bed: z.boolean().optional().describe('Indica si el producto es una cama (por defecto: false)'),
    is_insurance_plan: z.boolean().optional().describe('Indica si el producto es un plan de seguros (por defecto: false)'),
    is_prothesis: z.boolean().optional().describe('Indica si el producto es una prótesis (por defecto: false)'),
  }),
  outputSchema: z.object({
    message: z.string().optional(),
    data: z.any().optional(),
    status: z.number().optional(),
  }),
  execute: async ({ context }) => {
    // Convert category to string if it's a number
    const body: Record<string, any> = {
      ...context,
      default_uom: context.default_uom || 1,
      category: String(context.category),
    };
    
    // Only include optional boolean flags if they are true
    if (context.is_medicament) body.is_medicament = context.is_medicament;
    if (context.is_medical_supply) body.is_medical_supply = context.is_medical_supply;
    if (context.is_vaccine) body.is_vaccine = context.is_vaccine;
    if (context.is_bed) body.is_bed = context.is_bed;
    if (context.is_insurance_plan) body.is_insurance_plan = context.is_insurance_plan;
    if (context.is_prothesis) body.is_prothesis = context.is_prothesis;
    
    return await apiCall('/product', 'POST', body);
  },
});

// Create Product Variant Tool
export const createProductVariantTool = createTool({
  id: 'create-product-variant',
  description: `Crear una variante para un producto existente.

<tool>
Esta herramienta crea una variante (versión específica) de un producto ya registrado.
No requiere aprobación humana.
</tool>

<requirements>
Campos requeridos:
- id: ID numérico del producto al que se le creará la variante
- code: Nombre o código de la variante

Campos opcionales (flags booleanos):
- is_medicament, is_medical_supply, is_vaccine, is_bed, is_insurance_plan, is_prothesis
</requirements>

<example>
<example_input>
id: 789
code: "Lote-2024-001"
is_vaccine: true
</example_input>
<example_output>
Variante "Lote-2024-001" creada exitosamente para el producto ID 789
</example_output>
</example>`,
  inputSchema: z.object({
    id: z.number().describe('ID numérico del producto al que se le creará la variante'),
    code: z.string().describe('Nombre o código de la variante'),
    is_medicament: z.boolean().optional().describe('Indica si la variante es un medicamento (por defecto: false)'),
    is_medical_supply: z.boolean().optional().describe('Indica si la variante es un suministro médico (por defecto: false)'),
    is_vaccine: z.boolean().optional().describe('Indica si la variante es una vacuna (por defecto: false)'),
    is_bed: z.boolean().optional().describe('Indica si la variante es una cama (por defecto: false)'),
    is_insurance_plan: z.boolean().optional().describe('Indica si la variante es un plan de seguros (por defecto: false)'),
    is_prothesis: z.boolean().optional().describe('Indica si la variante es una prótesis (por defecto: false)'),
  }),
  outputSchema: z.object({
    message: z.string().optional(),
    data: z.any().optional(),
    status: z.number().optional(),
  }),
  execute: async ({ context }) => {
    const body: Record<string, any> = {
      id: context.id,
      code: context.code,
    };
    
    // Only include optional boolean flags if they are true
    if (context.is_medicament) body.is_medicament = context.is_medicament;
    if (context.is_medical_supply) body.is_medical_supply = context.is_medical_supply;
    if (context.is_vaccine) body.is_vaccine = context.is_vaccine;
    if (context.is_bed) body.is_bed = context.is_bed;
    if (context.is_insurance_plan) body.is_insurance_plan = context.is_insurance_plan;
    if (context.is_prothesis) body.is_prothesis = context.is_prothesis;
    
    return await apiCall('/product/variant', 'POST', body);
  },
});

// Get Test Products Tool
export const getTestProductsTool = createTool({
  id: 'get-test-products',
  description: `Obtener lista de productos y plantillas actuales en la base de datos.

<tool>
Esta herramienta lista todos los productos y plantillas disponibles en el sistema.
Solo lectura, no requiere aprobación.
</tool>

<example>
<example_input>
(No requiere parámetros)
</example_input>
<example_output>
Lista de productos y plantillas disponibles en el sistema
</example_output>
</example>`,
  inputSchema: z.object({}),
  outputSchema: z.object({
    message: z.string().optional(),
    data: z.any().optional(),
    status: z.number().optional(),
  }),
  execute: async () => {
    return await apiCall('/test-products', 'GET');
  },
});

