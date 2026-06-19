import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import type { Trade } from '@metamask/social-controllers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import TraderTradeDetailBottomSheet from './TraderTradeDetailBottomSheet';
import { TraderTradeDetailBottomSheetSelectorsIDs } from './TraderTradeDetailBottomSheet.testIds';
import ClipboardManager from '../../../../../../core/ClipboardManager';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../../UI/Rewards/hooks/useTransactionExplorer', () => ({
  __esModule: true,
  default: () => ({
    name: 'Etherscan',
    url: 'https://etherscan.io/tx/0xabc',
  }),
}));

jest.mock('../../../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

const baseTrade: Trade = {
  intent: 'enter',
  direction: 'buy',
  tokenAmount: 42,
  usdCost: 1611.37,
  timestamp: 1_700_000_000_000,
  transactionHash: '0xabc1234567890abcdef1234567890abcdef12345678',
};

describe('TraderTradeDetailBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders trade details when visible', () => {
    renderWithProvider(
      <TraderTradeDetailBottomSheet
        isVisible
        trade={baseTrade}
        tokenSymbol="RE"
        chain="base"
        tokenAddress="0x1234567890123456789012345678901234567890"
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(TraderTradeDetailBottomSheetSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(screen.getByText('Bought')).toBeOnTheScreen();
    expect(screen.getByText('$1,611.37')).toBeOnTheScreen();
    expect(screen.getByText('42 RE')).toBeOnTheScreen();
    expect(screen.getByText('RE')).toBeOnTheScreen();
  });

  it('copies the transaction hash when the row is pressed', () => {
    renderWithProvider(
      <TraderTradeDetailBottomSheet
        isVisible
        trade={baseTrade}
        tokenSymbol="RE"
        chain="base"
        tokenAddress="0x1234567890123456789012345678901234567890"
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByTestId(
        TraderTradeDetailBottomSheetSelectorsIDs.COPY_TX_HASH_BUTTON,
      ),
    );

    expect(ClipboardManager.setString).toHaveBeenCalledWith(
      baseTrade.transactionHash,
    );
  });

  it('opens the block explorer when the explorer button is pressed', () => {
    renderWithProvider(
      <TraderTradeDetailBottomSheet
        isVisible
        trade={baseTrade}
        tokenSymbol="RE"
        chain="base"
        tokenAddress="0x1234567890123456789012345678901234567890"
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(
      screen.getByTestId(
        TraderTradeDetailBottomSheetSelectorsIDs.EXPLORER_BUTTON,
      ),
    );

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://etherscan.io/tx/0xabc',
      },
    });
  });
});
