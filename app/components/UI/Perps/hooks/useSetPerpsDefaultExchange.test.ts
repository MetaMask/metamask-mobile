import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Engine from '../../../../core/Engine';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '@metamask/perps-controller';
import { useSetPerpsDefaultExchange } from './useSetPerpsDefaultExchange';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      setDefaultProvider: jest.fn(),
    },
  },
}));

const mockTrack = jest.fn();
jest.mock('./usePerpsEventTracking', () => ({
  usePerpsEventTracking: (): { track: typeof mockTrack } => ({
    track: mockTrack,
  }),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockSetDefaultProvider = jest.mocked(
  Engine.context.PerpsController.setDefaultProvider,
);

describe('useSetPerpsDefaultExchange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue('hyperliquid');
  });

  it('tracks a setting change only after the controller accepts a new venue', () => {
    mockSetDefaultProvider.mockReturnValue({
      success: true,
      defaultProvider: 'lighter',
    });
    const { result } = renderHook(() => useSetPerpsDefaultExchange());

    let accepted = false;
    act(() => {
      accepted = result.current('lighter');
    });

    expect(accepted).toBe(true);
    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.PERPS_UI_INTERACTION,
      {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          // oxlint-disable-next-line typescript/no-deprecated
          PERPS_EVENT_VALUE.INTERACTION_TYPE.SETTING_CHANGED,
        [PERPS_EVENT_PROPERTY.PROVIDER]: 'lighter',
      },
    );
  });

  it('does not track or report success when the venue is not registered', () => {
    mockSetDefaultProvider.mockReturnValue({
      success: false,
      defaultProvider: 'hyperliquid',
      error: 'PROVIDER_NOT_AVAILABLE',
    });
    const { result } = renderHook(() => useSetPerpsDefaultExchange());

    let accepted = true;
    act(() => {
      accepted = result.current('lighter');
    });

    expect(accepted).toBe(false);
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it('accepts a repeat of the saved venue without an interaction event', () => {
    mockSetDefaultProvider.mockReturnValue({
      success: true,
      defaultProvider: 'hyperliquid',
    });
    const { result } = renderHook(() => useSetPerpsDefaultExchange());

    let accepted = false;
    act(() => {
      accepted = result.current('hyperliquid');
    });

    expect(accepted).toBe(true);
    expect(mockTrack).not.toHaveBeenCalled();
  });
});
