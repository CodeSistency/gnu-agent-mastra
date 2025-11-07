
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { VercelDeployer } from '@mastra/deployer-vercel';
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
    // Using memory storage for Vercel serverless compatibility (file storage doesn't work in serverless)
    url: ":memory:",
  }),
  // Logger removed - Mastra will use default logger compatible with Vercel serverless
  deployer: new VercelDeployer(),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false, 
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true }, 
  },
});
