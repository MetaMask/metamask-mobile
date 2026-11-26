import { renderHook } from '@testing-library/react-native';
import { useRetryOnPriceTick } from './useRetryOnPriceTick';

const render = (isMissing: boolean, priceTick?: number) =>
  renderHook(
    (props: { isMissing: boolean; priceTick?: number }) =>
      useRetryOnPriceTick(props.isMissing, props.priceTick),
    { initialProps: { isMissing, priceTick } },
  );

describe('useRetryOnPriceTick', () => {
  it('retries once per price tick while the estimate is missing', () => {
    const { result, rerender } = render(true, 1);
    expect(result.current).toBe(0);

    rerender({ isMissing: true, priceTick: 2 });
    expect(result.current).toBe(1);

    rerender({ isMissing: true, priceTick: 2 });
    expect(result.current).toBe(1);

    rerender({ isMissing: true, priceTick: 3 });
    expect(result.current).toBe(2);
  });

  it('retries on the first tick when none had arrived', () => {
    const { result, rerender } = render(true);

    rerender({ isMissing: true, priceTick: 1 });

    expect(result.current).toBe(1);
  });

  it('never retries an available estimate', () => {
    const { result, rerender } = render(false, 1);

    rerender({ isMissing: false, priceTick: 2 });
    rerender({ isMissing: false, priceTick: 3 });

    expect(result.current).toBe(0);
  });
});
