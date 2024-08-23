import React from 'react';
import { render } from '@testing-library/react-native';
import QRTabSwitcher, { Screens } from './index';
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
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    withNavigation: (obj: any) => obj,
  };
});

jest.mock('../QRScanner', () => jest.fn(() => null));
jest.mock('../../UI/ReceiveRequest', () => jest.fn(() => null));

describe('QRTabSwitcher', () => {
  it('render QRScanner by default', () => {
    const { getByText } = render(<QRTabSwitcher />);
    expect(getByText(strings('qr_tab_switcher.scanner_tab'))).toBeTruthy();
  });

  it('not render tabber when disableTabber is true', () => {
    useRoute.mockReturnValue({
      params: {
        disableTabber: true,
        initialScreen: Screens.Scanner,
      },
    });
    const { queryByText } = render(<QRTabSwitcher />);
    expect(queryByText(strings('qr_tab_switcher.scanner_tab'))).toBeNull();
    expect(queryByText(strings('qr_tab_switcher.receive_tab'))).toBeNull();
  });
});
