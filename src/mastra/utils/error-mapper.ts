/**
 * Mapeo de mensajes de error por endpoint y código de estado HTTP
 * Proporciona mensajes más descriptivos y específicos para cada caso
 */

export interface ErrorMapping {
  [endpoint: string]: {
    [statusCode: number]: string;
  };
}

/**
 * Mapeo de mensajes de error específicos por endpoint
 */
const errorMessages: ErrorMapping = {
  '/user': {
    400: 'Datos del paciente inválidos. Verifica que todos los campos requeridos sean correctos.',
    401: 'No autorizado para realizar esta operación. Verifica tu token de autenticación.',
    500: 'No se pudo crear al tercero. Verifica que todos los datos sean correctos y que el paciente no exista previamente.',
  },
  '/product': {
    400: 'Datos del producto inválidos. Verifica que todos los campos requeridos sean correctos.',
    401: 'No autorizado para crear productos. Verifica tu token de autenticación.',
    500: 'No se pudo crear el producto. Verifica que todos los datos sean correctos.',
  },
  '/product/variant': {
    400: 'Datos de la variante inválidos. Verifica que el ID del producto y el código sean correctos.',
    401: 'No autorizado para crear variantes. Verifica tu token de autenticación.',
    500: 'No se pudo crear la variante del producto.',
  },
  '/test-type': {
    400: 'Datos del tipo de prueba inválidos. Verifica que el nombre, código y product_id sean correctos.',
    401: 'No autorizado para crear tipos de prueba. Verifica tu token de autenticación.',
    500: 'No se pudo crear el tipo de prueba. Verifica que el product_id exista en el sistema.',
  },
  '/automatized': {
    400: 'Nombre de tabla inválido o no especificado.',
    401: 'No autorizado para acceder a esta tabla. Verifica tu token de autenticación.',
    500: 'Error al obtener datos de la tabla. Verifica que el nombre de la tabla sea correcto.',
  },
  '/test-products': {
    400: 'Error en la solicitud de productos.',
    401: 'No autorizado para listar productos. Verifica tu token de autenticación.',
    500: 'Error al obtener la lista de productos.',
  },
};

/**
 * Obtiene un mensaje de error específico para un endpoint y código de estado
 * @param endpoint - Endpoint de la API (ej: '/user', '/product')
 * @param statusCode - Código de estado HTTP
 * @returns Mensaje de error específico o undefined si no hay mapeo
 */
export function getErrorMessageForEndpoint(
  endpoint: string,
  statusCode: number
): string | undefined {
  // Normalizar endpoint (remover query params si existen)
  const normalizedEndpoint = endpoint.split('?')[0];
  
  return errorMessages[normalizedEndpoint]?.[statusCode];
}

/**
 * Obtiene un mensaje de error genérico basado solo en el código de estado
 * @param statusCode - Código de estado HTTP
 * @returns Mensaje de error genérico
 */
export function getGenericErrorMessage(statusCode: number): string {
  const genericMessages: Record<number, string> = {
    400: 'Solicitud inválida: los datos proporcionados no son correctos',
    401: 'No autorizado: token de autenticación inválido o faltante',
    403: 'Prohibido: no tienes permisos para realizar esta operación',
    404: 'No encontrado: el recurso solicitado no existe',
    500: 'Error del servidor: ocurrió un error interno',
    502: 'Bad Gateway: el servidor no pudo procesar la solicitud',
    503: 'Servicio no disponible: el servidor está temporalmente no disponible',
  };

  return genericMessages[statusCode] || `Error HTTP ${statusCode}: ocurrió un error desconocido`;
}

/**
 * Combina mensaje específico del endpoint con mensaje genérico si es necesario
 * @param endpoint - Endpoint de la API
 * @param statusCode - Código de estado HTTP
 * @param apiMessage - Mensaje de la API (de meta.message)
 * @returns Mensaje de error combinado y descriptivo
 */
export function getCombinedErrorMessage(
  endpoint: string,
  statusCode: number,
  apiMessage?: string
): string {
  // Prioridad 1: Mensaje de la API (meta.message)
  if (apiMessage) {
    return apiMessage;
  }

  // Prioridad 2: Mensaje específico del endpoint
  const endpointMessage = getErrorMessageForEndpoint(endpoint, statusCode);
  if (endpointMessage) {
    return endpointMessage;
  }

  // Prioridad 3: Mensaje genérico
  return getGenericErrorMessage(statusCode);
}

