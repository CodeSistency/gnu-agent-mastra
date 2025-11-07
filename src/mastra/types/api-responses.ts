/**
 * Tipos e interfaces para las respuestas de la API GNU Health
 * Basado en la estructura real de respuestas observada en los logs
 */

/**
 * Estructura base de todas las respuestas de la API
 */
export interface ApiResponse<T = any> {
  data: T | null | T[];
  meta: ApiMeta;
}

/**
 * Metadatos de la respuesta de la API
 */
export interface ApiMeta {
  status: 'success' | 'error';
  message: string;
}

/**
 * Respuesta exitosa de la API
 */
export interface ApiSuccessResponse<T = any> extends ApiResponse<T> {
  data: T | T[];
  meta: {
    status: 'success';
    message: string;
  };
}

/**
 * Respuesta de error de la API
 * Nota: La API puede devolver HTTP 500 pero con meta.status: "success"
 * El mensaje real del error está en meta.message
 */
export interface ApiErrorResponse extends ApiResponse<null> {
  data: null | [null];
  meta: {
    status: 'success' | 'error';
    message: string; // Mensaje descriptivo del error
  };
}

/**
 * Respuesta específica para creación de paciente (tercero)
 */
export interface PatientResponse extends ApiResponse<{
  id?: number;
  ids?: number;
  name?: string;
  lastname?: string;
  identification?: string;
}> {}

/**
 * Respuesta específica para creación de producto
 */
export interface ProductResponse extends ApiResponse<{
  id?: number;
  name?: string;
  type?: string;
  list_price?: number;
}> {}

/**
 * Respuesta específica para obtención de paciente
 */
export interface GetPatientResponse extends ApiResponse<{
  id: number;
  name: string;
  lastname: string;
  identification: string;
  dob: string;
  gender: 'm' | 'f';
  email?: string;
  phone?: string;
  active?: boolean;
}> {}

/**
 * Tipo helper para extraer el tipo de datos de una respuesta
 */
export type ApiResponseData<T extends ApiResponse> = T extends ApiResponse<infer D> ? D : never;

