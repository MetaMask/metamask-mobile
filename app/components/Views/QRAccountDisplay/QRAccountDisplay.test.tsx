import React from 'react';
import QRAccountDisplay from './index';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import backgroundState from '../../../util/test/initial-background-state.json';
import ClipboardManager from '../../../core/ClipboardManager';
import { MOCK_SOLANA_ACCOUNT } from '../../../util/test/accountsControllerTestUtils';

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

const ACCOUNT = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

jest.mock('../../../core/ClipboardManager', () => {
  let clipboardContent = '';

  return {
    setString: jest.fn((str) => {
      clipboardContent = str;
    }),
    getString: jest.fn(() => clipboardContent),
  };
});

const TestWrapper = ({ accountAddress }: { accountAddress: string }) => (
  <QRAccountDisplay accountAddress={accountAddress} />
);

describe('QRAccountDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      () => <TestWrapper accountAddress={ACCOUNT} />,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('copies address to clipboard and checks clipboard content', async () => {
    const { getByTestId } = renderScreen(
      () => <TestWrapper accountAddress={ACCOUNT} />,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: initialState },
    );

    const copyButton = getByTestId('qr-account-display-copy-button');
    fireEvent.press(copyButton);

    expect(ClipboardManager.setString).toHaveBeenCalledWith(ACCOUNT);
    expect(ClipboardManager.getString()).toBe(ACCOUNT);
    expect(copyButton).toBeTruthy();
  });

  it('correctly renders Solana account address without 0x prefix', () => {
    const stateWithSolanaAccount = {
      engine: {
        backgroundState: {
          ...backgroundState,
          AccountsController: {
            internalAccounts: {
              accounts: {
                [MOCK_SOLANA_ACCOUNT.id]: MOCK_SOLANA_ACCOUNT,
              },
            },
          },
        },
      },
    };

    const { getByText, queryByText } = renderScreen(
      () => <TestWrapper accountAddress={MOCK_SOLANA_ACCOUNT.address} />,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: stateWithSolanaAccount },
    );

    // Verify the component shows the account name
    expect(getByText('Solana Account')).toBeTruthy();

    // Checking that the address doesn't contain 0x prefix by verifying the starting characters
    expect(queryByText(/^0x/)).toBeNull();

    // Check the component shows the correct Solana address
    // We're looking for a text node that contains the starting characters of the Solana address
    expect(getByText(/7EcDhS/)).toBeTruthy();

    // Verify the end of the address is also present
    expect(getByText(/CFLtV$/)).toBeTruthy();
  });
});
