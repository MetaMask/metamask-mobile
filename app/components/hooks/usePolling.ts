import { useCallback, useEffect, useMemo, useRef } from 'react';

interface UsePollingOptions<PollingInput extends Record<string, unknown>> {
  startPolling: (input: PollingInput) => string;
  stopPollingByPollingToken: (pollingToken: string) => void;
  input: PollingInput[];
}

// A hook that manages multiple polling loops of a polling controller.
// Callers provide an array of inputs, and the hook manages starting
// and stopping polling loops for each input.
const usePolling = <PollingInput extends Record<string, unknown>>(
  usePollingOptions: UsePollingOptions<PollingInput>,
) => {
  const pollingTokens = useRef<Map<string, string>>(new Map());

  const flattenedInput = useMemo(() => {
    return usePollingOptions.input.flatMap((input) => Object.values(input));
  }, [usePollingOptions]);

  // Memoize the key generation
  const getKey = useCallback(
    (input: PollingInput) => Object.values(input).join('-'),
    [],
  );

  useEffect(() => {
    // start new polls
    for (const input of usePollingOptions.input) {
      const key = getKey(input);
      if (!pollingTokens.current.has(key)) {
        const token = usePollingOptions.startPolling(input);
        pollingTokens.current.set(key, token);
      }
    }

    // stop existing polls
    for (const [inputKey, token] of pollingTokens.current.entries()) {
      const exists = usePollingOptions.input.some(
        (i) => inputKey === getKey(i),
      );

      if (!exists) {
        usePollingOptions.stopPollingByPollingToken(token);
        pollingTokens.current.delete(inputKey);
      }
    }

    // stop all polling on dismount
    return () => {
      for (const token of pollingTokens.current.values()) {
        usePollingOptions.stopPollingByPollingToken(token);
      }
    };
  }, [flattenedInput, getKey]);
};

export default usePolling;
