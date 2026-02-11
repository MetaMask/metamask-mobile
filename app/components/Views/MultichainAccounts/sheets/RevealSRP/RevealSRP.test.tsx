import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { RevealSRP } from './RevealSRP';
import { createMockInternalAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { strings } from '../../../../../../locales/i18n';
import { AccountDetailsIds } from '../../AccountDetails.testIds';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { SRP_GUIDE_URL } from '../../../../../constants/urls';
import { InternalAccount } from '@metamask/keyring-internal-api';

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
    SafeAreaView: jest.fn().mockImplementation(({ children }) => children),
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      openURL: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getInitialURL: jest.fn(() => Promise.resolve()),
    },
  };
});

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockRoute = {
  params: {
    account: createMockInternalAccount(
      '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
      'Test Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    ),
  },
};
const mockUseRoute = jest.fn().mockReturnValue(mockRoute);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: () => mockGoBack(),
    navigate: (screen: string, params?: object) => mockNavigate(screen, params),
  }),
  useRoute: () => mockUseRoute(),
}));

const mockUseKeyringId = jest.fn().mockReturnValue('test-keyring-id');
jest.mock('../../../../hooks/useKeyringId', () => ({
  useKeyringId: (account: InternalAccount) => mockUseKeyringId(account),
}));

const render = () => renderWithProvider(<RevealSRP />);

describe('RevealSRP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-establish the default return value after clearing mocks
    mockUseKeyringId.mockReturnValue('test-keyring-id');
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render();

    const backButton = getByTestId(AccountDetailsIds.BACK_BUTTON);
    fireEvent.press(backButton);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to SRP reveal quiz when get started button is pressed', () => {
    const { getByText } = render();

    const getStartedButton = getByText(
      strings('multichain_accounts.reveal_srp.get_started'),
    );
    fireEvent.press(getStartedButton);
    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SRP_REVEAL_QUIZ,
      {
        keyringId: 'test-keyring-id',
      },
    );
  });

  it('navigates to webview when learn more button is pressed', () => {
    const { getByText } = render();

    const learnMoreButton = getByText(
      strings('multichain_accounts.reveal_srp.learn_more'),
    );
    fireEvent.press(learnMoreButton);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: SRP_GUIDE_URL,
      },
    });
  });
});
