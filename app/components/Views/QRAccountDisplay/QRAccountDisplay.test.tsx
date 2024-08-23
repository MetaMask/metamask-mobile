import React from 'react';
import QRAccountDisplay from './index';
import { fireEvent } from '@testing-library/react-native';
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

const TestWrapper = () => (
  <QRAccountDisplay
    accountAddress={'0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'}
  />
);

describe('QRAccountDisplay', () => {
  it('renders correctly', () => {
    const { toJSON } = renderScreen(
      TestWrapper,
      { name: 'QRAccountDisplay' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('copies address to clipboard when copy button is pressed', async () => {
    const { getByTestId } = renderScreen(
      TestWrapper,
      { name: 'QRAccountDisplay' },
      { state: initialState },
    );

    const copyButton = getByTestId('qr-account-display-copy-button');
    fireEvent.press(copyButton);

    expect(copyButton).toBeTruthy();
  });
});
