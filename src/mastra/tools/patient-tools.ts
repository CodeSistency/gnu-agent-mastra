import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { apiCall } from '../utils/api-helper';

// Create Patient Tool (Tercero)
export const createPatientTool = createTool({
  id: 'create-patient',
  description: `Crear un nuevo paciente (tercero) en el sistema médico.

<tool>
Esta herramienta crea un registro de paciente en GNU Health.
Requiere aprobación humana antes de ejecutar.
</tool>

<requirements>
Campos requeridos:
- name: Nombre del paciente
- lastname: Apellido del paciente
- identification: Número de cédula
- dob: Fecha de nacimiento (formato YYYY-MM-DD)
- gender: Género ("m" para masculino, "f" para femenino)
- procedense: Siempre debe ser "768"
- email: Correo electrónico (opcional)
- phone: Teléfono (opcional)

Validaciones:
- El paciente debe tener 18+ años (se calcula desde la fecha de nacimiento)
- La fecha debe estar en formato YYYY-MM-DD
- El género debe ser exactamente "m" o "f"
</requirements>

<example>
<example_input>
name: "María"
lastname: "González"
identification: "12345678"
dob: "1990-03-15"
gender: "f"
email: "maria@example.com"
phone: "0412-1234567"
</example_input>
<example_output>
Paciente creado exitosamente con ID 123
</example_output>
</example>`,
  requireApproval: true,
  inputSchema: z.object({
    name: z.string().describe('Nombre del paciente'),
    lastname: z.string().describe('Apellido del paciente'),
    identification: z.string().describe('Número de cédula del paciente'),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Fecha de nacimiento en formato ISO (YYYY-MM-DD), ejemplo: 1990-03-15'),
    gender: z.enum(['m', 'f']).describe('Género: "m" para masculino, "f" para femenino'),
    procedense: z.string().default('768').describe('ID de procedencia (siempre usar "768")'),
    email: z.string().email().optional().describe('Dirección de correo electrónico'),
    phone: z.string().optional().describe('Número de teléfono'),
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
  description: `Obtener los datos de un paciente existente por número de cédula.

<tool>
Esta herramienta recupera información de un paciente registrado en el sistema.
No requiere aprobación humana.
</tool>

<requirements>
- identification: Número de cédula del paciente (NO usar ID del paciente)
</requirements>

<example>
<example_input>
identification: "12345678"
</example_input>
<example_output>
Datos del paciente:
- Nombre: María González
- Cédula: 12345678
- Fecha de nacimiento: 1990-03-15
- Género: Femenino
- Email: maria@example.com
- Teléfono: 0412-1234567
</example_output>
</example>`,
  inputSchema: z.object({
    identification: z.string().describe('Número de cédula del paciente, ejemplo: 12345678'),
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
  description: `Desactivar un paciente del sistema estableciendo su estado.

<tool>
Esta herramienta desactiva un paciente en el sistema.
Operación irreversible, requiere aprobación humana.
</tool>

<requirements>
- ids: ID numérico del paciente a desactivar (NO usar cédula)
- state: Estado a asignar (típicamente "False" para desactivación)
</requirements>

<warning>
Esta operación es irreversible. Asegúrate de verificar los datos del paciente antes de proceder.
</warning>

<example>
<example_input>
ids: 296
state: "False"
</example_input>
<example_output>
Paciente con ID 296 desactivado exitosamente
</example_output>
</example>`,
  requireApproval: true,
  inputSchema: z.object({
    ids: z.number().describe('ID numérico del paciente a desactivar, ejemplo: 296'),
    state: z.string().default('False').describe('Estado a asignar al paciente (típicamente "False" para desactivación)'),
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
