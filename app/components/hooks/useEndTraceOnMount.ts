import { useEffect } from 'react';
import { endTrace, TraceName } from '../../util/trace';

/**
 * Custom hook that ends a performance trace when the component first mounts
 *
 * @param traceName - The name of the trace to end
 */

export const useEndTraceOnMount = (traceName: TraceName) => {
  useEffect(() => {
    endTrace({
      name: traceName,
    });
  }, [traceName]);
};

export default useEndTraceOnMount;
