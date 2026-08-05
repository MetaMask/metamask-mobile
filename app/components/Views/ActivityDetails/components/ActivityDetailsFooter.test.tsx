import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';
import {
  ActivityDetailsBlockExplorerButton,
  ActivityDetailsBridgeExplorerButtons,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsWebviewButton,
} from './ActivityDetailsFooter';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';
import { useActivityBlockExplorer } from '../hooks/useActivityBlockExplorer';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../hooks/useActivityBlockExplorer', () => ({
  useActivityBlockExplorer: jest.fn(),
}));

/** Only the identity fields matter here — the sheet re-derives the rest. */
type BridgeExplorerSheetTx = Pick<
  React.ComponentProps<typeof ActivityDetailsBridgeExplorerButtons>,
  'evmTxMeta' | 'multiChainTx'
>;

const useExplorerMock = jest.mocked(useActivityBlockExplorer);
const { BLOCK_EXPLORER_BUTTON, DO_IT_AGAIN_BUTTON } =
  ActivityDetailsSelectorsIDs;

describe('ActivityDetailsFooter components', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('ActivityDetailsWebviewButton', () => {
    it('opens the supplied URL in the webview', () => {
      const { getByText } = renderWithProvider(
        <ActivityDetailsWebviewButton
          label="View on Polymarket"
          title="Polymarket"
          url="https://polymarket.com/event/test-market"
        />,
      );

      fireEvent.press(getByText('View on Polymarket'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: {
          title: 'Polymarket',
          url: 'https://polymarket.com/event/test-market',
        },
      });
    });
  });

  describe('ActivityDetailsBlockExplorerButton', () => {
    it('opens the explorer webview on press', () => {
      useExplorerMock.mockReturnValue({
        url: 'https://etherscan.io/tx/0x1',
        title: 'Etherscan',
      });

      const { getByTestId } = renderWithProvider(
        <ActivityDetailsBlockExplorerButton chainId="eip155:1" hash="0x1" />,
      );

      fireEvent.press(getByTestId(BLOCK_EXPLORER_BUTTON));
      expect(mockNavigate).toHaveBeenCalledWith(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: { url: 'https://etherscan.io/tx/0x1', title: 'Etherscan' },
      });
    });

    it('renders nothing when there is no explorer link', () => {
      useExplorerMock.mockReturnValue(undefined);

      const { queryByTestId } = renderWithProvider(
        <ActivityDetailsBlockExplorerButton chainId="eip155:1" hash="0x1" />,
      );

      expect(queryByTestId(BLOCK_EXPLORER_BUTTON)).toBeNull();
    });
  });

  describe('ActivityDetailsBridgeExplorerButtons', () => {
    it('renders a single button when the transaction is not cross-chain', () => {
      useExplorerMock.mockImplementation((chainId, hash) =>
        hash ? { url: `u-${chainId}`, title: `t-${chainId}` } : undefined,
      );

      const { getByTestId, queryByTestId } = renderWithProvider(
        <ActivityDetailsBridgeExplorerButtons
          sourceChainId="eip155:1"
          sourceHash="0xs"
          destChainId="eip155:1"
          destHash={undefined}
        />,
      );

      expect(getByTestId(BLOCK_EXPLORER_BUTTON)).toBeOnTheScreen();
      expect(queryByTestId(`${BLOCK_EXPLORER_BUTTON}-source`)).toBeNull();
    });

    it.each([
      [
        'an EVM transaction',
        { evmTxMeta: { id: 'tx-1' } } as BridgeExplorerSheetTx,
      ],
      [
        'a non-EVM transaction',
        { multiChainTx: { id: 'tx-1' } } as BridgeExplorerSheetTx,
      ],
    ])(
      'opens the block-explorer sheet from one button for a cross-chain bridge with %s',
      (_name, tx) => {
        useExplorerMock.mockImplementation((chainId, hash) =>
          hash ? { url: `u-${chainId}`, title: `t-${chainId}` } : undefined,
        );

        const { getByTestId, queryByTestId } = renderWithProvider(
          <ActivityDetailsBridgeExplorerButtons
            sourceChainId="eip155:1"
            sourceHash="0xs"
            destChainId="eip155:8453"
            destHash="0xd"
            {...tx}
          />,
        );

        // Two identically-labelled buttons are indistinguishable — the sheet
        // is what lets the user pick a leg (TMCU regression from #34224).
        expect(queryByTestId(`${BLOCK_EXPLORER_BUTTON}-source`)).toBeNull();
        expect(queryByTestId(`${BLOCK_EXPLORER_BUTTON}-dest`)).toBeNull();

        fireEvent.press(getByTestId(BLOCK_EXPLORER_BUTTON));

        expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
          screen: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
          params: expect.objectContaining(tx),
        });
      },
    );

    it('falls back to a button per leg when no transaction can back the sheet', () => {
      // Indexer-only rows carry no local transaction, so the sheet has nothing
      // to resolve bridge history from.
      useExplorerMock.mockImplementation((chainId, hash) =>
        hash ? { url: `u-${chainId}`, title: `t-${chainId}` } : undefined,
      );

      const { getByTestId } = renderWithProvider(
        <ActivityDetailsBridgeExplorerButtons
          sourceChainId="eip155:1"
          sourceHash="0xs"
          destChainId="eip155:8453"
          destHash="0xd"
        />,
      );

      expect(getByTestId(`${BLOCK_EXPLORER_BUTTON}-source`)).toBeOnTheScreen();
      fireEvent.press(getByTestId(`${BLOCK_EXPLORER_BUTTON}-dest`));
      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WEBVIEW.MAIN,
        expect.objectContaining({ screen: Routes.WEBVIEW.SIMPLE }),
      );
    });

    it('renders nothing when neither leg has an explorer link', () => {
      useExplorerMock.mockReturnValue(undefined);

      const { queryByTestId } = renderWithProvider(
        <ActivityDetailsBridgeExplorerButtons
          sourceChainId="eip155:1"
          sourceHash={undefined}
          destChainId="eip155:8453"
          destHash={undefined}
        />,
      );

      expect(queryByTestId(BLOCK_EXPLORER_BUTTON)).toBeNull();
    });
  });

  describe('ActivityDetailsDoItAgainButton', () => {
    it('invokes onPress when tapped', () => {
      const onPress = jest.fn();

      const { getByTestId } = renderWithProvider(
        <ActivityDetailsDoItAgainButton
          label="Do it again"
          onPress={onPress}
        />,
      );

      fireEvent.press(getByTestId(DO_IT_AGAIN_BUTTON));
      expect(onPress).toHaveBeenCalled();
    });
  });
});
