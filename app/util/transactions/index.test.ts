import { swapsUtils } from '@metamask/swaps-controller';
import { BN } from 'ethereumjs-util';

/* eslint-disable-next-line import/no-namespace */
import * as controllerUtilsModule from '@metamask/controller-utils';

import { BNToHex } from '../number';
import { UINT256_BN_MAX_VALUE } from '../../constants/transaction';
import { NEGATIVE_TOKEN_DECIMALS } from '../../constants/error';
import {
  generateTransferData,
  decodeApproveData,
  decodeTransferData,
  getMethodData,
  getActionKey,
  generateTxWithNewTokenAllowance,
  minimumTokenAllowance,
  TOKEN_METHOD_TRANSFER,
  CONTRACT_METHOD_DEPLOY,
  TOKEN_METHOD_TRANSFER_FROM,
  calculateEIP1559Times,
  parseTransactionLegacy,
  getIsNativeTokenTransferred,
  getIsSwapApproveOrSwapTransaction,
  getIsSwapApproveTransaction,
  getIsSwapTransaction,
} from '.';
import buildUnserializedTransaction from './optimismTransaction';
import Engine from '../../core/Engine';
import { strings } from '../../../locales/i18n';

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  query: jest.fn(),
}));
jest.mock('../../core/Engine');
const ENGINE_MOCK = Engine as jest.MockedClass<any>;

ENGINE_MOCK.context = {
  TransactionController: {
    ethQuery: null,
  },
};

const MOCK_ADDRESS1 = '0x0001';
const MOCK_ADDRESS2 = '0x0002';
const MOCK_ADDRESS3 = '0xb794f5ea0ba39494ce839613fffba74279579268';

const UNI_TICKER = 'UNI';
const UNI_ADDRESS = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';

const MOCK_CHAIN_ID = '1';

const spyOnQueryMethod = (returnValue: string | undefined) =>
  jest.spyOn(controllerUtilsModule, 'query').mockImplementation(
    () =>
      new Promise<string | undefined>((resolve) => {
        resolve(returnValue);
      }),
  );

describe('Transactions utils :: generateTransferData', () => {
  it('generateTransferData should throw if undefined values', () => {
    expect(() => generateTransferData()).toThrow();
    expect(() => generateTransferData('transfer')).toThrow();
    expect(() =>
      generateTransferData('transfer', { toAddress: '0x0' }),
    ).toThrow();
    expect(() => generateTransferData('transfer', { amount: 1 })).toThrow();
    expect(() =>
      generateTransferData('transfer', { toAddress: '0x0', amount: 1 }),
    ).not.toThrow();
  });

  it('generateTransferData generates data correctly', () => {
    expect(
      generateTransferData('transfer', {
        toAddress: '0x56ced0d816c668d7c0bcc3fbf0ab2c6896f589a0',
        amount: 1,
      }),
    ).toEqual(
      '0xa9059cbb00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000001',
    );
  });
});

describe('Transactions utils :: decodeTransferData', () => {
  it('decodeTransferData transfer', () => {
    const [address, amount] = decodeTransferData(
      'transfer',
      '0xa9059cbb00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000001',
    );
    expect(address).toEqual('0x56ced0d816c668d7c0bcc3fbf0ab2c6896f589a0');
    expect(amount).toEqual('1');
  });

  it('decodeTransferData ERC721', () => {
    const [fromAddress, toAddress, tokenId] = decodeTransferData(
      'transferFrom',
      '0x23b872dd00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589c900000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589b400000000000000000000000000000000000000000000000000000000000004f1',
    );
    expect(fromAddress).toEqual('0x56ced0d816c668d7c0bcc3fbf0ab2c6896f589c9');
    expect(toAddress).toEqual('0x56ced0d816c668d7c0bcc3fbf0ab2c6896f589b4');
    expect(tokenId).toEqual('1265');
  });
});

describe('Transactions utils :: parseTransactionLegacy', () => {
  const totalHexValueMocked = '02';
  const commonParseTransactionParams = {
    contractExchangeRates: {
      '0x0': 0.005,
      '0x01': 0.005,
      '0x02': 0.005,
    },
    conversionRate: 1,
    currentCurrency: 'USD',
    selectedGasFee: 'average',
    multiLayerL1FeeTotal: '0x0',
    ticker: 'tBNB',
  };

  const createTransactionState = (selectedAsset: any, transaction: any) => ({
    selectedAsset,
    transaction: {
      value: '0x2',
      data: '0xa9059cbb00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000002',
      ...transaction,
    },
  });

  const createExpectedResult = ({
    totalHexValue,
    transactionTotalAmount,
    transactionTotalAmountFiat,
    transactionFee,
    onlyGas = false,
  }: {
    totalHexValue: string;
    transactionTotalAmount?: string;
    transactionTotalAmountFiat?: string;
    transactionFee?: string;
    ticker?: string;
    onlyGas?: boolean;
  }) => {
    const expectedParsedTransactionLegacy = {
      suggestedGasLimit: undefined,
      suggestedGasPrice: undefined,
      suggestedGasLimitHex: '0x0',
      suggestedGasPriceHex: '0',
      totalHex: new BN(totalHexValue),
      transactionFee,
      transactionFeeFiat: '$0',
    };
    if (onlyGas) {
      return expectedParsedTransactionLegacy;
    }
    return {
      ...expectedParsedTransactionLegacy,
      transactionTotalAmount,
      transactionTotalAmountFiat,
    };
  };
  it('parse ETH legacy transaction', () => {
    const selectedAsset = {
      isETH: true,
      address: '0x0',
      symbol: 'ETH',
      decimals: 8,
    };

    const transactionState = createTransactionState(selectedAsset, {});

    const parsedTransactionLegacy = parseTransactionLegacy({
      ...commonParseTransactionParams,
      ticker: 'ETH',
      transactionState,
    });

    const expectedResult = createExpectedResult({
      totalHexValue: totalHexValueMocked,
      transactionTotalAmount: '< 0.00001 ETH',
      transactionTotalAmountFiat: '$0',
      transactionFee: '0 ETH',
    });

    expect(parsedTransactionLegacy).toEqual(expectedResult);
  });

  it('parse non ETH legacy transaction with tokenId', () => {
    const selectedAsset = {
      isETH: false,
      address: '0x0123',
      symbol: 'BNB',
      decimals: 18,
      tokenId: 'mockedTokenId',
    };

    const transactionState = createTransactionState(selectedAsset, {});

    const parsedTransactionLegacy = parseTransactionLegacy({
      ...commonParseTransactionParams,
      ticker: selectedAsset.symbol,
      transactionState,
    });

    const expectedResult = createExpectedResult({
      totalHexValue: totalHexValueMocked,
      transactionTotalAmount: '0 BNB',
      transactionTotalAmountFiat: '$0',
      transactionFee: '0 BNB',
    });

    expect(parsedTransactionLegacy).toEqual(expectedResult);
  });

  it('parse non ETH legacy transaction', () => {
    const transactionState = createTransactionState('tBNB', {});

    const parsedTransactionLegacy = parseTransactionLegacy({
      ...commonParseTransactionParams,
      transactionState,
    });

    const expectedResult = createExpectedResult({
      totalHexValue: totalHexValueMocked,
      transactionTotalAmount: '0.2 ERC20 + 0 tBNB',
      transactionTotalAmountFiat: '0 USD',
      transactionFee: '0 tBNB',
    });

    expect(parsedTransactionLegacy).toEqual(expectedResult);
  });

  it('parse non ETH legacy transaction without data property', () => {
    const transactionState = createTransactionState('tBNB', {
      data: undefined,
    });

    const parsedTransactionLegacy = parseTransactionLegacy({
      ...commonParseTransactionParams,
      transactionState,
    });

    const expectedResult = createExpectedResult({
      totalHexValue: totalHexValueMocked,
      transactionTotalAmount: undefined,
      transactionTotalAmountFiat: undefined,
      transactionFee: '0 tBNB',
    });

    expect(parsedTransactionLegacy).toEqual(expectedResult);
  });

  it('parse legacy transaction only gas', () => {
    const selectedAsset = 'BNB';
    const transactionState = createTransactionState(selectedAsset, {});

    const parsedTransactionLegacy = parseTransactionLegacy(
      {
        ...commonParseTransactionParams,
        ticker: selectedAsset,
        transactionState,
      },
      { onlyGas: true },
    );

    const expectedResult = createExpectedResult({
      totalHexValue: totalHexValueMocked,
      transactionTotalAmount: '0 BNB',
      transactionTotalAmountFiat: '$0',
      transactionFee: '0 BNB',
      onlyGas: true,
    });

    expect(parsedTransactionLegacy).toEqual(expectedResult);
  });
});

describe('Transactions utils :: getMethodData', () => {
  it('getMethodData', async () => {
    const transferData =
      '0xa9059cbb00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000001';
    const contractData =
      '0x60a060405260046060527f48302e31000000000000000000000000000000000000000000000000000000006080526006805460008290527f48302e310000000000000000000000000000000000000000000000000000000882556100b5907ff652222313e28459528d920b65115c16c04f3efc82aaedc97be59f3f377c0d3f602060026001841615610100026000190190931692909204601f01919091048101905b8082111561017957600081556001016100a1565b505060405161094b38038061094b833981';
    const randomData = '0x987654321000000000';
    const transferFromData = '0x23b872dd0000000000000000000000000000';
    const firstMethodData = await getMethodData(transferData);
    const secondtMethodData = await getMethodData(contractData);
    const thirdMethodData = await getMethodData(transferFromData);
    const fourthMethodData = await getMethodData(randomData);
    expect(firstMethodData.name).toEqual(TOKEN_METHOD_TRANSFER);
    expect(secondtMethodData.name).toEqual(CONTRACT_METHOD_DEPLOY);
    expect(thirdMethodData.name).toEqual(TOKEN_METHOD_TRANSFER_FROM);
    expect(fourthMethodData).toEqual({});
  });
});

describe('Transactions utils :: getActionKey', () => {
  beforeEach(() => {
    jest
      .spyOn(swapsUtils, 'getSwapsContractAddress')
      .mockImplementation(() => 'SWAPS_CONTRACT_ADDRESS');
  });

  it('should be "Sent Yourself Ether"', async () => {
    spyOnQueryMethod(undefined);
    const tx = {
      txParams: {
        from: MOCK_ADDRESS1,
        to: MOCK_ADDRESS1,
      },
    };
    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      undefined,
      MOCK_CHAIN_ID,
    );
    expect(result).toBe(strings('transactions.self_sent_ether'));
  });

  it('should be labeled as "Sent Yourself UNI"', async () => {
    spyOnQueryMethod(undefined);
    const tx = {
      txParams: {
        from: MOCK_ADDRESS1,
        to: MOCK_ADDRESS1,
      },
    };
    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      UNI_TICKER,
      MOCK_CHAIN_ID,
    );
    expect(result).toBe(
      strings('transactions.self_sent_unit', { unit: UNI_TICKER }),
    );
  });

  it('should be labeled as "Sent Ether"', async () => {
    spyOnQueryMethod(undefined);
    const tx = {
      txParams: {
        from: MOCK_ADDRESS1,
        to: MOCK_ADDRESS2,
      },
    };
    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      undefined,
      MOCK_CHAIN_ID,
    );
    expect(result).toBe(strings('transactions.sent_ether'));
  });

  it('should be labeled as "Sent UNI"', async () => {
    spyOnQueryMethod(undefined);

    const tx = {
      txParams: {
        from: MOCK_ADDRESS1,
        to: MOCK_ADDRESS2,
      },
    };
    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      UNI_TICKER,
      MOCK_CHAIN_ID,
    );
    expect(result).toBe(
      strings('transactions.sent_unit', { unit: UNI_TICKER }),
    );
  });

  it('should be labeled as "Received Ether"', async () => {
    spyOnQueryMethod(undefined);

    const tx = {
      txParams: {
        from: MOCK_ADDRESS1,
        to: MOCK_ADDRESS2,
      },
    };
    const result = await getActionKey(
      tx,
      MOCK_ADDRESS2,
      undefined,
      MOCK_CHAIN_ID,
    );
    expect(result).toBe(strings('transactions.received_ether'));
  });

  it('should be labeled as "Received UNI"', async () => {
    spyOnQueryMethod(undefined);
    const tx = {
      txParams: {
        from: MOCK_ADDRESS1,
        to: MOCK_ADDRESS2,
      },
    };
    const result = await getActionKey(
      tx,
      MOCK_ADDRESS2,
      UNI_TICKER,
      MOCK_CHAIN_ID,
    );
    expect(result).toBe(
      strings('transactions.received_unit', { unit: UNI_TICKER }),
    );
  });

  it('should be labeled as "Smart Contract Interaction" if the receiver is a smart contract', async () => {
    spyOnQueryMethod(UNI_ADDRESS);
    const tx = {
      txParams: {
        to: UNI_ADDRESS,
      },
    };
    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      undefined,
      MOCK_CHAIN_ID,
    );
    expect(result).toBe(strings('transactions.smart_contract_interaction'));
  });

  it('should be labeled as "Smart Contract Interaction" if the tx is to a smart contract', async () => {
    spyOnQueryMethod(UNI_ADDRESS);
    const tx = {
      txParams: {
        to: UNI_ADDRESS,
      },
      toSmartContract: true,
    };
    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      undefined,
      MOCK_CHAIN_ID,
    );
    expect(result).toBe(strings('transactions.smart_contract_interaction'));
  });

  it('should be labeled as "Contract Deployment" if the tx has no receiver', async () => {
    spyOnQueryMethod(UNI_ADDRESS);
    const tx = {
      txParams: {},
      toSmartContract: true,
    };
    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      undefined,
      MOCK_CHAIN_ID,
    );
    expect(result).toBe(strings('transactions.contract_deploy'));
  });
});

describe('Transactions utils :: generateTxWithNewTokenAllowance', () => {
  const mockDecimal = 18;
  const mockTx = {
    txParams: {
      from: MOCK_ADDRESS1,
      to: MOCK_ADDRESS3,
    },
  };

  const decodeAmount = (data: string): string => {
    const decode = decodeApproveData(data);
    return BNToHex(decode.encodedAmount);
  };

  it('should encode a integer correctly and return a new transaction', () => {
    const newTx = generateTxWithNewTokenAllowance(
      '500',
      mockDecimal,
      MOCK_ADDRESS3,
      mockTx,
    );
    expect(newTx.data).toBeTruthy();

    const expectedHexValue =
      '0x00000000000000000000000000000000000000000000001b1ae4d6e2ef500000';
    const decodedHexValue = decodeAmount(newTx.data);
    expect(expectedHexValue).toBe(decodedHexValue);
  });

  it('should encode a decimal correctly and return a new transaction', () => {
    const newTx = generateTxWithNewTokenAllowance(
      '100.15',
      mockDecimal,
      MOCK_ADDRESS3,
      mockTx,
    );
    expect(newTx.data).toBeTruthy();

    const expectedHexValue =
      '0x0000000000000000000000000000000000000000000000056ddc4661ef5f0000';
    const decodedHexValue = decodeAmount(newTx.data);
    expect(expectedHexValue).toBe(decodedHexValue);
  });

  it('should encode the maximum amount uint256 can store correctly and return a new transaction', () => {
    const newTx = generateTxWithNewTokenAllowance(
      UINT256_BN_MAX_VALUE,
      0,
      MOCK_ADDRESS3,
      mockTx,
    );
    expect(newTx.data).toBeTruthy();

    const expectedHexValue =
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
    const decodedHexValue = decodeAmount(newTx.data);
    expect(expectedHexValue).toBe(decodedHexValue);
  });
  it('should encode the minimum amount uint256 can store correctly and return a new transaction', () => {
    const minAmount = '0.000000000000000001';
    const newTx = generateTxWithNewTokenAllowance(
      minAmount,
      mockDecimal,
      MOCK_ADDRESS3,
      mockTx,
    );
    expect(newTx.data).toBeTruthy();

    const expectedHexValue =
      '0x0000000000000000000000000000000000000000000000000000000000000001';
    const decodedHexValue = decodeAmount(newTx.data);
    expect(expectedHexValue).toBe(decodedHexValue);
  });
});

describe('Transactions utils :: minimumTokenAllowance', () => {
  it('should show up to 18 decimals', () => {
    const result = minimumTokenAllowance(18);
    const expectedResult = '0.000000000000000001';
    expect(result).toBe(expectedResult);
  });
  it('should show up to 5 decimals', () => {
    const result = minimumTokenAllowance(5);
    const expectedResult = '0.00001';
    expect(result).toBe(expectedResult);
  });
  it('should show up to 1 decimals', () => {
    const result = minimumTokenAllowance(1);
    const expectedResult = '0.1';
    expect(result).toBe(expectedResult);
  });
  it('should show 1', () => {
    const result = minimumTokenAllowance(0);
    const expectedResult = '1';
    expect(result).toBe(expectedResult);
  });
  it('should throw an error for negative values', () => {
    expect(() => {
      minimumTokenAllowance(-1);
    }).toThrow(NEGATIVE_TOKEN_DECIMALS);
  });
});

describe('Transaction utils :: calculateEIP1559Times', () => {
  const gasFeeEstimates = {
    baseFeeTrend: 'down',
    estimatedBaseFee: '2.420440144',
    high: {
      maxWaitTimeEstimate: 60000,
      minWaitTimeEstimate: 15000,
      suggestedMaxFeePerGas: '6.114748245',
      suggestedMaxPriorityFeePerGas: '2',
    },
    historicalBaseFeeRange: ['2.420440144', '9.121942855'],
    historicalPriorityFeeRange: ['0.006333568', '2997.107725'],
    latestPriorityFeeRange: ['0.039979856', '5'],
    low: {
      maxWaitTimeEstimate: 30000,
      minWaitTimeEstimate: 15000,
      suggestedMaxFeePerGas: '3.420440144',
      suggestedMaxPriorityFeePerGas: '1',
    },
    medium: {
      maxWaitTimeEstimate: 45000,
      minWaitTimeEstimate: 15000,
      suggestedMaxFeePerGas: '4.767594195',
      suggestedMaxPriorityFeePerGas: '1.5',
    },
    networkCongestion: 0,
    priorityFeeTrend: 'level',
  };

  it('returns data for very large gas fees estimates', () => {
    const EIP1559Times = calculateEIP1559Times({
      suggestedMaxFeePerGas: 1000000,
      suggestedMaxPriorityFeePerGas: 1000000,
      gasFeeEstimates,
      selectedOption: 'medium',
      recommended: undefined,
    });
    expect(EIP1559Times).toStrictEqual({
      timeEstimate: 'Likely in  15 seconds',
      timeEstimateColor: 'orange',
      timeEstimateId: 'very_likely',
    });
  });

  it('returns data for aggresive gas fees estimates', () => {
    const EIP1559Times = calculateEIP1559Times({
      suggestedMaxFeePerGas: 5.320770797,
      suggestedMaxPriorityFeePerGas: 2,
      gasFeeEstimates,
      selectedOption: 'high',
      recommended: undefined,
    });
    expect(EIP1559Times).toStrictEqual({
      timeEstimate: 'Likely in  15 seconds',
      timeEstimateColor: 'orange',
      timeEstimateId: 'very_likely',
    });
  });

  it('returns data for market gas fees estimates', () => {
    const EIP1559Times = calculateEIP1559Times({
      suggestedMaxFeePerGas: 4.310899437,
      suggestedMaxPriorityFeePerGas: 1.5,
      gasFeeEstimates,
      selectedOption: 'medium',
      recommended: undefined,
    });
    expect(EIP1559Times).toStrictEqual({
      timeEstimate: 'Likely in < 30 seconds',
      timeEstimateColor: 'green',
      timeEstimateId: 'likely',
    });
  });

  it('returns data for low gas fees estimates', () => {
    const EIP1559Times = calculateEIP1559Times({
      suggestedMaxFeePerGas: 2.667821471,
      suggestedMaxPriorityFeePerGas: 1,
      gasFeeEstimates,
      selectedOption: 'low',
      recommended: undefined,
    });
    expect(EIP1559Times).toStrictEqual({
      timeEstimate: 'Maybe in 30 seconds',
      timeEstimateColor: 'red',
      timeEstimateId: 'maybe',
    });
  });
});

describe('Transactions utils :: buildUnserializedTransaction', () => {
  it('returns a transaction that can be serialized and fed to an Optimism smart contract', () => {
    const unserializedTransaction = buildUnserializedTransaction({
      txParams: {
        nonce: '0x0',
        gasPrice: `0x${new BN('100').toString(16)}`,
        gas: `0x${new BN('21000').toString(16)}`,
        to: '0x0000000000000000000000000000000000000000',
        value: `0x${new BN('10000000000000').toString(16)}`,
        data: '0x0',
      },
      chainId: '10',
      metamaskNetworkId: '10',
    });
    expect(unserializedTransaction.toJSON()).toMatchObject({
      nonce: '0x0',
      gasPrice: '0x64',
      gasLimit: '0x5208',
      to: '0x0000000000000000000000000000000000000000',
      value: '0x9184e72a000',
      data: '0x00',
    });
  });
});

const dappTxMeta = {
  chainId: '0x1',
  origin: 'pancakeswap.finance',
  transaction: {
    from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
    data: '0x5ae401dc0000000000000000000000000000000000000000000000000000000065e8dac400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d600000000000000000000000007865c6e87b9f70255377e024ace6630c1eaa37f00000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000c5fe6ef47965741f6f7a4734bf784bf3ae3f245200000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000000000000f666eed80000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    gas: '0x2e7b1',
    nonce: '0xeb',
    to: '0x9a489505a00ce272eaa5e07dba6491314cae3796',
    value: '0x38d7ea4c68000',
    maxFeePerGas: '0x59682f0a',
    maxPriorityFeePerGas: '0x59682f00',
  },
};
const sendEthTxMeta = {
  chainId: '0x1',
  origin: 'MetaMask Mobile',
  transaction: {
    from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
    data: undefined,
    gas: '0x5208',
    nonce: '0xf3',
    to: '0xdc738206f559bdae106894a62876a119e470aee2',
    value: '0x2386f26fc10000',
    maxFeePerGas: '0x59682f0a',
    maxPriorityFeePerGas: '0x59682f00',
    estimatedBaseFee: '0x7',
  },
};
const sendERC20TxMeta = {
  chainId: '0x1',
  origin: 'MetaMask Mobile',
  transaction: {
    from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
    data: '0xa9059cbb000000000000000000000000dc738206f559bdae106894a62876a119e470aee20000000000000000000000000000000000000000000000000000000005f5e100',
    gas: '0x10a3e',
    nonce: '0xf4',
    to: '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
    value: '0x0',
    maxFeePerGas: '0x59682f0b',
    maxPriorityFeePerGas: '0x59682f00',
    estimatedBaseFee: '0x8',
  },
};

const swapFlowApproveERC20TxMeta = {
  chainId: '0x1',
  origin: process.env.MM_FOX_CODE,
  transaction: {
    from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
    data: '0x095ea7b3000000000000000000000000881d40237659c251811cec9c364ef91dc08d300c00000000000000000000000000000000000000000000000000000000000f4240',
    gas: '0xdd87',
    nonce: '0x3c',
    to: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    value: '0x0',
    maxFeePerGas: '0x19dd8c2510',
    maxPriorityFeePerGas: '0x9e3311',
    estimatedBaseFee: '0xf36aa15e1',
  },
};
const swapFlowSwapERC20TxMeta = {
  chainId: '0x1',
  origin: process.env.MM_FOX_CODE,
  transaction: {
    from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
    data: '0x5f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563546656544796e616d6963000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000e3cb0338a1e400000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000020d440d83ed000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000c80502b1c5000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000e5cdc5e9b7a80000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000140000000000000003b5dc1003926a168c11a816e10c13977f75f488bfffe88e4ab4991fe00000000000000000000000000000000000000000000000000bd',
    gas: '0x3dad5',
    nonce: '0x3e',
    to: '0x881d40237659c251811cec9c364ef91dc08d300c',
    value: '0x0',
    maxFeePerGas: '0x1bbbdf536e',
    maxPriorityFeePerGas: '0x120a5d1',
    estimatedBaseFee: '0x104fbb752f',
  },
};
const swapFlowSwapEthTxMeta = {
  chainId: '0x1',
  origin: process.env.MM_FOX_CODE,
  transaction: {
    from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
    data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563546656544796e616d69630000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000023375dc15608000000000000000000000000000000000000000000000000000000000002477ac5000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000004f94ae6af800000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000c80502b1c500000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000023375dc15608000000000000000000000000000000000000000000000000000000000002477ac40000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000180000000000000003b6d0340b4e16d0168e52d35cacd2c6185b44281ec28c9dcab4991fe000000000000000000000000000000000000000000000000001e',
    gas: '0x333c5',
    nonce: '0x3c',
    to: '0x881d40237659c251811cec9c364ef91dc08d300c',
    value: '0x2386f26fc10000',
    maxFeePerGas: '0x1b6bf7e1c3',
    maxPriorityFeePerGas: '0x200a3b7',
    estimatedBaseFee: '0x1020371570',
  },
};

describe('Transactions utils :: getIsSwapApproveOrSwapTransaction', () => {
  it('returns true if the transaction is an approve tx in the swap flow for ERC20 from token', () => {
    const result = getIsSwapApproveOrSwapTransaction(
      swapFlowApproveERC20TxMeta.transaction.data,
      swapFlowApproveERC20TxMeta.origin,
      swapFlowApproveERC20TxMeta.transaction.to,
      swapFlowApproveERC20TxMeta.chainId,
    );
    expect(result).toBe(true);
  });
  it('returns true if the transaction is a swap tx in the swap flow for ERC20 from token', () => {
    const result = getIsSwapApproveOrSwapTransaction(
      swapFlowSwapERC20TxMeta.transaction.data,
      swapFlowSwapERC20TxMeta.origin,
      swapFlowSwapERC20TxMeta.transaction.to,
      swapFlowSwapERC20TxMeta.chainId,
    );
    expect(result).toBe(true);
  });
  it('returns true if the transaction is a swap tx in the swap flow for ETH from token', () => {
    const result = getIsSwapApproveOrSwapTransaction(
      swapFlowSwapEthTxMeta.transaction.data,
      swapFlowSwapEthTxMeta.origin,
      swapFlowSwapEthTxMeta.transaction.to,
      swapFlowSwapEthTxMeta.chainId,
    );
    expect(result).toBe(true);
  });
  it('returns false if the transaction is a send ERC20 tx', () => {
    const result = getIsSwapApproveOrSwapTransaction(
      sendERC20TxMeta.transaction.data,
      sendERC20TxMeta.origin,
      sendERC20TxMeta.transaction.to,
      sendERC20TxMeta.chainId,
    );
    expect(result).toBe(false);
  });
  it('returns false if the transaction is a send ETH tx', () => {
    const result = getIsSwapApproveOrSwapTransaction(
      sendEthTxMeta.transaction.data,
      sendEthTxMeta.origin,
      sendEthTxMeta.transaction.to,
      sendEthTxMeta.chainId,
    );
    expect(result).toBe(false);
  });
  it('returns false if the transaction is a dapp tx', () => {
    const result = getIsSwapApproveOrSwapTransaction(
      dappTxMeta.transaction.data,
      dappTxMeta.origin,
      dappTxMeta.transaction.to,
      dappTxMeta.chainId,
    );
    expect(result).toBe(false);
  });
});

describe('Transactions utils :: getIsSwapApproveTransaction', () => {
  it('returns true if the transaction is an approve ERC20 tx in the swap flow', () => {
    const result = getIsSwapApproveTransaction(
      swapFlowApproveERC20TxMeta.transaction.data,
      swapFlowApproveERC20TxMeta.origin,
      swapFlowApproveERC20TxMeta.transaction.to,
      swapFlowApproveERC20TxMeta.chainId,
    );
    expect(result).toBe(true);
  });
  it('returns false if the transaction is a swap ERC20 tx in the swap flow', () => {
    const result = getIsSwapApproveTransaction(
      swapFlowSwapERC20TxMeta.transaction.data,
      swapFlowSwapERC20TxMeta.origin,
      swapFlowSwapERC20TxMeta.transaction.to,
      swapFlowSwapERC20TxMeta.chainId,
    );
    expect(result).toBe(false);
  });
  it('returns false if the transaction is a send ETH tx', () => {
    const result = getIsSwapApproveTransaction(
      sendEthTxMeta.transaction.data,
      sendEthTxMeta.origin,
      sendEthTxMeta.transaction.to,
      sendEthTxMeta.chainId,
    );
    expect(result).toBe(false);
  });
  it('returns false if the transaction is a send ERC20 tx', () => {
    const result = getIsSwapApproveTransaction(
      sendERC20TxMeta.transaction.data,
      sendERC20TxMeta.origin,
      sendERC20TxMeta.transaction.to,
      sendERC20TxMeta.chainId,
    );
    expect(result).toBe(false);
  });
  it('returns false if the transaction is a dapp tx', () => {
    const result = getIsSwapApproveTransaction(
      dappTxMeta.transaction.data,
      dappTxMeta.origin,
      dappTxMeta.transaction.to,
      dappTxMeta.chainId,
    );
    expect(result).toBe(false);
  });
});

describe('Transactions utils :: getIsSwapTransaction', () => {
  it('returns false if the transaction is an approve ERC20 tx in the swap flow', () => {
    const result = getIsSwapTransaction(
      swapFlowApproveERC20TxMeta.transaction.data,
      swapFlowApproveERC20TxMeta.origin,
      swapFlowApproveERC20TxMeta.transaction.to,
      swapFlowApproveERC20TxMeta.chainId,
    );
    expect(result).toBe(false);
  });
  it('returns true if the transaction is a swap ERC20 tx in the swap flow', () => {
    const result = getIsSwapTransaction(
      swapFlowSwapERC20TxMeta.transaction.data,
      swapFlowSwapERC20TxMeta.origin,
      swapFlowSwapERC20TxMeta.transaction.to,
      swapFlowSwapERC20TxMeta.chainId,
    );
    expect(result).toBe(true);
  });
  it('returns true if the transaction is a swap ETH tx in the swap flow', () => {
    const result = getIsSwapTransaction(
      swapFlowSwapEthTxMeta.transaction.data,
      swapFlowSwapEthTxMeta.origin,
      swapFlowSwapEthTxMeta.transaction.to,
      swapFlowSwapEthTxMeta.chainId,
    );
    expect(result).toBe(true);
  });
  it('returns false if the transaction is a send tx', () => {
    const result = getIsSwapTransaction(
      sendEthTxMeta.transaction.data,
      sendEthTxMeta.origin,
      sendEthTxMeta.transaction.to,
      sendEthTxMeta.chainId,
    );
    expect(result).toBe(false);
  });
  it('returns false if the transaction is a dapp tx', () => {
    const result = getIsSwapTransaction(
      dappTxMeta.transaction.data,
      dappTxMeta.origin,
      dappTxMeta.transaction.to,
      dappTxMeta.chainId,
    );
    expect(result).toBe(false);
  });
});

describe('Transactions utils :: getIsNativeTokenTransferred', () => {
  it('should return true if the transaction does not have a value of 0x0', () => {
    const tx = {
      nonce: '0x0',
      gasPrice: `0x${new BN('100').toString(16)}`,
      gas: `0x${new BN('21000').toString(16)}`,
      to: '0x0000000000000000000000000000000000000000',
      value: `0x${new BN('10000000000000').toString(16)}`,
      data: '0x0',
    };
    const result = getIsNativeTokenTransferred(tx);
    expect(result).toBe(true);
  });
  it('should return false if the transaction has a value of 0x0', () => {
    const tx = {
      nonce: '0x0',
      gasPrice: `0x${new BN('100').toString(16)}`,
      gas: `0x${new BN('21000').toString(16)}`,
      to: '0x0000000000000000000000000000000000000000',
      value: `0x0`,
      data: '0x0',
    };
    const result = getIsNativeTokenTransferred(tx);
    expect(result).toBe(false);
  });
});
