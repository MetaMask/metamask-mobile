import { QuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
import { QuoteMetadata } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { selectSmartTransactionsEnabled } from '../../../selectors/smartTransactionsController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { isHardwareAccount as getIsHardwareAccount } from '../../address';

export default function useSubmitBridgeTx() {
  const stxEnabled = useSelector(selectSmartTransactionsEnabled);
  const selectedAddress = useSelector(selectSelectedInternalAccountFormattedAddress);
  const isHardwareAccount = selectedAddress ? getIsHardwareAccount(selectedAddress) : false;
  const requireApproval = isHardwareAccount;

  const submitBridgeTx = async ({
    quoteResponse,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
  }) => {
    const txResult = await Engine.context.BridgeStatusController.submitTx(
      quoteResponse,
      stxEnabled,
      requireApproval,
    );

    return txResult;
  };

  return { submitBridgeTx };
}
