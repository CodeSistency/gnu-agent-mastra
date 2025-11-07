/**
 * Helpers para manejo de errores amigables al usuario
 * Proporciona funciones para extraer, formatear y sugerir correcciones de errores
 */

import { getCombinedErrorMessage } from './error-mapper';

/**
 * Extrae un mensaje de error amigable de un objeto Error
 * @param error - Objeto Error o cualquier error
 * @param endpoint - Endpoint de la API donde ocurrió el error (opcional)
 * @returns Mensaje de error amigable para el usuario
 */
export function extractUserFriendlyMessage(
  error: any,
  endpoint?: string
): string {
  const errorMessage = error?.message || String(error || 'Error desconocido');
  
  // Si el mensaje ya es descriptivo (viene de meta.message), usarlo directamente
  if (errorMessage && !errorMessage.includes('INTERNAL SERVER ERROR')) {
    return errorMessage;
  }
  
  // Si tenemos el endpoint, intentar obtener mensaje específico
  if (endpoint) {
    // Extraer código de estado del mensaje si existe
    const statusMatch = errorMessage.match(/\((\d+)\)/);
    const statusCode = statusMatch ? parseInt(statusMatch[1]) : 500;
    
    return getCombinedErrorMessage(endpoint, statusCode, errorMessage);
  }
  
  return errorMessage;
}

/**
 * Sugiere correcciones basadas en el tipo de error
 * @param error - Mensaje de error
 * @param context - Contexto adicional (datos enviados, endpoint, etc.)
 * @returns Sugerencias de corrección o null si no hay sugerencias
 */
export function suggestCorrection(
  error: string,
  context?: {
    endpoint?: string;
    data?: Record<string, any>;
  }
): string | null {
  const errorLower = error.toLowerCase();
  
  // Errores específicos de creación de tercero/paciente
  if (errorLower.includes('no se pudo crear al tercero') || errorLower.includes('no se pudo crear el tercero')) {
    return 'Verifica que todos los datos sean correctos: nombre, apellido, cédula, fecha de nacimiento (formato YYYY-MM-DD), género ("m" o "f"), y que el paciente no exista previamente en el sistema.';
  }
  
  // Errores de validación de fecha
  if (errorLower.includes('fecha') || errorLower.includes('date') || errorLower.includes('fecha ingresada es inválida')) {
    return 'Verifica que la fecha esté en formato YYYY-MM-DD (ejemplo: 1990-03-15)';
  }
  
  // Errores de edad
  if (errorLower.includes('menor de edad') || errorLower.includes('age') || errorLower.includes('no puede ser menor')) {
    return 'El paciente debe tener al menos 18 años. Verifica la fecha de nacimiento.';
  }
  
  // Errores de paciente existente
  if (errorLower.includes('ya existe') || errorLower.includes('already exists') || errorLower.includes('el tercero ya existe')) {
    return 'El paciente ya está registrado en el sistema. Puedes consultar sus datos usando la cédula.';
  }
  
  // Errores de género
  if (errorLower.includes('gender') || errorLower.includes('género')) {
    return 'El género debe ser exactamente "m" (masculino) o "f" (femenino)';
  }
  
  // Errores de categoría de producto
  if (errorLower.includes('categoría') || errorLower.includes('category')) {
    return 'La categoría debe ser un número entre 1 y 6. Verifica la categoría del producto.';
  }
  
  // Errores de tipo de producto
  if (errorLower.includes('tipo') || errorLower.includes('type')) {
    return 'El tipo de producto debe ser "goods", "assets" o "service"';
  }
  
  // Errores de autenticación
  if (errorLower.includes('no autorizado') || errorLower.includes('unauthorized')) {
    return 'Verifica que tu token de autenticación sea válido y esté configurado correctamente.';
  }
  
  // Errores de servidor genéricos
  if (errorLower.includes('error del servidor') || errorLower.includes('server error') || errorLower.includes('internal server')) {
    return 'Ocurrió un error en el servidor. Intenta nuevamente o contacta al soporte si el problema persiste.';
  }
  
  return null;
}

/**
 * Formatea un error para mostrarlo al usuario de manera clara
 * @param error - Objeto Error o mensaje de error
 * @param endpoint - Endpoint donde ocurrió el error
 * @returns Mensaje formateado con sugerencias si están disponibles
 */
export function formatErrorForUser(
  error: any,
  endpoint?: string
): string {
  const friendlyMessage = extractUserFriendlyMessage(error, endpoint);
  const suggestion = suggestCorrection(friendlyMessage, { endpoint });
  
  // Para errores de creación de tercero, hacer el mensaje más específico
  if (friendlyMessage.includes('No se pudo crear al tercero')) {
    const baseMessage = 'No se pudo crear el paciente en el sistema.';
    if (suggestion) {
      return `${baseMessage}\n\n💡 ${suggestion}`;
    }
    return `${baseMessage} Verifica que todos los datos sean correctos y que el paciente no exista previamente.`;
  }
  
  if (suggestion) {
    return `${friendlyMessage}\n\n💡 Sugerencia: ${suggestion}`;
  }
  
  return friendlyMessage;
}

/**
 * Determina si un error es recuperable (el usuario puede intentar de nuevo)
 * @param error - Mensaje de error
 * @returns true si el error es recuperable, false si no
 */
export function isRecoverableError(error: string): boolean {
  const errorLower = error.toLowerCase();
  
  // Errores no recuperables (datos incorrectos, validación fallida)
  const nonRecoverablePatterns = [
    'ya existe',
    'menor de edad',
    'fecha inválida',
    'género',
    'gender',
    'invalid',
    'no autorizado',
    'unauthorized',
  ];
  
  if (nonRecoverablePatterns.some(pattern => errorLower.includes(pattern))) {
    return false;
  }
  
  // Errores recuperables (errores de servidor, timeouts, etc.)
  const recoverablePatterns = [
    'error del servidor',
    'server error',
    'timeout',
    'network',
    'temporalmente',
  ];
  
  return recoverablePatterns.some(pattern => errorLower.includes(pattern));
}

/**
 * Extrae información útil del error para logging
 * @param error - Objeto Error
 * @param context - Contexto adicional
 * @returns Objeto con información estructurada del error
 */
export function extractErrorInfo(
  error: any,
  context?: {
    endpoint?: string;
    method?: string;
    data?: Record<string, any>;
  }
): {
  message: string;
  type: 'validation' | 'authentication' | 'server' | 'network' | 'unknown';
  recoverable: boolean;
  suggestion: string | null;
} {
  const message = extractUserFriendlyMessage(error, context?.endpoint);
  const suggestion = suggestCorrection(message, context);
  const recoverable = isRecoverableError(message);
  
  const messageLower = message.toLowerCase();
  let type: 'validation' | 'authentication' | 'server' | 'network' | 'unknown' = 'unknown';
  
  if (messageLower.includes('no autorizado') || messageLower.includes('unauthorized')) {
    type = 'authentication';
  } else if (
    messageLower.includes('inválid') ||
    messageLower.includes('invalid') ||
    messageLower.includes('ya existe') ||
    messageLower.includes('menor de edad') ||
    messageLower.includes('fecha') ||
    messageLower.includes('género') ||
    messageLower.includes('gender')
  ) {
    type = 'validation';
  } else if (
    messageLower.includes('server') ||
    messageLower.includes('servidor') ||
    messageLower.includes('no se pudo crear') ||
    messageLower.includes('error del servidor') ||
    messageLower.includes('internal server')
  ) {
    type = 'server';
  } else if (messageLower.includes('network') || messageLower.includes('timeout')) {
    type = 'network';
  }
  
  return {
    message,
    type,
    recoverable,
    suggestion,
  };
}

