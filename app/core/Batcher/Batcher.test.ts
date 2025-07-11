import Batcher from './Batcher';
import { DEFAULT_BATCH_FLUSH_TIMER } from './constants';

describe('Batcher', () => {
  let batcher: Batcher<string>;
  const mockHandler: jest.Mock = jest.fn();
  const mockItemOne = 'item1';
  const mockItemTwo = 'item2';

  describe('add', () => {
    beforeEach(() => {
      batcher = new Batcher(mockHandler, DEFAULT_BATCH_FLUSH_TIMER);
      jest.useFakeTimers();
    });

    afterEach(() => {
      mockHandler.mockClear();
      jest.useRealTimers();
    });

    it('should add items to pending set', () => {
      batcher.add(mockItemOne);
      batcher.add(mockItemTwo);

      // @ts-expect-error - accessing private property for testing
      expect(batcher.pending.size).toBe(2);
      // @ts-expect-error - accessing private property for testing
      expect(batcher.pending.has(mockItemOne)).toBe(true);
      // @ts-expect-error - accessing private property for testing
      expect(batcher.pending.has(mockItemTwo)).toBe(true);
    });

    it('should set timer on first add', () => {
      batcher.add(mockItemOne);

      // @ts-expect-error - accessing private property for testing
      expect(batcher.timer).not.toBeNull();
    });

    it('should not reset timer on subsequent adds', () => {
      batcher.add(mockItemOne);
      // @ts-expect-error - accessing private property for testing
      const firstTimer = batcher.timer;
      batcher.add(mockItemTwo);

      // @ts-expect-error - accessing private property for testing
      expect(batcher.timer).toBe(firstTimer);
    });

    it('should call handler with all items after timer expires', () => {
      batcher.add(mockItemOne);
      batcher.add(mockItemTwo);

      // Fast-forward time to trigger the timer
      jest.advanceTimersByTime(DEFAULT_BATCH_FLUSH_TIMER);

      // Verify handler was called with all items
      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith([mockItemOne, mockItemTwo]);

      // Verify pending set is cleared
      // @ts-expect-error - accessing private property for testing
      expect(batcher.pending.size).toBe(0);
    });
  });

  describe('flush', () => {
    beforeEach(() => {
      batcher = new Batcher(mockHandler, DEFAULT_BATCH_FLUSH_TIMER);
      jest.useFakeTimers();
    });

    afterEach(() => {
      mockHandler.mockClear();
      jest.useRealTimers();
    });

    it('should call handler with all pending items', () => {
      batcher.add(mockItemOne);
      batcher.add(mockItemTwo);

      batcher.flush();

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith([mockItemOne, mockItemTwo]);
    });

    it('should clear pending items after flush', () => {
      batcher.add(mockItemOne);
      batcher.add(mockItemTwo);

      batcher.flush();

      // @ts-expect-error - accessing private property for testing
      expect(batcher.pending.size).toBe(0);
    });

    it('should clear timer after flush', () => {
      batcher.add(mockItemOne);
      // @ts-expect-error - accessing private property for testing
      expect(batcher.timer).not.toBeNull();

      batcher.flush();

      // @ts-expect-error - accessing private property for testing
      expect(batcher.timer).toBeNull();
    });

    it('should handle empty pending set', () => {
      batcher.flush();

      expect(mockHandler).toHaveBeenCalledTimes(1);
      expect(mockHandler).toHaveBeenCalledWith([]);
    });
  });
});
