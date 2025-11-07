import { z } from 'zod';
import { createToolCallAccuracyScorerCode } from '@mastra/evals/scorers/code';
import { createCompletenessScorer } from '@mastra/evals/scorers/code';
import { createScorer } from '@mastra/core/scores';

// Tool call appropriateness scorer
export const toolCallAppropriatenessScorer = createToolCallAccuracyScorerCode({
  expectedTool: 'createPatientTool', // Can be made dynamic based on context
  strictMode: false,
});

// Completeness scorer
export const completenessScorer = createCompletenessScorer();

// Data accuracy scorer - validates medical data accuracy with API-specific rules
export const dataAccuracyScorer = createScorer({
  name: 'Precisión de Datos Médicos',
  description: 'Valida la precisión de los datos médicos según los requisitos de la API',
  type: 'agent',
  judge: {
    model: 'google/gemini-2.5-flash',
    instructions:
      '<role>Eres un evaluador experto de precisión de datos médicos para la API de GNU Health.</role> ' +
      '<task>Valida que los datos sigan exactamente las especificaciones de la API.</task> ' +
      '<format>Devuelve solo el JSON estructurado que coincida con el esquema proporcionado.</format>',
  },
})
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || '';
    const assistantText = (run.output?.[0]?.content as string) || '';
    const toolCalls = (run as any).toolCalls || [];
    return { userText, assistantText, toolCalls };
  })
  .analyze({
    description: 'Extract and validate medical data accuracy according to API specs',
    outputSchema: z.object({
      validDates: z.boolean(),
      validGender: z.boolean(),
      validAge: z.boolean(),
      validIdentification: z.boolean(),
      validProcedense: z.boolean(),
      validCategory: z.boolean(),
      validProductType: z.boolean(),
      confidence: z.number().min(0).max(1).default(1),
      explanation: z.string().default(''),
    }),
    createPrompt: ({ results }) => `
      <role>Evalúa la precisión de los datos médicos en esta interacción según las especificaciones de la API GNU Health.</role>
      
      <input>
      Solicitud del usuario:
      """
      ${results.preprocessStepResult.userText}
      """
      
      Respuesta del asistente:
      """
      ${results.preprocessStepResult.assistantText}
      """
      
      Llamadas a herramientas realizadas: ${JSON.stringify(results.preprocessStepResult.toolCalls)}
      </input>
      
      <validation_rules>
      Valida según los requisitos de la API:
      1) Fechas están en formato ISO (YYYY-MM-DD) - formato requerido
      2) Género es exactamente "m" o "f" (no "male"/"female"/"other")
      3) Edad es >= 18 años (calcular desde dob)
      4) Identificación (cédula) tiene un formato válido
      5) Procedense es exactamente "768" (valor requerido)
      6) IDs de categoría son 1-6 (1=Seguros, 2=Servicios de imágenes, 3=Servicios de laboratorio, 4=Medicamentos, 5=Medicamentos esenciales OMS, 6=Evaluación Médica)
      7) Tipo de producto es "goods", "assets", o "service" (no otros valores)
      </validation_rules>
      
      <output_format>
      Devuelve JSON con los campos:
      {
        "validDates": boolean,
        "validGender": boolean,
        "validAge": boolean,
        "validIdentification": boolean,
        "validProcedense": boolean,
        "validCategory": boolean,
        "validProductType": boolean,
        "confidence": number (0-1),
        "explanation": string
      }
      </output_format>
    `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    const validations = [
      r.validDates ?? true,
      r.validGender ?? true,
      r.validAge ?? true,
      r.validIdentification ?? true,
      r.validProcedense ?? true,
      r.validCategory ?? true,
      r.validProductType ?? true,
    ];
    const allValid = validations.every(v => v === true);
    return allValid ? Math.max(0.7, (r.confidence ?? 1)) : 0;
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Data accuracy: dates=${r.validDates ?? false}, gender=${r.validGender ?? false}, age=${r.validAge ?? false}, identification=${r.validIdentification ?? false}, procedense=${r.validProcedense ?? false}, category=${r.validCategory ?? false}, productType=${r.validProductType ?? false}. Score=${score}. ${r.explanation ?? ''}`;
  });

// API Response Scorer - validates HTTP status codes and response structure
export const apiResponseScorer = createScorer({
  name: 'Validación de Respuesta de API',
  description: 'Valida los códigos de estado HTTP y la estructura de respuesta según la API',
  type: 'agent',
  judge: {
    model: 'google/gemini-2.5-flash',
    instructions:
      '<role>Eres un evaluador experto de respuestas de API.</role> ' +
      '<task>Valida que los códigos de estado HTTP y las estructuras de respuesta coincidan con las especificaciones de la API.</task> ' +
      '<format>Devuelve solo el JSON estructurado que coincida con el esquema proporcionado.</format>',
  },
})
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || '';
    const assistantText = (run.output?.[0]?.content as string) || '';
    const toolCalls = (run as any).toolCalls || [];
    const toolResults = (run as any).toolResults || [];
    return { userText, assistantText, toolCalls, toolResults };
  })
  .analyze({
    description: 'Validate API response codes and structure',
    outputSchema: z.object({
      validStatusCode: z.boolean(),
      validResponseStructure: z.boolean(),
      handledPartialSuccess: z.boolean(),
      errorHandledCorrectly: z.boolean(),
      confidence: z.number().min(0).max(1).default(1),
      explanation: z.string().default(''),
    }),
    createPrompt: ({ results }) => `
      <role>Evalúa el manejo de la respuesta de la API en esta interacción.</role>
      
      <input>
      Solicitud del usuario:
      """
      ${results.preprocessStepResult.userText}
      """
      
      Respuesta del asistente:
      """
      ${results.preprocessStepResult.assistantText}
      """
      
      Llamadas a herramientas: ${JSON.stringify(results.preprocessStepResult.toolCalls)}
      Resultados de herramientas: ${JSON.stringify(results.preprocessStepResult.toolResults)}
      </input>
      
      <validation_rules>
      Valida:
      1) Códigos de estado son correctos (200=éxito, 207=éxito parcial, 400=solicitud inválida, 401=no autorizado, 500=error del servidor)
      2) Estructura de respuesta coincide con formato de API (campos message, data, status)
      3) Éxito parcial (207) se maneja apropiadamente con advertencias
      4) Errores se manejan correctamente con mensajes apropiados
      </validation_rules>
      
      <output_format>
      Devuelve JSON con los campos:
      {
        "validStatusCode": boolean,
        "validResponseStructure": boolean,
        "handledPartialSuccess": boolean,
        "errorHandledCorrectly": boolean,
        "confidence": number (0-1),
        "explanation": string
      }
      </output_format>
    `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    const validations = [
      r.validStatusCode ?? true,
      r.validResponseStructure ?? true,
      r.handledPartialSuccess ?? true,
      r.errorHandledCorrectly ?? true,
    ];
    const allValid = validations.every(v => v === true);
    return allValid ? Math.max(0.8, (r.confidence ?? 1)) : 0.5;
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `API response: statusCode=${r.validStatusCode ?? false}, structure=${r.validResponseStructure ?? false}, partialSuccess=${r.handledPartialSuccess ?? false}, errorHandling=${r.errorHandledCorrectly ?? false}. Score=${score}. ${r.explanation ?? ''}`;
  });

// Required Fields Scorer - validates required fields per endpoint
export const requiredFieldsScorer = createScorer({
  name: 'Validación de Campos Requeridos',
  description: 'Valida que se proporcionen todos los campos requeridos para cada endpoint',
  type: 'agent',
  judge: {
    model: 'google/gemini-2.5-flash',
    instructions:
      '<role>Eres un evaluador experto de validación de solicitudes de API.</role> ' +
      '<task>Valida que todos los campos requeridos se proporcionen para cada endpoint según la documentación de la API.</task> ' +
      '<format>Devuelve solo el JSON estructurado que coincida con el esquema proporcionado.</format>',
  },
})
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || '';
    const assistantText = (run.output?.[0]?.content as string) || '';
    const toolCalls = (run as any).toolCalls || [];
    return { userText, assistantText, toolCalls };
  })
  .analyze({
    description: 'Validate required fields are present',
    outputSchema: z.object({
      requiredFieldsPresent: z.boolean(),
      correctFieldNames: z.boolean(),
      optionalFieldsCorrect: z.boolean(),
      confidence: z.number().min(0).max(1).default(1),
      explanation: z.string().default(''),
    }),
    createPrompt: ({ results }) => `
      <role>Evalúa si los campos requeridos se proporcionan correctamente para el endpoint de la API.</role>
      
      <input>
      Solicitud del usuario:
      """
      ${results.preprocessStepResult.userText}
      """
      
      Respuesta del asistente:
      """
      ${results.preprocessStepResult.assistantText}
      """
      
      Llamadas a herramientas: ${JSON.stringify(results.preprocessStepResult.toolCalls)}
      </input>
      
      <api_endpoints>
      Valida según la documentación de la API:
      - POST /api-ia/user: name, lastname, identification, dob, gender, procedense (768), email, phone
      - GET /api-ia/user: identification
      - DELETE /api-ia/user: ids, state
      - POST /api-ia/product: name, type, default_uom (1), list_price, category
      - POST /api-ia/product/variant: id, code
      - POST /api-ia/test-type: name, code, product_id
      - GET /api-ia/automatized: table
      </api_endpoints>
      
      <output_format>
      Devuelve JSON con los campos:
      {
        "requiredFieldsPresent": boolean,
        "correctFieldNames": boolean,
        "optionalFieldsCorrect": boolean,
        "confidence": number (0-1),
        "explanation": string
      }
      </output_format>
    `,
  })
  .generateScore(({ results }) => {
    const r = (results as any)?.analyzeStepResult || {};
    const validations = [
      r.requiredFieldsPresent ?? true,
      r.correctFieldNames ?? true,
      r.optionalFieldsCorrect ?? true,
    ];
    const allValid = validations.every(v => v === true);
    return allValid ? Math.max(0.8, (r.confidence ?? 1)) : 0.3;
  })
  .generateReason(({ results, score }) => {
    const r = (results as any)?.analyzeStepResult || {};
    return `Required fields: present=${r.requiredFieldsPresent ?? false}, correctNames=${r.correctFieldNames ?? false}, optionalCorrect=${r.optionalFieldsCorrect ?? false}. Score=${score}. ${r.explanation ?? ''}`;
  });

export const scorers = {
  dataAccuracyScorer,
  completenessScorer,
  toolCallAppropriatenessScorer,
  apiResponseScorer,
  requiredFieldsScorer,
};
