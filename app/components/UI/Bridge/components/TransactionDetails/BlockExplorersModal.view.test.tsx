import '../../../../../../tests/component-view/mocks';
import { act, fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { getRouteParamsProbeTestId } from '../../../../../../tests/component-view/render';
import { renderBlockExplorersModal } from '../../../../../../tests/component-view/renderers/bridge';
import {
  activityCvBridgeEthToSolHistoryEntry,
  buildConfirmedLocalBridgeEthToSolTransaction,
  initialStateActivityWithLocalTransactions,
} from '../../../../../../tests/component-view/presets/activity';
import Routes from '../../../../../constants/navigation/Routes';
import { BlockExplorersModalSelectorsIDs } from './BlockExplorersModal.testIds';

const { SHEET } = BlockExplorersModalSelectorsIDs;

const bridgeHistoryOverride = (
  txMetaId: string,
  historyEntry: Record<string, unknown>,
) =>
  ({
    engine: {
      backgroundState: {
        BridgeStatusController: {
          txHistory: {
            [txMetaId]: historyEntry,
          },
        },
      },
    },
  }) as never;

describeForPlatforms('BlockExplorersModal — ETH → SOL explorers', () => {
  it('shows Etherscan and Solscan then opens webview for each explorer', async () => {
    const bridgeTransaction = buildConfirmedLocalBridgeEthToSolTransaction();
    const state = initialStateActivityWithLocalTransactions([bridgeTransaction])
      .withOverrides(
        bridgeHistoryOverride(
          bridgeTransaction.id,
          activityCvBridgeEthToSolHistoryEntry,
        ),
      )
      .build();
    const params = { evmTxMeta: bridgeTransaction };

    const sourceScreen = renderBlockExplorersModal({ state, params });

    expect(await sourceScreen.findByTestId(SHEET)).toBeOnTheScreen();
    expect(
      await sourceScreen.findByText(
        strings('bridge_transaction_details.view_on_block_explorer'),
      ),
    ).toBeOnTheScreen();
    expect(await sourceScreen.findByText('Etherscan')).toBeOnTheScreen();
    expect(await sourceScreen.findByText('Solscan')).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(sourceScreen.getByText('Etherscan'));
    });

    const sourceWebviewParams = await sourceScreen.findByTestId(
      getRouteParamsProbeTestId(Routes.WEBVIEW.MAIN),
    );
    expect(sourceWebviewParams).toBeOnTheScreen();
    expect(sourceWebviewParams).toHaveTextContent(/etherscan\.io/, {
      exact: false,
    });

    // Sheet dismisses on explorer press; remount to exercise the dest CTA.
    sourceScreen.unmount();
    const destScreen = renderBlockExplorersModal({ state, params });

    expect(await destScreen.findByText('Solscan')).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(destScreen.getByText('Solscan'));
    });

    const destWebviewParams = await destScreen.findByTestId(
      getRouteParamsProbeTestId(Routes.WEBVIEW.MAIN),
    );
    expect(destWebviewParams).toBeOnTheScreen();
    expect(destWebviewParams).toHaveTextContent(/solscan\.io/, {
      exact: false,
    });
  });

  it('shows only Etherscan when the destination tx hash is missing', async () => {
    const bridgeTransaction = buildConfirmedLocalBridgeEthToSolTransaction();
    const historyWithoutDest = {
      ...activityCvBridgeEthToSolHistoryEntry,
      status: {
        ...activityCvBridgeEthToSolHistoryEntry.status,
        destChain: {
          ...activityCvBridgeEthToSolHistoryEntry.status.destChain,
          txHash: undefined,
        },
      },
    };
    const state = initialStateActivityWithLocalTransactions([bridgeTransaction])
      .withOverrides(
        bridgeHistoryOverride(bridgeTransaction.id, historyWithoutDest),
      )
      .build();

    const { findByTestId, findByText, getByText, queryByText } =
      renderBlockExplorersModal({
        state,
        params: { evmTxMeta: bridgeTransaction },
      });

    expect(await findByTestId(SHEET)).toBeOnTheScreen();
    expect(await findByText('Etherscan')).toBeOnTheScreen();
    expect(queryByText('Solscan')).not.toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(getByText('Etherscan'));
    });

    const webviewParams = await findByTestId(
      getRouteParamsProbeTestId(Routes.WEBVIEW.MAIN),
    );
    expect(webviewParams).toBeOnTheScreen();
    expect(webviewParams).toHaveTextContent(/etherscan\.io/, { exact: false });
  });
});
