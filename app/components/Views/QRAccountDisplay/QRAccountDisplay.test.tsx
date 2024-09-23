import React from 'react';
import QRAccountDisplay from './index';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import backgroundState from '../../../util/test/initial-background-state.json';
import ClipboardManager from '../../../core/ClipboardManager';
import { mockNetworkState } from '../../../util/test/network';

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          chainId: '0x1',
        }),
      },
    },
  },
};

jest.mock('../../../store', () => ({
  store: {
    getState: () => mockInitialState,
  },
}));

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

const TestWrapper = () => <QRAccountDisplay accountAddress={ACCOUNT} />;

describe('QRAccountDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      TestWrapper,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('copies address to clipboard and checks clipboard content', async () => {
    const { getByTestId } = renderScreen(
      TestWrapper,
      { name: 'QRAccountDisplay' },
      // @ts-expect-error initialBackgroundState throws error
      { state: mockInitialState },
    );

    const copyButton = getByTestId('qr-account-display-copy-button');
    fireEvent.press(copyButton);

    expect(ClipboardManager.setString).toHaveBeenCalledWith(ACCOUNT);
    expect(ClipboardManager.getString()).toBe(ACCOUNT);
    expect(copyButton).toBeTruthy();
  });
});
