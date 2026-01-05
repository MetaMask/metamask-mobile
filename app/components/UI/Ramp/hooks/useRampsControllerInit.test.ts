import { renderHook, waitFor } from '@testing-library/react-native';
import { useRampsControllerInit } from './useRampsControllerInit';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      updateGeolocation: jest.fn().mockResolvedValue('US'),
    },
  },
}));

describe('useRampsControllerInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization behavior', () => {
    it('calls updateGeolocation on mount', async () => {
      renderHook(() => useRampsControllerInit());

      await waitFor(() => {
        expect(
          Engine.context.RampsController.updateGeolocation,
        ).toHaveBeenCalledWith({
          forceRefresh: false,
        });
      });
    });

    it('calls updateGeolocation with forceRefresh when specified', async () => {
      renderHook(() =>
        useRampsControllerInit({ forceGeolocationRefresh: true }),
      );

      await waitFor(() => {
        expect(
          Engine.context.RampsController.updateGeolocation,
        ).toHaveBeenCalledWith({
          forceRefresh: true,
        });
      });
    });

    it('only calls updateGeolocation once on re-renders', async () => {
      const { rerender } = renderHook(() => useRampsControllerInit());

      rerender({});
      rerender({});

      await waitFor(() => {
        expect(
          Engine.context.RampsController.updateGeolocation,
        ).toHaveBeenCalledTimes(1);
      });
    });
  });
});
