import { useEffect, useRef, useMemo } from 'react';

interface UsePollingOptions<PollingInput> {
  startPolling: (input: PollingInput) => string;
  stopPollingByPollingToken: (pollingToken: string) => void;
  input: PollingInput[];
}

// A hook that manages multiple polling loops of a polling controller.
// Callers provide an array of inputs, and the hook manages starting
// and stopping polling loops for each input.
const usePolling = <PollingInput>(
  usePollingOptions: UsePollingOptions<PollingInput>,
) => {
  const pollingTokens = useRef<Map<string, string>>(new Map());

  // Memoize the stringified input for deep equality checking
  const stringifiedInput = useMemo(
    () => JSON.stringify(usePollingOptions.input),
    [usePollingOptions.input],
  );

  useEffect(() => {
    // start new polls
    for (const input of usePollingOptions.input) {
      const key = JSON.stringify(input);
      if (!pollingTokens.current.has(key)) {
        const token = usePollingOptions.startPolling(input);
        pollingTokens.current.set(key, token);
      }
    }

    // stop existing polls
    for (const [inputKey, token] of pollingTokens.current.entries()) {
      const exists = usePollingOptions.input.some(
        (i) => inputKey === JSON.stringify(i),
      );

      if (!exists) {
        usePollingOptions.stopPollingByPollingToken(token);
        pollingTokens.current.delete(inputKey);
      }
    }
  }, [usePollingOptions, stringifiedInput]);

  // stop all polling on dismount
  useEffect(
    () => () => {
      for (const token of pollingTokens.current.values()) {
        usePollingOptions.stopPollingByPollingToken(token);
      }
    },
    [usePollingOptions],
  );
};

export default usePolling;
