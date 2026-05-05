import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MusdCalculatorTab from './MusdCalculatorTab';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../../../util/test/analyticsMock';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { amountToPercent } from '../../../utils/musdCalculatorSlider';

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: jest.requireActual('react-native').View,
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: jest.fn(() => ({
      minDistance: jest.fn().mockReturnThis(),
      onBegin: jest.fn().mockReturnThis(),
      onUpdate: jest.fn().mockReturnThis(),
      onFinalize: jest.fn().mockReturnThis(),
    })),
  },
}));

const mockGoToSwaps = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn().mockReturnValue({ event: 'test' });
const mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
const mockCreateEventBuilder = jest
  .fn()
  .mockReturnValue({ addProperties: mockAddProperties });

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'usd'),
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../../../../../core/DeeplinkManager', () => ({
  handleDeeplink: jest.fn(),
}));

jest.mock('../../../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => ({ goToSwaps: mockGoToSwaps }),
  SwapBridgeNavigationLocation: { Rewards: 'Rewards' },
}));

jest.mock('../../../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

describe('MusdCalculatorTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  it('renders calculator layout and controls', () => {
    const { getByText, getByTestId } = render(<MusdCalculatorTab />);

    expect(getByText('rewards.musd.hero_hold')).toBeTruthy();
    expect(getByText('rewards.musd.hero_earn')).toBeTruthy();
    expect(getByText('rewards.musd.slider_amount_label')).toBeTruthy();
    expect(getByText('rewards.musd.disclaimer_calculator')).toBeTruthy();
    expect(getByText('rewards.musd.scale_min')).toBeTruthy();
    expect(getByText('rewards.musd.scale_mid')).toBeTruthy();
    expect(getByText('rewards.musd.scale_max')).toBeTruthy();
    expect(getByText('rewards.musd.buy_button')).toBeTruthy();
    expect(getByText('rewards.musd.swap_button')).toBeTruthy();
    expect(getByTestId('musd-slider-track')).toBeTruthy();
  });

  it('calls handleDeeplink and tracks buy_musd event when Buy button is pressed', () => {
    const { handleDeeplink } = jest.requireMock(
      '../../../../../../core/DeeplinkManager',
    );

    const { getByTestId } = render(<MusdCalculatorTab />);
    fireEvent.press(getByTestId('musd-buy-button'));

    expect(handleDeeplink).toHaveBeenCalledWith({
      uri: expect.stringContaining('link.metamask.io/buy'),
    });
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      button_type: 'buy_musd',
    });
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('navigates to swap screen and tracks swap_to_musd event when Swap button is pressed', () => {
    const { getByTestId } = render(<MusdCalculatorTab />);
    fireEvent.press(getByTestId('musd-swap-button'));

    expect(mockGoToSwaps).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
    );
    expect(mockAddProperties).toHaveBeenCalledWith({
      button_type: 'swap_to_musd',
    });
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('updates amount and earnings when the track is pressed', async () => {
    const { getByTestId, getByText } = render(<MusdCalculatorTab />);
    const track = getByTestId('musd-slider-track');

    fireEvent(track, 'layout', {
      nativeEvent: { layout: { width: 300, height: 32, x: 0, y: 0 } },
    });

    const locationX = (amountToPercent(5000) / 100) * 300;
    fireEvent(track, 'pressIn', {
      nativeEvent: { locationX },
    });

    await waitFor(() => {
      expect(getByTestId('musd-slider-amount-display')).toHaveTextContent(
        '$5,000',
      );
      expect(getByText(/\$0\.41/)).toBeOnTheScreen();
      expect(getByText(/\$150/)).toBeOnTheScreen();
    });
  });
});
