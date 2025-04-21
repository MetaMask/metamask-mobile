import { TransactionType } from '@metamask/transaction-controller';
import useHandleTx from './useHandleTx';
import { QuoteResponse } from '../../../components/UI/Bridge/types';
import {
  FeeType,
  isEthUsdt,
  getEthUsdtResetData,
  TxData,
} from '@metamask/bridge-controller';
import { decimalToHex } from '../../conversions';
import { addHexPrefix } from 'ethereumjs-util';
import BigNumber from 'bignumber.js';
import { Hex } from '@metamask/utils';
import Engine from '../../../core/Engine';
import { ETH_USDT_ADDRESS } from '../../../constants/bridge';

export const ALLOWANCE_RESET_ERROR = 'Eth USDT allowance reset failed';
export const APPROVAL_TX_ERROR = 'Approve transaction failed';

export default function useHandleApprovalTx() {
  const { handleTx } = useHandleTx();

  const handleEthUsdtAllowanceReset = async ({
    approval,
    quoteResponse,
    hexChainId,
  }: {
    approval: TxData;
    quoteResponse: QuoteResponse;
    hexChainId: Hex;
  }) => {
    try {
      const allowance = new BigNumber(
        await Engine.context.BridgeController.getBridgeERC20Allowance(
          ETH_USDT_ADDRESS,
          hexChainId,
        ),
      );

      // quote.srcTokenAmount is actually after the fees
      // so we need to add fees back in for total allowance to give
      const sentAmount = new BigNumber(quoteResponse.quote.srcTokenAmount)
        .plus(quoteResponse.quote.feeData[FeeType.METABRIDGE].amount)
        .toString();

      const shouldResetApproval = allowance.lt(sentAmount) && allowance.gt(0);
      if (shouldResetApproval) {
        const resetData = getEthUsdtResetData();
        const txParams = {
          ...approval,
          data: resetData,
        };
        await handleTx({
          txType: TransactionType.bridgeApproval,
          txParams,
          fieldsToAddToTxMeta: {
            sourceTokenSymbol: quoteResponse.quote.srcAsset.symbol,
          },
        });
      }
    } catch (e) {
      throw new Error(`${ALLOWANCE_RESET_ERROR}: ${e}`);
    }
  };

  const handleApprovalTx = async ({
    approval,
    quoteResponse,
  }: {
    approval: TxData;
    quoteResponse: QuoteResponse;
  }) => {
    try {
      // On Ethereum, we need to reset the allowance to 0 for USDT first if we need to set a new allowance
      // https://docs.unizen.io/trade-api/before-you-get-started/token-allowance-management-for-non-updatable-allowance-tokens
      const hexChainId = addHexPrefix(
        String(decimalToHex(approval.chainId)),
      ) as Hex;
      if (isEthUsdt(hexChainId, quoteResponse.quote.srcAsset.address)) {
        await handleEthUsdtAllowanceReset({
          approval,
          quoteResponse,
          hexChainId,
        });
      }

      const txMeta = await handleTx({
        txType: TransactionType.bridgeApproval,
        txParams: approval,
        fieldsToAddToTxMeta: {
          sourceTokenSymbol: quoteResponse.quote.srcAsset.symbol,
        },
      });

      return txMeta;
    } catch (e) {
      throw new Error(`${APPROVAL_TX_ERROR}: ${e}`);
    }
  };
  return {
    handleApprovalTx,
  };
}
