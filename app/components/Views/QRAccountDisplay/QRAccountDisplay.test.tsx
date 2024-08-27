import React from 'react';
import QRAccountDisplay from './index';
import { fireEvent, waitFor } from '@testing-library/react-native';
import ClipboardManager from '../../../core/ClipboardManager';
import { renderScreen } from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const initialState = {
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        selectedAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
        identities: {
          '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045': {
            address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
            name: 'Account 1',
          },
        },
      },
    },
    NetworkController: {
      network: 1,
      providerConfig: {
        type: 'mainnet',
        chainId: '0x1',
        ticker: 'ETH',
      },
    },
  },
};

jest.mock('../../../core/ClipboardManager');

const TestWrapper = () => (
  <QRAccountDisplay
    accountAddress={'0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'}
  />
);

describe('QRAccountDisplay', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      TestWrapper,
      { name: 'QRAccountDisplay' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('copies address to clipboard and checks clipboard content', async () => {
    const { getByTestId } = renderScreen(
      TestWrapper,
      { name: 'QRAccountDisplay' },
      { state: initialState },
    );

    const copyButton = getByTestId('qr-account-display-copy-button');
    fireEvent.press(copyButton);

    expect(copyButton).toBeTruthy();
    expect(ClipboardManager.setString).toHaveBeenCalledTimes(1);

    await waitFor(async () => {
      const clipboardContent = await ClipboardManager.getString();
      expect(clipboardContent).toBe(
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      );
    });
  });
});
