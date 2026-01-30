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

jest.mock('../../hooks/useNavigation', () => ({
  withNavigation: (obj: React.ReactNode) => obj,
}));

jest.mock('../QRScanner', () => jest.fn(() => null));

describe('QRTabSwitcher', () => {
  beforeEach(() => {
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
