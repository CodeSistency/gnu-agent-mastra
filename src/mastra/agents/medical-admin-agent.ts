import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import {
  createPatientTool,
  getPatientTool,
  deactivatePatientTool,
} from '../tools/patient-tools';
import {
  createProductTool,
  createProductVariantTool,
  getTestProductsTool,
} from '../tools/product-tools';
import { createTestTypeTool } from '../tools/test-type-tools';
import { getTableDataTool } from '../tools/automatized-tools';
import { scorers } from '../scorers/medical-admin-scorer';
import { productWithVariantWorkflow } from '../workflows/product-with-variant-workflow';
import { patientRegistrationWorkflow } from '../workflows/patient-registration-workflow';
import { agentInstructions } from '../prompts/agent-instructions';

export const medicalAdminAgent = new Agent({
  name: 'Asistente Administrativo Médico',
  instructions: agentInstructions,
  model: 'google/gemini-2.5-flash',
  tools: {
    createPatientTool,
    getPatientTool,
    deactivatePatientTool,
    createProductTool,
    createProductVariantTool,
    getTestProductsTool,
    createTestTypeTool,
    getTableDataTool,
  },
  scorers: {
    dataAccuracy: {
      scorer: scorers.dataAccuracyScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    completeness: {
      scorer: scorers.completenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    toolCallAppropriateness: {
      scorer: scorers.toolCallAppropriatenessScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    apiResponse: {
      scorer: scorers.apiResponseScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
    requiredFields: {
      scorer: scorers.requiredFieldsScorer,
      sampling: {
        type: 'ratio',
        rate: 1,
      },
    },
  },
  workflows: {
    productWithVariantWorkflow,
    patientRegistrationWorkflow,
  },
  memory: new Memory({
    
    options: {
        workingMemory: {
            enabled: true,
          },
    },
    storage: new LibSQLStore({
      url: ':memory:', // Using memory storage for Vercel serverless compatibility
    }),
    // Memory configuration optimized for medical administrative tasks
    // Memory will persist patient consultations, user preferences, and conversation context
  }),
});
