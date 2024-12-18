import React from 'react';
import { render } from '@testing-library/react-native';
import QRTabSwitcher, { QRTabSwitcherScreens } from './QRTabSwitcher';
import { useRoute } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    navigation: {},
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

jest.mock('../../../util/test/configureStore', () => {
  const configureMockStore = jest.requireActual('redux-mock-store').default;
  return () => configureMockStore([])();
});

jest.mock('@react-navigation/compat', () => {
  const actualNav = jest.requireActual('@react-navigation/compat');
  return {
    ...actualNav,
    withNavigation: (obj: React.ReactNode) => obj,
  };
});

jest.mock('../QRScanner', () => jest.fn(() => null));
jest.mock('../../UI/ReceiveRequest', () => jest.fn(() => null));

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

describe('QRTabSwitcher', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders QRScanner by default', () => {
    const { getByText } = render(<QRTabSwitcher />);
    jest.runAllTimers();
    expect(getByText(strings('qr_tab_switcher.scanner_tab'))).toBeTruthy();
  });

  it('does not render tabber when disableTabber is true', () => {
    (useRoute as jest.Mock).mockReturnValue({
      params: {
        disableTabber: true,
        initialScreen: QRTabSwitcherScreens.Scanner,
      },
    });
    const { queryByText } = render(<QRTabSwitcher />);
    jest.runAllTimers();
    expect(queryByText(strings('qr_tab_switcher.scanner_tab'))).toBeNull();
    expect(queryByText(strings('qr_tab_switcher.receive_tab'))).toBeNull();
  });
});
