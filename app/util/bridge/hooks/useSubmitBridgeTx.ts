import Engine from '../../../core/Engine';
import {
  QuoteMetadata,
  QuoteResponse,
  QuoteWarning,
} from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';
import { selectSourceWalletAddress } from '../../../selectors/bridge';

export default function useSubmitBridgeTx() {
  const stxEnabled = useSelector(selectShouldUseSmartTransaction);
  const walletAddress = useSelector(selectSourceWalletAddress);

  const submitBridgeTx = async ({
    quoteResponse,
    isLoading,
    warnings,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
    isLoading: boolean;
    warnings: QuoteWarning[];
  }) => {
    if (!walletAddress) {
      throw new Error('Wallet address is not set');
    }
    const txResult = await Engine.context.BridgeStatusController.submitTx(
      walletAddress,
      {
        ...quoteResponse,
        approval: quoteResponse.approval ?? undefined,
      },
      stxEnabled,
      isLoading,
      warnings,
    );

    return txResult;
  };

  return { submitBridgeTx };
}
