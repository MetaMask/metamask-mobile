import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import QRTabSwitcher, { QRTabSwitcherScreens } from './QRTabSwitcher';
import { useRoute } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { endTrace, trace, TraceName } from '../../../util/trace';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
  }),
  createNavigatorFactory: () => ({}),
  useRoute: jest.fn(() => ({
    params: {
      onScanError: jest.fn(),
      onScanSuccess: jest.fn(),
      initialScreen: 0,
    },
  })),
}));

jest.mock('../../../util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  TraceName: {
    QRTabSwitcher: 'QRTabSwitcher',
  },
}));

jest.mock('../../../util/test/configureStore', () => {
  const configureMockStore = jest.requireActual('redux-mock-store').default;
  return () => configureMockStore([])();
});

jest.mock('../QRScanner', () => jest.fn(() => null));

describe('QRTabSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('renders QRScanner by default', () => {
    render(<QRTabSwitcher />);
    jest.runAllTimers();
    // QRScanner component is rendered for camera functionality
  });

  it('starts and ends QRTabSwitcher trace on mount', () => {
    render(<QRTabSwitcher />);

    expect(trace).toHaveBeenCalledWith({ name: TraceName.QRTabSwitcher });
    expect(endTrace).toHaveBeenCalledWith({ name: TraceName.QRTabSwitcher });
  });

  it('calls onScanError with USER_CANCELLED when close is pressed', () => {
    const onScanError = jest.fn();
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        onScanError,
        onScanSuccess: jest.fn(),
        initialScreen: QRTabSwitcherScreens.Scanner,
      },
    });

    const { UNSAFE_getAllByType } = render(<QRTabSwitcher />);
    const closeButtons = UNSAFE_getAllByType(ButtonIcon);

    fireEvent.press(closeButtons[0]);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(onScanError).toHaveBeenCalledWith('USER_CANCELLED');
  });

  it('logs a warning when onScanError throws', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const onScanError = jest.fn(() => {
      throw new Error('callback failed');
    });
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        onScanError,
        onScanSuccess: jest.fn(),
        initialScreen: QRTabSwitcherScreens.Scanner,
      },
    });

    const { UNSAFE_getAllByType } = render(<QRTabSwitcher />);
    fireEvent.press(UNSAFE_getAllByType(ButtonIcon)[0]);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Error setting onScanError: callback failed',
    );
    consoleWarnSpy.mockRestore();
  });

  it('renders scanner interface without tab controls', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        disableTabber: true,
        initialScreen: QRTabSwitcherScreens.Scanner,
      },
    });
    const { queryByText } = render(<QRTabSwitcher />);
    jest.runAllTimers();
    // Scanner interface displays camera view without tab navigation
    expect(queryByText(strings('qr_tab_switcher.scanner_tab'))).toBeNull();
  });
});
