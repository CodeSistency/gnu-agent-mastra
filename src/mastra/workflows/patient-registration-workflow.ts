import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { apiCall } from '../utils/api-helper';
import {
  calculateAge,
  validateIdentification,
  validateEmail,
  validatePhone,
} from '../utils/validation-helpers';

// Step 1: Validate Patient Data
const validatePatientData = createStep({
  id: 'validate-patient-data',
  description: 'Validate patient data including date format, age, gender, identification, email, and phone',
  inputSchema: z.object({
    name: z.string(),
    lastname: z.string(),
    identification: z.string(),
    dob: z.string(),
    gender: z.enum(['m', 'f']),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }),
  outputSchema: z.object({
    name: z.string(),
    lastname: z.string(),
    identification: z.string(),
    dob: z.string(),
    gender: z.enum(['m', 'f']),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    age: z.number(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(inputData.dob)) {
      throw new Error('La fecha ingresada es inválida. Por favor verifique');
    }

    // Validate and calculate age
    const age = calculateAge(inputData.dob);
    if (age < 18) {
      throw new Error('El usuario no puede ser menor de edad');
    }

    // Validate gender
    if (inputData.gender !== 'm' && inputData.gender !== 'f') {
      throw new Error('Gender must be exactly "m" or "f"');
    }

    // Validate identification
    if (!validateIdentification(inputData.identification)) {
      throw new Error('Invalid identification format');
    }

    // Validate email if provided
    if (inputData.email && !validateEmail(inputData.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone if provided
    if (inputData.phone && !validatePhone(inputData.phone)) {
      throw new Error('Invalid phone format');
    }

    return {
      ...inputData,
      age,
    };
  },
});

// Step 2: Check if Patient Exists
const checkPatientExists = createStep({
  id: 'check-patient-exists',
  description: 'Check if patient already exists by identification number',
  inputSchema: z.object({
    identification: z.string(),
    name: z.string(),
    lastname: z.string(),
    dob: z.string(),
    gender: z.enum(['m', 'f']),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    age: z.number(),
  }),
  outputSchema: z.object({
    exists: z.boolean(),
    identification: z.string(),
    name: z.string(),
    lastname: z.string(),
    dob: z.string(),
    gender: z.enum(['m', 'f']),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    age: z.number(),
    patientData: z.any().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    try {
      // Try to get patient by identification
      const response = await apiCall<{
        message?: string;
        data?: any;
        status?: number;
      }>('/user', 'GET', { identification: inputData.identification });

      // If we get a successful response with data, patient exists
      if (response && response.data && response.status === 200) {
        throw new Error('El tercero ya existe');
      }

      // Patient doesn't exist, continue
      return {
        ...inputData,
        exists: false,
      };
    } catch (error: any) {
      // If error message is "El tercero ya existe", rethrow it
      if (error.message && error.message.includes('ya existe')) {
        throw error;
      }

      // If error is 500 or patient not found, continue (patient doesn't exist)
      if (error.message && error.message.includes('500')) {
        // Server error, but we'll continue and let API handle it
        return {
          ...inputData,
          exists: false,
        };
      }

      // If error is "No se pudo obtener al tercero o el mismo, no existe"
      // it means patient doesn't exist, continue
      if (error.message && error.message.includes('no existe')) {
        return {
          ...inputData,
          exists: false,
        };
      }

      // Other errors, rethrow
      throw error;
    }
  },
});

// Step 3: Create Patient
const createPatient = createStep({
  id: 'create-patient',
  description: 'Create patient via API',
  inputSchema: z.object({
    identification: z.string(),
    name: z.string(),
    lastname: z.string(),
    dob: z.string(),
    gender: z.enum(['m', 'f']),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    age: z.number(),
    exists: z.boolean(),
    patientData: z.any().optional(),
  }),
  outputSchema: z.object({
    response: z.any(),
    status: z.number(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const body = {
      name: inputData.name,
      lastname: inputData.lastname,
      identification: inputData.identification,
      dob: inputData.dob,
      gender: inputData.gender,
      procedense: '768', // Always use 768
      email: inputData.email || '',
      phone: inputData.phone || '',
    };

    try {
      const response = await apiCall<{
        message?: string;
        data?: any;
        status?: number;
      }>('/user', 'POST', body);

      return {
        response,
        status: response.status || 200,
      };
    } catch (error: any) {
      // Handle specific error messages from API
      if (error.message && error.message.includes('fecha ingresada es inválida')) {
        throw new Error('La fecha ingresada es inválida. Por favor verifique');
      }
      if (error.message && error.message.includes('menor de edad')) {
        throw new Error('El usuario no puede ser menor de edad');
      }
      if (error.message && error.message.includes('ya existe')) {
        throw new Error('El tercero ya existe');
      }
      if (error.message && error.message.includes('500')) {
        throw new Error('No se pudo crear al tercero');
      }
      throw error;
    }
  },
});

// Step 4: Confirm Patient Creation
const confirmPatientCreation = createStep({
  id: 'confirm-patient-creation',
  description: 'Confirm patient creation and format response',
  inputSchema: z.object({
    response: z.any(),
    status: z.number(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    patientId: z.string().optional(),
    message: z.string(),
    patientData: z.any().optional(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const { response, status } = inputData;

    // Verify response structure
    if (status !== 200) {
      throw new Error('Failed to create patient: Invalid response status');
    }

    // Extract patient ID from response
    let patientId: string | undefined;
    if (response?.data?.id) {
      patientId = String(response.data.id);
    } else if (response?.data?.ids) {
      patientId = String(response.data.ids);
    } else if (response?.id) {
      patientId = String(response.id);
    }

    const message = response?.message || 'Tercero creado exitosamente';

    return {
      success: true,
      patientId,
      message,
      patientData: response?.data || response,
    };
  },
});

// Patient Registration Workflow
export const patientRegistrationWorkflow = createWorkflow({
  id: 'patient-registration-workflow',
  inputSchema: z.object({
    name: z.string().describe('First name of the patient'),
    lastname: z.string().describe('Last name of the patient'),
    identification: z.string().describe('Identification number (cedula)'),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Date of birth in YYYY-MM-DD format'),
    gender: z.enum(['m', 'f']).describe('Gender: "m" for male, "f" for female'),
    email: z.string().email().optional().describe('Email address'),
    phone: z.string().optional().describe('Phone number'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    patientId: z.string().optional(),
    message: z.string(),
    patientData: z.any().optional(),
  }),
})
  .then(validatePatientData)
  .then(checkPatientExists)
  .then(createPatient)
  .then(confirmPatientCreation)
  .commit();

