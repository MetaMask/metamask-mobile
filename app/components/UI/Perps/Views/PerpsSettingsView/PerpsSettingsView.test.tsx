import React from 'react';
import { act, render } from '@testing-library/react-native';
import PerpsSettingsView, {
  FLAG_OFF_LEAVE_DELAY_MS,
  PERPS_SETTINGS_TEST_IDS,
} from './PerpsSettingsView';

const mockGoBack = jest.fn();
let mockMultiProviderEnabled = false;

jest.mock('@react-navigation/native', () => ({
  useNavigation: (): { goBack: jest.Mock; navigate: jest.Mock } => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: (): { style: () => Record<string, never> } => ({
    style: (): Record<string, never> => ({}),
  }),
}));

jest.mock('../../hooks/usePerpsProvider', () => ({
  usePerpsProvider: (): { isMultiProviderEnabled: boolean } => ({
    isMultiProviderEnabled: mockMultiProviderEnabled,
  }),
}));

jest.mock('../../hooks/usePerpsMoreItems', () => ({
  usePerpsMoreItems: (): never[] => [],
}));

jest.mock('../../components/PerpsMoreSection', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View: NativeView } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: (): React.ReactElement =>
      ReactActual.createElement(NativeView, { testID: 'perps-more-section' }),
  };
});

const mockUsePerpsEventTracking = jest.fn();
jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: (options: unknown): void => {
    mockUsePerpsEventTracking(options);
  },
}));

/**
 * The flag-off leave uses a short delay so a navigation observer can see the
 * route. Component-view tests cannot use fake timers, so the delay stays here.
 */
describe('PerpsSettingsView flag gate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockGoBack.mockClear();
    mockUsePerpsEventTracking.mockClear();
    mockMultiProviderEnabled = false;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('leaves after the observation delay when Lighter is off', () => {
    const { queryByTestId } = render(<PerpsSettingsView />);

    expect(queryByTestId(PERPS_SETTINGS_TEST_IDS.SCREEN)).not.toBeOnTheScreen();

    act(() => {
      jest.advanceTimersByTime(FLAG_OFF_LEAVE_DELAY_MS - 1);
    });
    expect(mockGoBack).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockUsePerpsEventTracking).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: [false],
      }),
    );
  });
});
