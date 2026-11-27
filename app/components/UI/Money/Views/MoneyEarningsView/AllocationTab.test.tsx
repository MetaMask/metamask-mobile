import { setAllocationScrollEnabled } from './AllocationTab';

describe('setAllocationScrollEnabled', () => {
  it('updates the parent ScrollView scroll state', () => {
    const setNativeProps = jest.fn();
    const scrollView = { setNativeProps };

    setAllocationScrollEnabled(scrollView, false);
    setAllocationScrollEnabled(scrollView, true);

    expect(setNativeProps).toHaveBeenNthCalledWith(1, {
      scrollEnabled: false,
    });
    expect(setNativeProps).toHaveBeenNthCalledWith(2, {
      scrollEnabled: true,
    });
  });

  it('does not throw when the parent ScrollView is unavailable', () => {
    expect(() => setAllocationScrollEnabled(null, false)).not.toThrow();
  });
});
