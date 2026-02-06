import { Hex } from '@metamask/utils';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { AssetType } from '../../../Views/confirmations/types/token';
import { replaceMusdConversionTransactionForPayToken } from '../utils/musdConversionTransaction';
import { useTransactionPayToken } from '../../../Views/confirmations/hooks/pay/useTransactionPayToken';

export const useMusdPaymentToken = () => {
  const transactionMeta = useTransactionMetadataRequest();
  const { setPayToken } = useTransactionPayToken();

  const onPaymentTokenChange = (token: AssetType) => {
    const selectedTokenChainId = token?.chainId;
    const transactionChainId = transactionMeta?.chainId;

    const isChainMismatch =
      selectedTokenChainId &&
      transactionChainId &&
      selectedTokenChainId.toLowerCase() !== transactionChainId.toLowerCase();

    /*
     * For mUSD conversions, if user selects a token on a different chain, we
     * need to recreate the transaction on the new chain instead of updating
     * the payment token on the old transaction (which would trigger a
     * cross-chain quote request).
     */
    if (isChainMismatch && transactionMeta) {
      replaceMusdConversionTransactionForPayToken(transactionMeta, {
        address: token.address as Hex,
        chainId: selectedTokenChainId as Hex,
      }).catch((error) => {
        console.error(
          '[mUSD Conversion] Failed to replace transaction from PayWithModal',
          error,
        );
      });
      return;
    }

    setPayToken({
      address: token.address as Hex,
      chainId: token.chainId as Hex,
    });
  };

  return {
    onPaymentTokenChange,
  };
};
