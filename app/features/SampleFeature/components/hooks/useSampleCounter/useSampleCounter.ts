import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCount, increment } from '../../../redux/slices/sample-counter';

/**
 * Sample useSampleCounter hook
 *
 * @sampleFeature do not use in production code
 */
export function useSampleCounter() {
  const dispatch = useDispatch();
  const count = useSelector(selectCount);

  const incrementCount = useCallback(() => {
    dispatch(increment());
  }, [dispatch]);

  return {
    count,
    incrementCount,
  };
}
