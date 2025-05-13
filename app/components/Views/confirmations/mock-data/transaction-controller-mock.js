import { merge } from 'lodash';

const transactionIdMock = '699ca2f0-e459-11ef-b6f6-d182277cf5e1';

const baseTransactionMock = {
  actionId: undefined,
  batchId: undefined,
  chainId: '0x1',
  customNonceValue: '1',
  dappSuggestedGasFees: {
    maxFeePerGas: '0xcdfe60',
    maxPriorityFeePerGas: '0x012345',
  },
  defaultGasEstimates: {
    estimateType: 'medium',
    gas: '0x664e',
    gasPrice: undefined,
    maxFeePerGas: '0xcdfe60',
    maxPriorityFeePerGas: '0x0',
  },
  delegationAddress: undefined,
  deviceConfirmedOn: undefined,
  disableGasBuffer: undefined,
  gasFeeEstimates: {
    high: { maxFeePerGas: '0x1036640', maxPriorityFeePerGas: '0x0' },
    low: { maxFeePerGas: '0x989680', maxPriorityFeePerGas: '0x0' },
    medium: { maxFeePerGas: '0xcdfe60', maxPriorityFeePerGas: '0x0' },
    type: 'fee-market',
  },
  gasFeeEstimatesLoaded: true,
  gasFeeTokens: [],
  gasLimitNoBuffer: '0x664e',
  id: '56f60ff0-2bef-11f0-80ce-2f66f7fbd577',
  isFirstTimeInteraction: undefined,
  nestedTransactions: undefined,
  networkClientId: 'adb18d66-c112-449b-9f0c-c3664f6414bf',
  origin: 'metamask',
  originalGasEstimate: '0x664e',
  securityAlertResponse: undefined,
  simulationData: { nativeBalanceChange: undefined, tokenBalanceChanges: [] },
  simulationFails: undefined,
  status: 'unapproved',
  time: 1746696740463,
  txParams: {
    data: '0x',
    from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
    gas: '0x664e',
    maxFeePerGas: '0xcdfe60',
    maxPriorityFeePerGas: '0x012345',
    to: '0x97cb1fdd071da9960d38306c07f146bc98b2d317',
    type: '0x2',
  },
  type: 'simpleSend',
  userEditedGasLimit: false,
  userFeeLevel: 'dappSuggested',
  verifiedOnBlockchain: false,
};

const baseTransactionControllerMock = {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [],
        methodData: {},
        lastFetchedBlockNumbers: {},
        submitHistory: [],
      },
    },
  },
};

export const simpleSendTransaction = merge(baseTransactionMock, {
  id: transactionIdMock,
  txParams: {
    value: '0x0',
  },
});

export const simpleSendTransactionControllerMock = merge(
  baseTransactionControllerMock,
  {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [simpleSendTransaction],
        },
      },
    },
  },
);
