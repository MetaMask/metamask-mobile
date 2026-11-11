import { create, StructError, type Struct } from '@metamask/superstruct';
import {
  CancelRecurringOrderResponseSchema,
  CreateRecurringOrderResponseSchema,
  GetRecurringOrderResponseSchema,
  ListRecurringOrdersResponseSchema,
  ListRecurringSwapsResponseSchema,
  PrepareRecurringDelegationResponseSchema,
  RecurringApiErrorSchema,
  type CancelRecurringOrderResponse,
  type CreateRecurringOrderResponse,
  type GetRecurringOrderResponse,
  type ListRecurringOrdersResponse,
  type ListRecurringSwapsResponse,
  type PrepareRecurringDelegationResponse,
  type RecurringApiError,
} from './recurringOrders.types';

function parseRecurringValue<T>(
  value: unknown,
  schema: Struct<T>,
  label: string,
): T {
  try {
    return create(value, schema);
  } catch (error) {
    if (error instanceof StructError) {
      throw new Error(`Invalid ${label}: ${error.message}`);
    }
    throw error;
  }
}

export function parseCreateRecurringOrderResponse(
  value: unknown,
): CreateRecurringOrderResponse {
  return parseRecurringValue(
    value,
    CreateRecurringOrderResponseSchema,
    'create recurring order response',
  );
}

export function parsePrepareRecurringDelegationResponse(
  value: unknown,
): PrepareRecurringDelegationResponse {
  return parseRecurringValue(
    value,
    PrepareRecurringDelegationResponseSchema,
    'prepare recurring delegation response',
  );
}

export function parseListRecurringOrdersResponse(
  value: unknown,
): ListRecurringOrdersResponse {
  return parseRecurringValue(
    value,
    ListRecurringOrdersResponseSchema,
    'recurring orders response',
  );
}

export function parseGetRecurringOrderResponse(
  value: unknown,
): GetRecurringOrderResponse {
  return parseRecurringValue(
    value,
    GetRecurringOrderResponseSchema,
    'recurring order response',
  );
}

export function parseListRecurringSwapsResponse(
  value: unknown,
): ListRecurringSwapsResponse {
  return parseRecurringValue(
    value,
    ListRecurringSwapsResponseSchema,
    'recurring swaps response',
  );
}

export function parseCancelRecurringOrderResponse(
  value: unknown,
): CancelRecurringOrderResponse {
  return parseRecurringValue(
    value,
    CancelRecurringOrderResponseSchema,
    'cancel recurring order response',
  );
}

export function parseRecurringApiError(value: unknown): RecurringApiError {
  return parseRecurringValue(
    value,
    RecurringApiErrorSchema,
    'recurring API error',
  );
}
