import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectCount, increment, decrement, setCount } from '../../../redux/slices/sample-counter';

/**
 * Sample useSampleCounter hook
 *
 * @sampleFeature do not use in production code
 */
export function useSampleCounter(initial = 0) {
    const dispatch = useDispatch();
    const count = useSelector(selectCount);

    const incrementCount = useCallback(() => {
        dispatch(increment());
    }, [dispatch]);

    const decrementCount = useCallback(() => {
        dispatch(decrement());
    }, [dispatch]);

    const resetCount = useCallback(() => {
        dispatch(setCount(initial));
    }, [dispatch, initial]);

    return {
        count,
        incrementCount,
        decrementCount,
        resetCount,
    };
}
