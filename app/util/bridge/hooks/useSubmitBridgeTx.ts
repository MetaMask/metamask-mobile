import { QuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
import { QuoteMetadata } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { selectSourceWalletAddress } from '../../../selectors/bridge';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';

export default function useSubmitBridgeTx() {
  const stxEnabled = useSelector(selectShouldUseSmartTransaction);
  const walletAddress = useSelector(selectSourceWalletAddress);

  const submitBridgeTx = async ({
    quoteResponse,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
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
    );

    return txResult;
  };

  return { submitBridgeTx };
}
