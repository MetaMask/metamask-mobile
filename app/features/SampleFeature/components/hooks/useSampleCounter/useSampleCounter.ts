import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../../../app/reducers';
import { increment, selectCount } from '../../../redux/slices/sample-counter';

/**
 * Sample useSampleCounter hook
 *
 * @sampleFeature do not use in production code
 */
export const useSampleCounter = () => {
  const dispatch = useDispatch();
  const count = useSelector((state: RootState) => selectCount(state));

  const incrementCountHandler = useCallback(() => {
    dispatch(increment());
  }, [dispatch]);

  return {
    count,
    incrementCount: incrementCountHandler,
  };
};

export default useSampleCounter;
