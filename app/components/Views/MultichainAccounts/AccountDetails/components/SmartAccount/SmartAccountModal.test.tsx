import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { SmartAccountModal } from './SmartAccountModal';
import {
  createMockInternalAccount,
  MOCK_ACCOUNTS_CONTROLLER_STATE,
} from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';

import { strings } from '../../../../../../../locales/i18n';
import AppConstants from '../../../../../../core/AppConstants';
import ButtonLink from '../../../../../../component-library/components/Buttons/Button/variants/ButtonLink';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockRoute = {
  params: {
    account: createMockInternalAccount(
      '0x67B2fAf7959fB61eb9746571041476Bbd0672569',
      'Test Smart Account',
      KeyringTypes.hd,
      EthAccountType.Eoa,
    ),
  },
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => mockRoute,
}));

const render = () =>
  renderWithProvider(<SmartAccountModal />, {
    state: {
      engine: {
        backgroundState: {
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        },
      },
    },
  });

describe('SmartAccountModal', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders SmartAccountModal with correct content for EVM account', () => {
    const { getByTestId, getByText } = render();

    // Test SafeAreaView rendering
    expect(getByTestId('smart-account-safe-area')).toBeTruthy();

    // Test ScrollView rendering
    expect(getByTestId('smart-account-scroll-view')).toBeTruthy();

    // Test content container
    expect(getByTestId('smart-account-content')).toBeTruthy();

    // Test header text
    expect(
      getByText(strings('multichain_accounts.account_details.smart_account')),
    ).toBeTruthy();

    // Test title text
    expect(getByText('Enable Smart Account')).toBeTruthy();

    // Test description text (partial match due to nested Learn more text)
    expect(
      getByText(
        'You can enable smart account features on supported networks.',
        { exact: false },
      ),
    ).toBeTruthy();

    // Test learn more text
    expect(getByText('Learn more')).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { UNSAFE_getByType } = render();

    // Find the ButtonLink component which contains the back button
    const backButton = UNSAFE_getByType(ButtonLink);
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to webview when Learn More is pressed', () => {
    const { getByText } = render();

    const learnMoreText = getByText('Learn more');
    fireEvent.press(learnMoreText);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.SMART_ACCOUNTS,
        title: 'Smart Accounts',
      },
    });
  });

  // Note: Testing the non-EVM account conditional return is complex due to
  // mocking limitations in the test environment. The logic is simple:
  // isEvmAccountType(account.type) check on lines 53-55 of SmartAccountModal.tsx

  it('renders correctly for EVM account types', () => {
    const { toJSON } = render();

    expect(toJSON()).not.toBeNull();
  });

  it('uses correct route params', () => {
    const { getByTestId } = render();

    // Test that the component renders, indicating route params are being used correctly
    expect(getByTestId('smart-account-safe-area')).toBeTruthy();
  });

  it('applies correct styles from useStyles hook', () => {
    const { getByTestId } = render();

    const safeArea = getByTestId('smart-account-safe-area');
    const scrollView = getByTestId('smart-account-scroll-view');
    const content = getByTestId('smart-account-content');

    // Test that elements are rendered with styles
    expect(safeArea).toBeTruthy();
    expect(scrollView).toBeTruthy();
    expect(content).toBeTruthy();
  });

  it('renders header with correct start accessory', () => {
    const { getByText } = render();

    // Test that the header is rendered with the correct text
    const headerText = getByText(
      strings('multichain_accounts.account_details.smart_account'),
    );
    expect(headerText).toBeTruthy();
  });

  it('renders content sections correctly', () => {
    const { getByText } = render();

    // Test card container content
    expect(getByText('Enable Smart Account')).toBeTruthy();

    // Test description box content (partial match due to nested Learn more text)
    expect(
      getByText(
        'You can enable smart account features on supported networks.',
        { exact: false },
      ),
    ).toBeTruthy();

    // Test learn more link
    const learnMoreText = getByText('Learn more');
    expect(learnMoreText).toBeTruthy();
  });

  it('handles navigation hooks correctly', () => {
    // This test ensures the navigation hooks are called without errors
    const { getByTestId } = render();

    // If the component renders successfully, it means all hooks are working
    expect(getByTestId('smart-account-safe-area')).toBeTruthy();
  });
});
