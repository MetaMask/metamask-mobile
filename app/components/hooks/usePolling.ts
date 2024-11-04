import { useEffect, useState } from 'react';

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
  const [polls, setPolls] = useState(new Map());

  useEffect(() => {
    // start new polls
    for (const input of usePollingOptions.input) {
      const key = JSON.stringify(input);
      if (!polls.has(key)) {
        const token = usePollingOptions.startPolling(input);
        setPolls((prevPolls) => new Map(prevPolls).set(key, token));
      }
    }

    // stop existing polls
    for (const [inputKey, token] of polls.entries()) {
      const exists = usePollingOptions.input.some(
        (i) => inputKey === JSON.stringify(i),
      );

      if (!exists) {
        usePollingOptions.stopPollingByPollingToken(token);
        setPolls((prevPolls) => {
          const newPolls = new Map(prevPolls);
          newPolls.delete(inputKey);
          return newPolls;
        });
      }
    }
  },
  // stringified for deep equality
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [usePollingOptions.input && JSON.stringify(usePollingOptions.input)]);

  // stop all polling on dismount
  useEffect(() => () => {
      for (const token of polls.values()) {
        usePollingOptions.stopPollingByPollingToken(token);
      }
    },
    // Intentionally empty to trigger on dismount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []);
};

export default usePolling;
