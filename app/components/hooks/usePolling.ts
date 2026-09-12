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

  const { input, startPolling, stopPollingByPollingToken } = usePollingOptions;

  // Deep-equality hash of `input`, recomputed each render so the effect still
  // re-runs when the array changes by content (callers may mutate the array in
  // place or pass a new reference). Computed once here and reused as both the
  // effect dependency and below, instead of stringifying repeatedly.
  const inputKey = input && JSON.stringify(input);

  useEffect(
    () => {
      const tokens = pollingTokens.current;

      // Stringify each input once and reuse for both loops. Previously the stop
      // loop re-stringified every input for every existing token (O(n^2)).
      const inputKeys = input.map((i) => JSON.stringify(i));
      const currentKeys = new Set(inputKeys);

      // start new polls
      input.forEach((i, index) => {
        const key = inputKeys[index];
        if (!tokens.has(key)) {
          tokens.set(key, startPolling(i));
        }
      });

      // stop existing polls that are no longer present in the input
      for (const [key, token] of tokens.entries()) {
        if (!currentKeys.has(key)) {
          stopPollingByPollingToken(token);
          tokens.delete(key);
        }
      }
    },
    // `inputKey` is the deep-equality hash above; `startPolling` /
    // `stopPollingByPollingToken` are caller-provided callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputKey],
  );

  // stop all polling on dismount
  useEffect(
    () => () => {
      for (const token of pollingTokens.current.values()) {
        stopPollingByPollingToken(token);
      }
    },
    // Intentionally empty to trigger on dismount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
};

export default usePolling;
