
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { medicalAdminAgent } from './agents/medical-admin-agent';
import {
  dataAccuracyScorer,
  completenessScorer,
  toolCallAppropriatenessScorer,
  apiResponseScorer,
  requiredFieldsScorer,
} from './scorers/medical-admin-scorer';
import { patientRegistrationWorkflow } from './workflows/patient-registration-workflow';
import { productWithVariantWorkflow } from './workflows/product-with-variant-workflow';

export const mastra = new Mastra({
  workflows: {
    patientRegistrationWorkflow,
    productWithVariantWorkflow,
  },
  agents: { medicalAdminAgent },
  scorers: {
    dataAccuracyScorer,
    completenessScorer,
    toolCallAppropriatenessScorer,
    apiResponseScorer,
    requiredFieldsScorer,
  },
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false, 
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true }, 
  },
});
