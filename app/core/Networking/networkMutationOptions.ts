import { AppState } from 'react-native';
import {
  mutationOptions,
  onlineManager,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { OfflineError } from './errors';
import { isRetryableError } from './policies';

interface MutationIntent {
  feature: string;
  operation: string;
  expectedStatuses?: readonly number[];
  idempotent?: boolean;
}

/** A mutation never enters TanStack's paused retry queue. */
export function networkMutationOptions<Data, Variables, Context = unknown>(
  options: Omit<
    UseMutationOptions<Data, Error, Variables, Context>,
    'mutationFn' | 'retry' | 'retryDelay' | 'networkMode' | 'scope'
  > &
    MutationIntent & {
      mutationFn: NonNullable<
        UseMutationOptions<Data, Error, Variables, Context>['mutationFn']
      >;
    },
) {
  const {
    mutationFn,
    feature,
    operation,
    expectedStatuses,
    idempotent,
    meta,
    ...rest
  } = options;
  return mutationOptions({
    ...rest,
    retry: false,
    networkMode: 'always',
    meta: { ...meta, networking: true, feature, operation, expectedStatuses },
    mutationFn: async (variables, context) => {
      if (!onlineManager.isOnline()) throw new OfflineError();
      try {
        return await mutationFn(variables, context);
      } catch (error) {
        if (
          !idempotent ||
          !isRetryableError(error) ||
          !onlineManager.isOnline() ||
          AppState.currentState !== 'active'
        )
          throw error;
        // Suppress the retry if the connection or foreground was lost during the delay.
        let interrupted = false;
        const stopNetwork = onlineManager.subscribe((online) => {
          if (!online) interrupted = true;
        });
        const appState = AppState.addEventListener('change', (state) => {
          if (state !== 'active') interrupted = true;
        });
        try {
          await new Promise<void>((resolve) => setTimeout(resolve, 1000));
          if (
            interrupted ||
            !onlineManager.isOnline() ||
            AppState.currentState !== 'active'
          )
            throw error;
          return await mutationFn(variables, context);
        } finally {
          stopNetwork();
          appState.remove();
        }
      }
    },
  });
}
