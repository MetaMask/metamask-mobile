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
} from '.';
import { buildUnserializedTransaction } from './optimismTransaction';
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
      transaction: {
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
      transaction: {
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
      transaction: {
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
      transaction: {
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
      transaction: {
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
      transaction: {
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
      transaction: {
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
      transaction: {
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
      transaction: {},
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
    transaction: {
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

  it('should encode the maximun amount uint256 can store correctly and return a new transaction', () => {
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
