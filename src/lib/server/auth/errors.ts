import { APIError } from 'better-auth/api';

const AUTH_UNAVAILABLE_MESSAGE = 'Authentication is temporarily unavailable.';

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigurationError';
  }
}

export function isAuthConfigurationError(error: unknown): error is AuthConfigurationError {
  return error instanceof AuthConfigurationError;
}

export function authUnavailableMessage(): string {
  return AUTH_UNAVAILABLE_MESSAGE;
}

export function isHttpControlFlow(error: unknown): boolean {
  return error instanceof Response || (!!error && typeof error === 'object' && 'status' in error && 'location' in error);
}

export function authErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof APIError) {
    return error.body?.message ?? error.message;
  }

  if (isAuthConfigurationError(error)) {
    return AUTH_UNAVAILABLE_MESSAGE;
  }

  return fallback;
}
