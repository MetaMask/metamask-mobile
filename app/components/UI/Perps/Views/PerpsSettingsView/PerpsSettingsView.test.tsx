import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import PerpsSettingsView, {
  FLAG_OFF_LEAVE_DELAY_MS,
  PERPS_SETTINGS_SCREEN_TYPE,
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

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View: NativeView } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SafeAreaView: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }): React.ReactElement =>
      ReactActual.createElement(NativeView, { testID }, children),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const {
    Pressable: NativePressable,
    Text: NativeText,
    View: NativeView,
  } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Box: ({ children }: { children?: React.ReactNode }): React.ReactElement =>
      ReactActual.createElement(NativeView, null, children),
    HeaderStandard: ({
      title,
      onBack,
      backButtonProps,
    }: {
      title: string;
      onBack: () => void;
      backButtonProps?: { testID?: string };
    }): React.ReactElement =>
      ReactActual.createElement(
        NativeView,
        null,
        ReactActual.createElement(NativeText, null, title),
        ReactActual.createElement(NativePressable, {
          testID: backButtonProps?.testID,
          onPress: onBack,
        }),
      ),
  };
});

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

    expect(queryByTestId(PERPS_SETTINGS_TEST_IDS.SCREEN)).toBeNull();

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

  it('shows settings and records the screen type when Lighter is on', () => {
    mockMultiProviderEnabled = true;
    const { getByText, getByTestId } = render(<PerpsSettingsView />);

    expect(getByText(strings('perps.settings.title'))).toBeOnTheScreen();
    fireEvent.press(getByTestId(PERPS_SETTINGS_TEST_IDS.BACK));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockUsePerpsEventTracking).toHaveBeenCalledWith(
      expect.objectContaining({
        conditions: [true],
        properties: expect.objectContaining({
          screen_type: PERPS_SETTINGS_SCREEN_TYPE,
        }),
      }),
    );
  });
});
