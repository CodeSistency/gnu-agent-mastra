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
  description: 'Create a new product in the medical system. Required: name, type (goods/assets/service), default_uom (1), list_price, category (ID: 1-6). Categories: Evaluación Médica(6), Medicamentos(4), Medicamentos esenciales OMS(5), Seguros(1), Servicios de imágenes(2), Servicios de laboratorio(3). Products with price > 1000 require human approval before creation.',
  requireApproval: requiresApproval,
  inputSchema: z.object({
    name: z.string().describe('Name of the product'),
    type: z.enum(['goods', 'assets', 'service']).describe('Type of product: goods, assets, or service'),
    default_uom: z.number().default(1).describe('Unit of measure (always 1)'),
    list_price: z.number().describe('Price of the product'),
    category: z.enum(['1', '2', '3', '4', '5', '6']).describe('Category ID: 1=Seguros, 2=Servicios de imágenes, 3=Servicios de laboratorio, 4=Medicamentos, 5=Medicamentos esenciales OMS, 6=Evaluación Médica'),
    is_medicament: z.boolean().optional().describe('Indicates if product is a medicament (default: false)'),
    is_medical_supply: z.boolean().optional().describe('Indicates if product is a medical supply (default: false)'),
    is_vaccine: z.boolean().optional().describe('Indicates if product is a vaccine (default: false)'),
    is_bed: z.boolean().optional().describe('Indicates if product is a bed (default: false)'),
    is_insurance_plan: z.boolean().optional().describe('Indicates if product is an insurance plan (default: false)'),
    is_prothesis: z.boolean().optional().describe('Indicates if product is a prosthesis (default: false)'),
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
  description: 'Create a variant for an existing product. Required: id (product ID), code (variant name).',
  inputSchema: z.object({
    id: z.number().describe('ID of the product to create variant for'),
    code: z.string().describe('Name/code of the variant'),
    is_medicament: z.boolean().optional().describe('Indicates if variant is a medicament (default: false)'),
    is_medical_supply: z.boolean().optional().describe('Indicates if variant is a medical supply (default: false)'),
    is_vaccine: z.boolean().optional().describe('Indicates if variant is a vaccine (default: false)'),
    is_bed: z.boolean().optional().describe('Indicates if variant is a bed (default: false)'),
    is_insurance_plan: z.boolean().optional().describe('Indicates if variant is an insurance plan (default: false)'),
    is_prothesis: z.boolean().optional().describe('Indicates if variant is a prosthesis (default: false)'),
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
  description: 'Get a list of current products and templates in the database. Read-only endpoint.',
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

