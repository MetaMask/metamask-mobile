import { Hex } from '@metamask/utils';

export const SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID =
  'SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID';

export function setTransactionSendFlowContextualChainId(chainId: Hex) {
  return {
    type: SET_TRANSACTION_SEND_FLOW_CONTEXTUAL_CHAIN_ID,
    chainId,
  };
}
