import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { apiCall } from '../utils/api-helper';
import { extractProductId } from '../utils/validation-helpers';

// Step 1: Validate Product Data
const validateProductData = createStep({
  id: 'validate-product-data',
  description: 'Validate product data including type, category, price, and optional flags',
  inputSchema: z.object({
    name: z.string(),
    type: z.enum(['goods', 'assets', 'service']),
    list_price: z.number(),
    category: z.enum(['1', '2', '3', '4', '5', '6']),
    default_uom: z.number().default(1).optional(),
    is_medicament: z.boolean().optional(),
    is_medical_supply: z.boolean().optional(),
    is_vaccine: z.boolean().optional(),
    is_bed: z.boolean().optional(),
    is_insurance_plan: z.boolean().optional(),
    is_prothesis: z.boolean().optional(),
    variant_code: z.string().optional(),
  }),
  outputSchema: z.object({
    name: z.string(),
    type: z.enum(['goods', 'assets', 'service']),
    list_price: z.number(),
    category: z.enum(['1', '2', '3', '4', '5', '6']),
    default_uom: z.number(),
    is_medicament: z.boolean().optional(),
    is_medical_supply: z.boolean().optional(),
    is_vaccine: z.boolean().optional(),
    is_bed: z.boolean().optional(),
    is_insurance_plan: z.boolean().optional(),
    is_prothesis: z.boolean().optional(),
    variant_code: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    // Validate name is not empty
    if (!inputData.name || inputData.name.trim().length === 0) {
      throw new Error('Product name cannot be empty');
    }

    // Validate type
    if (!['goods', 'assets', 'service'].includes(inputData.type)) {
      throw new Error('Product type must be "goods", "assets", or "service"');
    }

    // Validate category
    if (!['1', '2', '3', '4', '5', '6'].includes(inputData.category)) {
      throw new Error('Category must be between 1 and 6');
    }

    // Validate price
    if (inputData.list_price <= 0) {
      throw new Error('Product price must be greater than 0');
    }

    // Ensure default_uom is 1
    const default_uom = inputData.default_uom || 1;
    if (default_uom !== 1) {
      // Force to 1 as per API requirement
    }

    return {
      ...inputData,
      default_uom: 1,
    };
  },
});

// Step 2: Create Product
const createProduct = createStep({
  id: 'create-product',
  description: 'Create product via API',
  inputSchema: z.object({
    name: z.string(),
    type: z.enum(['goods', 'assets', 'service']),
    list_price: z.number(),
    category: z.enum(['1', '2', '3', '4', '5', '6']),
    default_uom: z.number(),
    is_medicament: z.boolean().optional(),
    is_medical_supply: z.boolean().optional(),
    is_vaccine: z.boolean().optional(),
    is_bed: z.boolean().optional(),
    is_insurance_plan: z.boolean().optional(),
    is_prothesis: z.boolean().optional(),
    variant_code: z.string().optional(),
  }),
  outputSchema: z.object({
    response: z.any(),
    productId: z.number().optional(),
    status: z.number(),
    warnings: z.array(z.string()).optional(),
    variant_code: z.string().optional(),
    flags: z.any().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    // Prepare body without variant_code
    const body: Record<string, any> = {
      name: inputData.name,
      type: inputData.type,
      default_uom: inputData.default_uom,
      list_price: inputData.list_price,
      category: String(inputData.category),
    };

    // Only include optional boolean flags if they are true
    if (inputData.is_medicament) body.is_medicament = inputData.is_medicament;
    if (inputData.is_medical_supply) body.is_medical_supply = inputData.is_medical_supply;
    if (inputData.is_vaccine) body.is_vaccine = inputData.is_vaccine;
    if (inputData.is_bed) body.is_bed = inputData.is_bed;
    if (inputData.is_insurance_plan) body.is_insurance_plan = inputData.is_insurance_plan;
    if (inputData.is_prothesis) body.is_prothesis = inputData.is_prothesis;

    try {
      const response = await apiCall<{
        message?: string;
        data?: any;
        status?: number;
      }>('/product', 'POST', body);

      const status = response.status || 200;
      const productId = extractProductId(response);
      const warnings: string[] = [];

      // Handle status 207 (partial success)
      if (status === 207) {
        if (response.message?.includes('template-category')) {
          warnings.push('Producto creado exitosamente pero ocurrió un problema al crear la relación template-category');
        } else if (response.message?.includes('precio')) {
          warnings.push('Producto creado exitosamente pero ocurrió un problema al agregar el precio en su tabla relacional');
        } else {
          warnings.push(response.message || 'Producto creado con advertencias');
        }
      }

      return {
        response,
        productId,
        status,
        warnings: warnings.length > 0 ? warnings : undefined,
        variant_code: inputData.variant_code,
        flags: {
          is_medicament: inputData.is_medicament,
          is_medical_supply: inputData.is_medical_supply,
          is_vaccine: inputData.is_vaccine,
          is_bed: inputData.is_bed,
          is_insurance_plan: inputData.is_insurance_plan,
          is_prothesis: inputData.is_prothesis,
        },
      };
    } catch (error: any) {
      // Handle specific errors
      if (error.message && error.message.includes('400')) {
        throw new Error(`Bad Request: ${error.message}`);
      }
      if (error.message && error.message.includes('500')) {
        throw new Error('Internal Server Error: Error al crear el producto');
      }
      throw error;
    }
  },
});

// Step 3: Create Variant (Conditional)
const createVariant = createStep({
  id: 'create-variant',
  description: 'Create product variant if variant_code was provided',
  inputSchema: z.object({
    response: z.any(),
    productId: z.number().optional(),
    status: z.number(),
    warnings: z.array(z.string()).optional(),
    variant_code: z.string().optional(),
    flags: z.any().optional(),
  }),
  outputSchema: z.object({
    variantCreated: z.boolean(),
    variantResponse: z.any().optional(),
    variantError: z.string().optional(),
    productId: z.number().optional(),
    status: z.number(),
    warnings: z.array(z.string()).optional(),
    flags: z.any().optional(),
    variant_code: z.string().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    // If no variant_code provided, skip variant creation
    if (!inputData.variant_code || inputData.variant_code.trim().length === 0) {
      return {
        variantCreated: false,
        productId: inputData.productId,
        status: inputData.status,
        warnings: inputData.warnings,
        flags: inputData.flags,
        variant_code: inputData.variant_code,
      };
    }

    // If no productId, cannot create variant
    if (!inputData.productId) {
      return {
        variantCreated: false,
        variantError: 'Cannot create variant: product ID not available',
        productId: inputData.productId,
        status: inputData.status,
        warnings: inputData.warnings,
        flags: inputData.flags,
        variant_code: inputData.variant_code,
      };
    }

    try {
      const body: Record<string, any> = {
        id: inputData.productId,
        code: inputData.variant_code,
      };

      // Include flags if they were set in the original product
      if (inputData.flags) {
        if (inputData.flags.is_medicament) body.is_medicament = true;
        if (inputData.flags.is_medical_supply) body.is_medical_supply = true;
        if (inputData.flags.is_vaccine) body.is_vaccine = true;
        if (inputData.flags.is_bed) body.is_bed = true;
        if (inputData.flags.is_insurance_plan) body.is_insurance_plan = true;
        if (inputData.flags.is_prothesis) body.is_prothesis = true;
      }

      const variantResponse = await apiCall<{
        message?: string;
        data?: any;
        status?: number;
      }>('/product/variant', 'POST', body);

      return {
        variantCreated: true,
        variantResponse,
        productId: inputData.productId,
        status: inputData.status,
        warnings: inputData.warnings,
        flags: inputData.flags,
        variant_code: inputData.variant_code,
      };
    } catch (error: any) {
      // Don't fail workflow if variant creation fails, just add warning
      const warnings = inputData.warnings || [];
      warnings.push(`Error al crear la variante: ${error.message || 'Error desconocido'}`);

      return {
        variantCreated: false,
        variantError: error.message || 'Error desconocido al crear variante',
        productId: inputData.productId,
        status: inputData.status,
        warnings,
        flags: inputData.flags,
        variant_code: inputData.variant_code,
      };
    }
  },
});

// Step 4: Consolidate Results
const consolidateResults = createStep({
  id: 'consolidate-results',
  description: 'Consolidate product and variant creation results',
  inputSchema: z.object({
    variantCreated: z.boolean(),
    variantResponse: z.any().optional(),
    variantError: z.string().optional(),
    productId: z.number().optional(),
    status: z.number(),
    warnings: z.array(z.string()).optional(),
    flags: z.any().optional(),
    variant_code: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    productId: z.number(),
    variantId: z.number().optional(),
    message: z.string(),
    warnings: z.array(z.string()).optional(),
    productData: z.any().optional(),
    variantData: z.any().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    // Check if product was created successfully
    if (!inputData.productId || inputData.status !== 200) {
      throw new Error('Product creation failed');
    }

    // Extract variant ID if variant was created
    let variantId: number | undefined;
    if (inputData.variantCreated && inputData.variantResponse) {
      variantId = extractProductId(inputData.variantResponse);
    }

    // Build message
    let message = 'Producto creado exitosamente';
    if (inputData.variantCreated && variantId) {
      message += ' con variante';
    } else if (inputData.variant_code && !inputData.variantCreated) {
      message += ' (variante no pudo ser creada)';
    }

    // Consolidate warnings
    const warnings = inputData.warnings || [];
    if (inputData.variantError && !inputData.variantCreated) {
      warnings.push(`Variante: ${inputData.variantError}`);
    }

    return {
      success: true,
      productId: inputData.productId,
      variantId,
      message,
      warnings: warnings.length > 0 ? warnings : undefined,
      productData: {
        productId: inputData.productId,
        status: inputData.status,
      },
      variantData: inputData.variantCreated ? inputData.variantResponse : undefined,
    };
  },
});

// Product with Variant Workflow
export const productWithVariantWorkflow = createWorkflow({
  id: 'product-with-variant-workflow',
  inputSchema: z.object({
    name: z.string().describe('Name of the product'),
    type: z.enum(['goods', 'assets', 'service']).describe('Type of product'),
    list_price: z.number().positive().describe('Price of the product'),
    category: z.enum(['1', '2', '3', '4', '5', '6']).describe('Category ID: 1=Seguros, 2=Servicios de imágenes, 3=Servicios de laboratorio, 4=Medicamentos, 5=Medicamentos esenciales OMS, 6=Evaluación Médica'),
    default_uom: z.number().default(1).optional().describe('Unit of measure (always 1)'),
    is_medicament: z.boolean().optional().describe('Indicates if product is a medicament'),
    is_medical_supply: z.boolean().optional().describe('Indicates if product is a medical supply'),
    is_vaccine: z.boolean().optional().describe('Indicates if product is a vaccine'),
    is_bed: z.boolean().optional().describe('Indicates if product is a bed'),
    is_insurance_plan: z.boolean().optional().describe('Indicates if product is an insurance plan'),
    is_prothesis: z.boolean().optional().describe('Indicates if product is a prosthesis'),
    variant_code: z.string().optional().describe('Optional variant code to create a variant'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    productId: z.number(),
    variantId: z.number().optional(),
    message: z.string(),
    warnings: z.array(z.string()).optional(),
    productData: z.any().optional(),
    variantData: z.any().optional(),
  }),
})
  .then(validateProductData)
  .then(createProduct)
  .then(createVariant)
  .then(consolidateResults)
  .commit();

