import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../../../app/reducers';
import { increment, selectCount } from '../../../reducers/sample-counter';
import {
  startPerformanceTrace,
  endPerformanceTrace,
} from '../../../../../core/redux/slices/performance';

/**
 * Sample useSampleCounter hook
 *
 * @sampleFeature do not use in production code
 */
export const useSampleCounter = () => {
  const dispatch = useDispatch();
  const count = useSelector((state: RootState) => selectCount(state));

  const incrementCountHandler = useCallback(() => {
    // Start Redux performance trace
    dispatch(
      startPerformanceTrace({
        eventName: 'SAMPLE_COUNTER_INCREMENT',
        metadata: {
          feature: 'sample-counter',
          operation: 'increment',
          currentCount: count,
          timestamp: Date.now(),
        },
      }),
    );

    try {
      // Perform the increment operation
      dispatch(increment());

      // End Redux performance trace successfully
      dispatch(
        endPerformanceTrace({
          eventName: 'SAMPLE_COUNTER_INCREMENT',
          additionalMetadata: {
            success: true,
            newCount: count + 1,
          },
        }),
      );
    } catch (error) {
      // End Redux performance trace on error
      dispatch(
        endPerformanceTrace({
          eventName: 'SAMPLE_COUNTER_INCREMENT',
          additionalMetadata: {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          },
        }),
      );
      throw error;
    }
  }, [dispatch, count]);

  return {
    count,
    incrementCount: incrementCountHandler,
  };
};

export default useSampleCounter;
