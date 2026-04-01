export interface PerpsConnectionAttemptContext {
  source: string;
  suppressError: boolean;
}

let currentAttemptContext: PerpsConnectionAttemptContext | null = null;

export function getPerpsConnectionAttemptContext(): PerpsConnectionAttemptContext | null {
  return currentAttemptContext;
}

export async function withPerpsConnectionAttemptContext<ValueType>(
  context: PerpsConnectionAttemptContext,
  callback: () => Promise<ValueType>,
): Promise<ValueType> {
  const previousContext = currentAttemptContext;
  currentAttemptContext = context;

  try {
    return await callback();
  } finally {
    currentAttemptContext = previousContext;
  }
}
