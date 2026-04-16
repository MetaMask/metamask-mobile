import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MusdCalculatorView from './MusdCalculatorView';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  createMockUseAnalyticsHook,
  createMockEventBuilder,
} from '../../../../util/test/analyticsMock';
import { MetaMetricsEvents } from '../../../../core/Analytics';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = (..._args: unknown[]) => ({});
    return tw;
  },
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../../Views/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ onBack }: { title: string; onBack: () => void }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'header-back-button',
          }),
        ),
    };
  },
);

jest.mock('../components/Tabs/MusdCalculatorTab/MusdCalculatorTab', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, { testID: 'musd-calculator-tab' }),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

describe('MusdCalculatorView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
  });

  it('renders without crashing', () => {
    expect(() => render(<MusdCalculatorView />)).not.toThrow();
  });

  it('renders the calculator tab', () => {
    const { getByTestId } = render(<MusdCalculatorView />);
    expect(getByTestId('musd-calculator-tab')).toBeOnTheScreen();
  });

  it('tracks REWARDS_PAGE_VIEWED on mount with page_type musd_calculator', () => {
    render(<MusdCalculatorView />);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.REWARDS_PAGE_VIEWED,
    );
    const builder = mockCreateEventBuilder.mock.results[0].value;
    expect(builder.addProperties).toHaveBeenCalledWith({
      page_type: 'musd_calculator',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('tracks the event only once across re-renders', () => {
    const { rerender } = render(<MusdCalculatorView />);

    rerender(<MusdCalculatorView />);
    rerender(<MusdCalculatorView />);

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<MusdCalculatorView />);

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
