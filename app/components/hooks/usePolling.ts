import { useEffect, useRef } from 'react';

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

  useEffect(
    () => {
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
    },
    // stringified for deep equality
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usePollingOptions.input && JSON.stringify(usePollingOptions.input)],
  );

  // stop all polling on dismount
  useEffect(
    () => () => {
      for (const token of pollingTokens.current.values()) {
        usePollingOptions.stopPollingByPollingToken(token);
      }
    },
    // Intentionally empty to trigger on dismount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
};

export default usePolling;
