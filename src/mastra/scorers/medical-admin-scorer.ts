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
  name: 'Medical Data Accuracy',
  description: 'Validates accuracy of medical data according to API requirements',
  type: 'agent',
  judge: {
    model: 'google/gemini-2.5-pro',
    instructions:
      'You are an expert evaluator of medical data accuracy for GNU Health API. ' +
      'Validate that data follows API specifications exactly. ' +
      'Return only the structured JSON matching the provided schema.',
  },
})
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || '';
    const assistantText = (run.output?.[0]?.content as string) || '';
    const toolCalls = run.toolCalls || [];
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
      Evaluate the medical data accuracy in this interaction according to GNU Health API specifications.
      User request:
      """
      ${results.preprocessStepResult.userText}
      """
      Assistant response:
      """
      ${results.preprocessStepResult.assistantText}
      """
      Tool calls made: ${JSON.stringify(results.preprocessStepResult.toolCalls)}
      
      Validate according to API requirements:
      1) Dates are in ISO format (YYYY-MM-DD) - required format
      2) Gender is exactly "m" or "f" (not "male"/"female"/"other")
      3) Age is >= 18 years (calculate from dob)
      4) Identification (cedula) is a valid format
      5) Procedense is exactly "768" (required value)
      6) Category IDs are 1-6 (1=Seguros, 2=Servicios de imágenes, 3=Servicios de laboratorio, 4=Medicamentos, 5=Medicamentos esenciales OMS, 6=Evaluación Médica)
      7) Product type is "goods", "assets", or "service" (not other values)
      
      Return JSON with fields:
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
  name: 'API Response Validation',
  description: 'Validates HTTP status codes and response structure according to API',
  type: 'agent',
  judge: {
    model: 'google/gemini-2.5-pro',
    instructions:
      'You are an expert evaluator of API responses. ' +
      'Validate that HTTP status codes and response structures match API specifications. ' +
      'Return only the structured JSON matching the provided schema.',
  },
})
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || '';
    const assistantText = (run.output?.[0]?.content as string) || '';
    const toolCalls = run.toolCalls || [];
    const toolResults = run.toolResults || [];
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
      Evaluate the API response handling in this interaction.
      User request:
      """
      ${results.preprocessStepResult.userText}
      """
      Assistant response:
      """
      ${results.preprocessStepResult.assistantText}
      """
      Tool calls: ${JSON.stringify(results.preprocessStepResult.toolCalls)}
      Tool results: ${JSON.stringify(results.preprocessStepResult.toolResults)}
      
      Validate:
      1) Status codes are correct (200=success, 207=partial success, 400=bad request, 401=unauthorized, 500=server error)
      2) Response structure matches API format (message, data, status fields)
      3) Partial success (207) is handled appropriately with warnings
      4) Errors are handled correctly with appropriate messages
      
      Return JSON with fields:
      {
        "validStatusCode": boolean,
        "validResponseStructure": boolean,
        "handledPartialSuccess": boolean,
        "errorHandledCorrectly": boolean,
        "confidence": number (0-1),
        "explanation": string
      }
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
  name: 'Required Fields Validation',
  description: 'Validates that required fields are provided for each endpoint',
  type: 'agent',
  judge: {
    model: 'google/gemini-2.5-pro',
    instructions:
      'You are an expert evaluator of API request validation. ' +
      'Validate that all required fields are provided for each endpoint according to API documentation. ' +
      'Return only the structured JSON matching the provided schema.',
  },
})
  .preprocess(({ run }) => {
    const userText = (run.input?.inputMessages?.[0]?.content as string) || '';
    const assistantText = (run.output?.[0]?.content as string) || '';
    const toolCalls = run.toolCalls || [];
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
      Evaluate if required fields are provided correctly for the API endpoint.
      User request:
      """
      ${results.preprocessStepResult.userText}
      """
      Assistant response:
      """
      ${results.preprocessStepResult.assistantText}
      """
      Tool calls: ${JSON.stringify(results.preprocessStepResult.toolCalls)}
      
      Validate according to API documentation:
      - POST /api-ia/user: name, lastname, identification, dob, gender, procedense (768), email, phone
      - GET /api-ia/user: identification
      - DELETE /api-ia/user: ids, state
      - POST /api-ia/product: name, type, default_uom (1), list_price, category
      - POST /api-ia/product/variant: id, code
      - POST /api-ia/test-type: name, code, product_id
      - GET /api-ia/automatized: table
      
      Return JSON with fields:
      {
        "requiredFieldsPresent": boolean,
        "correctFieldNames": boolean,
        "optionalFieldsCorrect": boolean,
        "confidence": number (0-1),
        "explanation": string
      }
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
