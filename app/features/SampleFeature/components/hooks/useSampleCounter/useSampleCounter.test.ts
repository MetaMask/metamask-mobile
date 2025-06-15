import {act, renderHook} from '@testing-library/react-hooks';
import useSampleCounter from './useSampleCounter';

// TODO Mock storage

describe('useSampleCounter', () => {
    it('initializes with default value of 0', () => {
        const {result} = renderHook(() => useSampleCounter());
        const counter = result.current;

        expect(counter.value).toBe(0);
    });

    it('initializes with provided initial value', () => {
        const {result} = renderHook(() => useSampleCounter(5));
        const counter = result.current;

        expect(counter.value).toBe(5);
    });

    it('increments counter', () => {
        const {result} = renderHook(() => useSampleCounter());

        act(() => {
            const counter = result.current;
            counter.increment();
        });

        const counter = result.current;
        expect(counter.value).toBe(1);
    });

    it('increments multiple times', () => {
        const {result} = renderHook(() => useSampleCounter());

        act(() => {
            const counter = result.current;
            counter.increment();
            counter.increment();
            counter.increment();
        });

        const counter = result.current;
        expect(counter.value).toBe(3);
    });
});
