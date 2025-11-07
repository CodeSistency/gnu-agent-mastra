import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { apiCall } from '../utils/api-helper';

// Create Patient Tool (Tercero)
export const createPatientTool = createTool({
  id: 'create-patient',
  description: 'Create a new patient (tercero) in the medical system. Requires: name, lastname, identification, dob (YYYY-MM-DD), gender ("m" or "f"), procedense ("768"), email, phone. Patient must be 18+ years old. This operation requires human approval before execution.',
  requireApproval: true,
  inputSchema: z.object({
    name: z.string().describe('First name of the patient'),
    lastname: z.string().describe('Last name of the patient'),
    identification: z.string().describe('Identification number (cedula) of the patient'),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date of birth in ISO format (YYYY-MM-DD), e.g., 2002-04-30'),
    gender: z.enum(['m', 'f']).describe('Gender: "m" for male, "f" for female'),
    procedense: z.string().default('768').describe('Procedense ID (always use "768")'),
    email: z.string().email().optional().describe('Email address'),
    phone: z.string().optional().describe('Phone number'),
  }),
  outputSchema: z.object({
    message: z.string().optional(),
    data: z.any().optional(),
    status: z.number().optional(),
  }),
  execute: async ({ context }) => {
    // Ensure procedense is always "768"
    const body = {
      ...context,
      procedense: '768',
    };
    return await apiCall('/user', 'POST', body);
  },
});

// Get Patient Tool (Tercero)
export const getPatientTool = createTool({
  id: 'get-patient',
  description: 'Retrieve a patient record by identification number (cedula). Use identification, not patient ID.',
  inputSchema: z.object({
    identification: z.string().describe('Identification number (cedula) of the patient, e.g., 254569870'),
  }),
  outputSchema: z.object({
    message: z.string().optional(),
    data: z.any().optional(),
    status: z.number().optional(),
  }),
  execute: async ({ context }) => {
    // GET request with identification in body (form-data)
    return await apiCall('/user', 'GET', { identification: context.identification });
  },
});

// Deactivate Patient Tool (Tercero)
export const deactivatePatientTool = createTool({
  id: 'deactivate-patient',
  description: 'Deactivate a patient by setting their state. Use the patient ID (ids field) and the state to assign. This operation is irreversible and requires human approval before execution.',
  requireApproval: true,
  inputSchema: z.object({
    ids: z.number().describe('ID of the patient to deactivate, e.g., 296'),
    state: z.string().default('False').describe('State to assign to the patient (typically "False" for deactivation)'),
  }),
  outputSchema: z.object({
    message: z.string().optional(),
    data: z.any().optional(),
    status: z.number().optional(),
  }),
  execute: async ({ context }) => {
    return await apiCall('/user', 'DELETE', {
      ids: context.ids,
      state: context.state || 'False',
    });
  },
});
