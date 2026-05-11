import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MusdCalculatorTab from './MusdCalculatorTab';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../../../../util/test/analyticsMock';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { amountToPercent } from '../../../utils/musdCalculatorSlider';

const mockPanGestureHandlers: {
  onBegin?: (event: { x: number }) => void;
  onUpdate?: (event: { x: number }) => void;
  onFinalize?: (event: { x: number }) => void;
} = {};

jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: jest.requireActual('react-native').View,
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: jest.fn(() => ({
      minDistance: jest.fn().mockReturnThis(),
      onBegin: jest.fn(function (
        this: unknown,
        handler: (event: { x: number }) => void,
      ) {
        mockPanGestureHandlers.onBegin = handler;
        return this;
      }),
      onUpdate: jest.fn(function (
        this: unknown,
        handler: (event: { x: number }) => void,
      ) {
        mockPanGestureHandlers.onUpdate = handler;
        return this;
      }),
      onFinalize: jest.fn(function (
        this: unknown,
        handler: (event: { x: number }) => void,
      ) {
        mockPanGestureHandlers.onFinalize = handler;
        return this;
      }),
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

jest.mock('../../../../SimulationDetails/FiatDisplay/useFiatFormatter', () =>
  jest.fn(
    () => (value: { toNumber: () => number }) =>
      `$${value.toNumber().toLocaleString('en-US')}`,
  ),
);

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
    mockPanGestureHandlers.onBegin = undefined;
    mockPanGestureHandlers.onUpdate = undefined;
    mockPanGestureHandlers.onFinalize = undefined;
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  it('renders calculator layout and controls', () => {
    const { getByText, getByTestId } = render(<MusdCalculatorTab />);

    expect(getByText('rewards.musd.hero_hold')).toBeOnTheScreen();
    expect(getByText('rewards.musd.hero_earn')).toBeOnTheScreen();
    expect(getByText('rewards.musd.slider_amount_label')).toBeOnTheScreen();
    expect(getByText('rewards.musd.disclaimer_calculator')).toBeOnTheScreen();
    expect(getByTestId('musd-slider-scale-min')).toHaveTextContent('$100');
    expect(getByTestId('musd-slider-scale-mid')).toHaveTextContent('$1,000');
    expect(getByTestId('musd-slider-scale-max')).toHaveTextContent('$10,000');
    expect(getByText('rewards.musd.buy_button')).toBeOnTheScreen();
    expect(getByText('rewards.musd.swap_button')).toBeOnTheScreen();
    expect(getByTestId('musd-slider-track')).toBeOnTheScreen();
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
    const { getByTestId, getByText, queryByText } = render(
      <MusdCalculatorTab />,
    );
    const track = getByTestId('musd-slider-track');

    fireEvent(track, 'layout', {
      nativeEvent: { layout: { width: 300, height: 32, x: 0, y: 0 } },
    });

    const locationX = (amountToPercent(5000) / 100) * 300;
    fireEvent(track, 'pressIn', {
      nativeEvent: { locationX },
    });

    await waitFor(() => {
      expect(getByTestId('musd-slider-amount-display')).toHaveProp(
        'value',
        '$5,000',
      );
      expect(
        getByText(/rewards\.musd\.earnings_per_day_suffix/),
      ).toBeOnTheScreen();
      expect(
        queryByText(/rewards\.musd\.earnings_per_month_suffix/),
      ).toBeNull();
      expect(getByText(/\$0\.41/)).toBeOnTheScreen();
      expect(getByText(/\$150/)).toBeOnTheScreen();
    });
  });

  it('allows editing the amount and updates earnings from typed values', async () => {
    const { getByTestId, getByText } = render(<MusdCalculatorTab />);
    const amountInput = getByTestId('musd-slider-amount-display');

    fireEvent(amountInput, 'focus');
    fireEvent.changeText(amountInput, '5000');

    await waitFor(() => {
      expect(amountInput).toHaveProp('value', '5000');
      expect(getByText(/\$150/)).toBeOnTheScreen();
    });

    fireEvent(amountInput, 'endEditing');

    await waitFor(() => {
      expect(amountInput).toHaveProp('value', '$5,000');
    });
  });

  it('accepts amounts over the slider maximum', async () => {
    const { getByTestId, getByText } = render(<MusdCalculatorTab />);
    const amountInput = getByTestId('musd-slider-amount-display');

    fireEvent(amountInput, 'focus');
    fireEvent.changeText(amountInput, '12000');

    await waitFor(() => {
      expect(amountInput).toHaveProp('value', '12000');
      expect(getByText(/\$360/)).toBeOnTheScreen();
    });
  });

  it('normalizes decorated decimal input while editing', async () => {
    const { getByTestId, getByText } = render(<MusdCalculatorTab />);
    const amountInput = getByTestId('musd-slider-amount-display');

    fireEvent(amountInput, 'focus');
    fireEvent.changeText(amountInput, '$1,234.56.78');

    await waitFor(() => {
      expect(amountInput).toHaveProp('value', '1234.5678');
      expect(getByText(/\$37\.037/)).toBeOnTheScreen();
    });
  });

  it('treats invalid numeric input as zero', async () => {
    const { getByTestId, getAllByText } = render(<MusdCalculatorTab />);
    const amountInput = getByTestId('musd-slider-amount-display');

    fireEvent(amountInput, 'focus');
    fireEvent.changeText(amountInput, '.');

    await waitFor(() => {
      expect(amountInput).toHaveProp('value', '.');
      expect(getAllByText(/\$0/).length).toBeGreaterThan(0);
    });
  });

  it('ignores slider presses before the track is measured', () => {
    const { getByTestId } = render(<MusdCalculatorTab />);

    fireEvent(getByTestId('musd-slider-track'), 'pressIn', {
      nativeEvent: { locationX: 200 },
    });

    expect(getByTestId('musd-slider-amount-display')).toHaveProp(
      'value',
      '$1,000',
    );
  });

  it('updates amount through pan gesture handlers', async () => {
    const { getByTestId } = render(<MusdCalculatorTab />);
    const track = getByTestId('musd-slider-track');

    fireEvent(track, 'layout', {
      nativeEvent: { layout: { width: 300, height: 32, x: 0, y: 0 } },
    });

    act(() => {
      mockPanGestureHandlers.onBegin?.({ x: 150 });
      mockPanGestureHandlers.onUpdate?.({ x: 300 });
      mockPanGestureHandlers.onFinalize?.({ x: 300 });
    });

    await waitFor(() => {
      expect(getByTestId('musd-slider-amount-display')).toHaveProp(
        'value',
        '$10,000',
      );
    });
  });

  it('ignores pan gesture handlers before the track is measured', () => {
    const { getByTestId } = render(<MusdCalculatorTab />);

    act(() => {
      mockPanGestureHandlers.onBegin?.({ x: 150 });
      mockPanGestureHandlers.onUpdate?.({ x: 300 });
    });

    expect(getByTestId('musd-slider-amount-display')).toHaveProp(
      'value',
      '$1,000',
    );
  });
});
