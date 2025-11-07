/**
 * Clase de error personalizada que contiene toda la información de la respuesta de la API
 * Esto permite que el agente reciba toda la información necesaria para comunicar el error de forma amigable
 */

import type { ApiErrorResponse } from '../types/api-responses';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly apiResponse: ApiErrorResponse | any;
  public readonly endpoint: string;
  public readonly method: string;
  public readonly requestData?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number,
    apiResponse: ApiErrorResponse | any,
    endpoint: string,
    method: string,
    requestData?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.apiResponse = apiResponse;
    this.endpoint = endpoint;
    this.method = method;
    this.requestData = requestData;

    // Mantener el stack trace correcto
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Obtiene el mensaje de la API (de meta.message si existe)
   */
  getApiMessage(): string {
    if (this.apiResponse?.meta?.message) {
      return this.apiResponse.meta.message;
    }
    if (this.apiResponse?.message) {
      return this.apiResponse.message;
    }
    return this.message;
  }

  /**
   * Obtiene toda la información estructurada del error para el agente
   */
  getErrorInfo() {
    return {
      statusCode: this.statusCode,
      apiMessage: this.getApiMessage(),
      apiResponse: this.apiResponse,
      endpoint: this.endpoint,
      method: this.method,
      requestData: this.requestData,
    };
  }

  /**
   * Convierte el error a un formato JSON que el agente puede entender fácilmente
   */
  toJSON() {
    return {
      error: 'ApiError',
      message: this.message,
      statusCode: this.statusCode,
      apiMessage: this.getApiMessage(),
      apiResponse: this.apiResponse,
      endpoint: this.endpoint,
      method: this.method,
      requestData: this.requestData,
    };
  }
}

