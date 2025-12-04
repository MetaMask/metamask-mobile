import { swapsUtils } from '@metamask/swaps-controller';
import BN from 'bnjs4';

/* eslint-disable-next-line import/no-namespace */
import * as controllerUtilsModule from '@metamask/controller-utils';
import { ERC721, ERC1155, ORIGIN_METAMASK } from '@metamask/controller-utils';

import { handleMethodData } from '../../util/transaction-controller';

import { BNToHex } from '../number';
import { UINT256_BN_MAX_VALUE } from '../../constants/transaction';
import { NEGATIVE_TOKEN_DECIMALS } from '../../constants/error';
import {
  generateTransferData,
  calcTokenAmount,
  decodeApproveData,
  decodeTransferData,
  getMethodData,
  getActionKey,
  generateTxWithNewTokenAllowance,
  minimumTokenAllowance,
  TOKEN_METHOD_TRANSFER,
  CONTRACT_METHOD_DEPLOY,
  TOKEN_METHOD_TRANSFER_FROM,
  TOKEN_METHOD_MINT,
  TRANSFER_FROM_ACTION_KEY,
  SAFE_MINT_SIGNATURE,
  MINT_SIGNATURE,
  MINT_TO_SIGNATURE,
  SAFE_MINT_WITH_DATA,
  calculateEIP1559Times,
  parseTransactionLegacy,
  getIsNativeTokenTransferred,
  getIsSwapApproveOrSwapTransaction,
  getIsSwapApproveTransaction,
  getIsSwapTransaction,
  INCREASE_ALLOWANCE_SIGNATURE,
  TOKEN_METHOD_INCREASE_ALLOWANCE,
  getTransactionActionKey,
  generateApprovalData,
  getFourByteSignature,
  APPROVE_FUNCTION_SIGNATURE,
  isApprovalTransaction,
  SET_APPROVAL_FOR_ALL_SIGNATURE,
  TOKEN_METHOD_SET_APPROVAL_FOR_ALL,
  TOKEN_METHOD_APPROVE,
  getTransactionReviewActionKey,
  getTransactionById,
  UPGRADE_SMART_ACCOUNT_ACTION_KEY,
  DOWNGRADE_SMART_ACCOUNT_ACTION_KEY,
  isLegacyTransaction,
  getTokenAddressParam,
  getTokenValueParamAsHex,
  getTokenValueParam,
  getTokenValue,
  isNFTTokenStandard,
  calcTokenValue,
  getTransactionToName,
  addAccountTimeFlagFilter,
  getNormalizedTxState,
  getActiveTabUrl,
  getTicker,
  getEther,
  validateTransactionActionBalance,
  isSmartContractAddress,
  isTransactionIncomplete,
} from '.';
import Engine from '../../core/Engine';
import { strings } from '../../../locales/i18n';
import { EIP_7702_REVOKE_ADDRESS } from '../../components/Views/confirmations/hooks/7702/useEIP7702Accounts';
import {
  TransactionType,
  TransactionEnvelopeType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { Provider } from '@metamask/network-controller';
import BigNumber from 'bignumber.js';

interface AddressBookEntry {
  name: string;
}

interface AddressBook {
  [chainId: string]: {
    [address: string]: AddressBookEntry;
  };
}

interface InternalAccountMetadata {
  name: string;
}

interface InternalAccount {
  address: string;
  metadata: InternalAccountMetadata;
}

interface TransactionToNameConfig {
  addressBook: AddressBook;
  chainId: string;
  toAddress: string;
  internalAccounts: InternalAccount[];
  ensRecipient?: string;
}

interface TransactionWithTime {
  time: number;
}

interface TransactionStateData {
  transaction?: {
    id: string;
    transaction: {
      value: string;
      gasPrice: string;
    };
  };
}

interface BrowserTab {
  id: string;
  url: string;
}

interface BrowserState {
  browser?: {
    activeTab: string | null;
    tabs: BrowserTab[];
  };
}

interface TransactionData {
  from: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  gas: string;
  value: string;
  type?: string;
}

interface TransactionForBalance {
  transaction: TransactionData;
}

interface AccountBalance {
  balance: string;
}

interface AccountsMap {
  [address: string]: AccountBalance;
}

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  query: jest.fn(),
}));
jest.mock('../../core/Engine');
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ENGINE_MOCK = Engine as jest.MockedClass<any>;

jest.mock('../../util/transaction-controller');

const MOCK_ADDRESS1 = '0x0001';
const MOCK_ADDRESS2 = '0x0002';
const MOCK_ADDRESS3 = '0xb794f5ea0ba39494ce839613fffba74279579268';

const UNI_TICKER = 'UNI';
const UNI_ADDRESS = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';

const MOCK_CHAIN_ID = '1';
const MOCK_NETWORK_CLIENT_ID = 'testNetworkClientId';

ENGINE_MOCK.context = {
  NetworkController: {
    findNetworkClientIdByChainId: () => MOCK_NETWORK_CLIENT_ID,
    getNetworkClientById: () => ({
      provider: {} as Provider,
    }),
  },
  TokenListController: {
    state: {
      tokensChainsCache: {
        '0x1': {
          data: [],
        },
      },
    },
  },
};

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

describe('Transactions utils :: calcTokenAmount', () => {
  it.each([
    // number values
    [0, 5, '0'],
    [123456, undefined, '123456'],
    [123456, 5, '1.23456'],
    [123456, 6, '0.123456'],
    // Do not delete the following test. Testing decimal = 36 is important because it has broken
    // BigNumber#div in the past when the value that was passed into it was not a BigNumber.
    [123456, 36, '1.23456e-31'],
    [3000123456789678, 6, '3000123456.789678'],
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    [3000123456789123456789123456789, 3, '3.0001234567891233e+27'], // expected precision lost
    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
    [3000123456789123456789123456789, 6, '3.0001234567891233e+24'], // expected precision lost
    // string values
    ['0', 5, '0'],
    ['123456', undefined, '123456'],
    ['123456', 5, '1.23456'],
    ['123456', 6, '0.123456'],
    ['3000123456789678', 6, '3000123456.789678'],
    [
      '3000123456789123456789123456789',
      3,
      '3.000123456789123456789123456789e+27',
    ],
    [
      '3000123456789123456789123456789',
      6,
      '3.000123456789123456789123456789e+24',
    ],
    // BigNumber values
    [new BigNumber('3000123456789678'), 6, '3000123456.789678'],
    [
      new BigNumber('3000123456789123456789123456789'),
      6,
      '3.000123456789123456789123456789e+24',
    ],
  ])(
    'returns the value %s divided by 10^%s = %s',
    (value, decimals, expected) => {
      expect(calcTokenAmount(value, decimals).toString()).toBe(expected);
    },
  );
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

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    const invalidData = '0x';
    const transferData =
      '0xa9059cbb00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a00000000000000000000000000000000000000000000000000000000000000001';
    const deployData =
      '0x60a060405260046060527f48302e31000000000000000000000000000000000000000000000000000000006080526006805460008290527f48302e310000000000000000000000000000000000000000000000000000000882556100b5907ff652222313e28459528d920b65115c16c04f3efc82aaedc97be59f3f377c0d3f602060026001841615610100026000190190931692909204601f01919091048101905b8082111561017957600081556001016100a1565b505060405161094b38038061094b833981';
    const randomData = '0x987654321000000000';
    const transferFromData = '0x23b872dd0000000000000000000000000000';
    const increaseAllowanceDataMock = `${INCREASE_ALLOWANCE_SIGNATURE}0000000000000000000000000000`;
    const setApprovalForAllDataMock = `${SET_APPROVAL_FOR_ALL_SIGNATURE}0000000000000000000000000000`;
    const approveDataMock = `${APPROVE_FUNCTION_SIGNATURE}000000000000000000000000`;
    const invalidMethodData = await getMethodData(
      invalidData,
      MOCK_NETWORK_CLIENT_ID,
    );
    const transferMethodData = await getMethodData(
      transferData,
      MOCK_NETWORK_CLIENT_ID,
    );
    const deployMethodData = await getMethodData(
      deployData,
      MOCK_NETWORK_CLIENT_ID,
    );
    const transferFromMethodData = await getMethodData(
      transferFromData,
      MOCK_NETWORK_CLIENT_ID,
    );
    const randomMethodData = await getMethodData(
      randomData,
      MOCK_NETWORK_CLIENT_ID,
    );
    const approvalMethodData = await getMethodData(
      approveDataMock,
      MOCK_NETWORK_CLIENT_ID,
    );
    const increaseAllowanceMethodData = await getMethodData(
      increaseAllowanceDataMock,
      MOCK_NETWORK_CLIENT_ID,
    );
    const setApprovalForAllMethodData = await getMethodData(
      setApprovalForAllDataMock,
      MOCK_NETWORK_CLIENT_ID,
    );
    expect(invalidMethodData).toEqual({});
    expect(transferMethodData.name).toEqual(TOKEN_METHOD_TRANSFER);
    expect(deployMethodData.name).toEqual(CONTRACT_METHOD_DEPLOY);
    expect(transferFromMethodData.name).toEqual(TOKEN_METHOD_TRANSFER_FROM);
    expect(randomMethodData).toEqual({});
    expect(approvalMethodData.name).toEqual(TOKEN_METHOD_APPROVE);
    expect(increaseAllowanceMethodData.name).toEqual(
      TOKEN_METHOD_INCREASE_ALLOWANCE,
    );
    expect(setApprovalForAllMethodData.name).toEqual(
      TOKEN_METHOD_SET_APPROVAL_FOR_ALL,
    );
  });

  it('returns mint for safeMint signature', async () => {
    const safeMintData = `${SAFE_MINT_SIGNATURE}0000000000000000000000000000000000000000000000000000000000000001`;

    const result = await getMethodData(safeMintData, MOCK_NETWORK_CLIENT_ID);

    expect(result.name).toEqual(TOKEN_METHOD_MINT);
  });

  it('returns mint for mint signature', async () => {
    const mintData = `${MINT_SIGNATURE}0000000000000000000000000000000000000000000000000000000000000001`;

    const result = await getMethodData(mintData, MOCK_NETWORK_CLIENT_ID);

    expect(result.name).toEqual(TOKEN_METHOD_MINT);
  });

  it('returns mint for mintTo signature', async () => {
    const mintToData = `${MINT_TO_SIGNATURE}000000000000000000000000abcdef1234567890abcdef1234567890abcdef12`;

    const result = await getMethodData(mintToData, MOCK_NETWORK_CLIENT_ID);

    expect(result.name).toEqual(TOKEN_METHOD_MINT);
  });

  it('returns mint for safeMintWithData signature', async () => {
    const safeMintWithDataData = `${SAFE_MINT_WITH_DATA}0000000000000000000000000000000000000000000000000000000000000001`;

    const result = await getMethodData(
      safeMintWithDataData,
      MOCK_NETWORK_CLIENT_ID,
    );

    expect(result.name).toEqual(TOKEN_METHOD_MINT);
  });

  it('calls handleMethodData with the correct data', async () => {
    (handleMethodData as jest.Mock).mockResolvedValue({
      parsedRegistryMethod: { name: TOKEN_METHOD_TRANSFER },
    });
    const transferData =
      '0xa9059cbb00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a';
    await getMethodData(transferData, MOCK_NETWORK_CLIENT_ID);
    expect(handleMethodData).toHaveBeenCalledWith(
      '0x98765432',
      MOCK_NETWORK_CLIENT_ID,
    );
  });

  it('calls handleMethodData with normalized 4-byte data', async () => {
    const transferData =
      '0xA9059CBB00000000000000000000000056ced0d816c668d7c0bcc3fbf0ab2c6896f589a';
    const result = await getMethodData(transferData, MOCK_NETWORK_CLIENT_ID);

    expect(result.name).toStrictEqual(TOKEN_METHOD_TRANSFER);
  });
});

describe('Transactions utils :: isTransactionIncomplete', () => {
  it.each([
    'submitted',
    'approved',
    'unapproved',
    'pending',
    'cancelled',
    'rejected',
    'failed',
  ])('returns true for %s status', (status) => {
    const result = isTransactionIncomplete(status);

    expect(result).toBe(true);
  });

  it.each([
    ['confirmed', 'confirmed'],
    ['undefined', undefined],
    ['empty string', ''],
    ['unknown', 'unknown_status'],
  ])('returns false for %s status', (_description, status) => {
    const result = isTransactionIncomplete(status);

    expect(result).toBe(false);
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

  it.each([
    'pending',
    'submitted',
    'approved',
    'cancelled',
    'rejected',
    'failed',
  ])('returns "Send Ether" for %s transactions', async (status) => {
    spyOnQueryMethod(undefined);
    const tx = {
      txParams: {
        from: MOCK_ADDRESS1,
        to: MOCK_ADDRESS2,
      },
      status,
    };

    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      undefined,
      MOCK_CHAIN_ID,
    );

    expect(result).toBe(strings('transactions.send_ether'));
  });

  it.each([
    'pending',
    'submitted',
    'approved',
    'cancelled',
    'rejected',
    'failed',
  ])('returns "Send UNI" for %s transactions with ticker', async (status) => {
    spyOnQueryMethod(undefined);
    const tx = {
      txParams: {
        from: MOCK_ADDRESS1,
        to: MOCK_ADDRESS2,
      },
      status,
    };

    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      UNI_TICKER,
      MOCK_CHAIN_ID,
    );

    expect(result).toBe(
      strings('transactions.send_unit', { unit: UNI_TICKER }),
    );
  });

  it('returns "Sent Ether" for confirmed transactions', async () => {
    spyOnQueryMethod(undefined);
    const tx = {
      txParams: {
        from: MOCK_ADDRESS1,
        to: MOCK_ADDRESS2,
      },
      status: 'confirmed',
    };

    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      undefined,
      MOCK_CHAIN_ID,
    );

    expect(result).toBe(strings('transactions.sent_ether'));
  });

  it('returns "Sent UNI" for confirmed transactions with ticker', async () => {
    spyOnQueryMethod(undefined);
    const tx = {
      txParams: {
        from: MOCK_ADDRESS1,
        to: MOCK_ADDRESS2,
      },
      status: 'confirmed',
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

  it('returns "Sent Ether" when status is undefined (defaults to completed)', async () => {
    spyOnQueryMethod(undefined);
    const tx = {
      txParams: {
        from: MOCK_ADDRESS1,
        to: MOCK_ADDRESS2,
      },
      // status intentionally not provided
    };

    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      undefined,
      MOCK_CHAIN_ID,
    );

    expect(result).toBe(strings('transactions.sent_ether'));
  });

  it('returns "Sent Collectible" for tokenMethodTransferFrom type when user is sender', async () => {
    spyOnQueryMethod(undefined);
    const tx = {
      type: TransactionType.tokenMethodTransferFrom,
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

    expect(result).toBe(strings('transactions.sent_collectible'));
  });

  it('returns "Received Collectible" for tokenMethodTransferFrom type when user is receiver', async () => {
    spyOnQueryMethod(undefined);
    const tx = {
      type: TransactionType.tokenMethodTransferFrom,
      txParams: {
        from: MOCK_ADDRESS2,
        to: MOCK_ADDRESS1,
      },
    };

    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      undefined,
      MOCK_CHAIN_ID,
    );

    expect(result).toBe(strings('transactions.received_collectible'));
  });

  it('returns "Sent Collectible" for tokenMethodSafeTransferFrom type when user is sender', async () => {
    spyOnQueryMethod(undefined);
    const tx = {
      type: TransactionType.tokenMethodSafeTransferFrom,
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

    expect(result).toBe(strings('transactions.sent_collectible'));
  });

  it('returns "Received Collectible" for tokenMethodSafeTransferFrom type when user is receiver', async () => {
    spyOnQueryMethod(undefined);
    const tx = {
      type: TransactionType.tokenMethodSafeTransferFrom,
      txParams: {
        from: MOCK_ADDRESS2,
        to: MOCK_ADDRESS1,
      },
    };

    const result = await getActionKey(
      tx,
      MOCK_ADDRESS1,
      undefined,
      MOCK_CHAIN_ID,
    );

    expect(result).toBe(strings('transactions.received_collectible'));
  });

  it('decodes recipient from ERC20 transferFrom transaction data', async () => {
    spyOnQueryMethod(undefined);
    const sender = '0x1440ec793ae50fa046b95bfeca5af475b6003f9e';
    const recipient = '0x77648f1407986479fb1fa5cc3597084b5dbdb057';
    const tokenContract = '0x6b175474e89094c44da98b954eedeac495271d0f';

    // transferFrom(from, to, amount) calldata
    const transferFromData =
      '0x23b872dd' + // transferFrom signature
      '000000000000000000000000' +
      sender.slice(2).toLowerCase() + // from
      '000000000000000000000000' +
      recipient.slice(2).toLowerCase() + // to (recipient - NOT txParams.to which is the contract)
      '0000000000000000000000000000000000000000000000000de0b6b3a7640000'; // amount

    const tx = {
      txParams: {
        from: sender,
        to: tokenContract, // This is the token contract, not the recipient
        data: transferFromData,
      },
    };

    // User is the recipient - should show received
    const result = await getActionKey(tx, recipient, undefined, MOCK_CHAIN_ID);

    expect(result).toBe(strings('transactions.received_tokens'));
  });

  it('returns sent for ERC20 transferFrom when user is sender', async () => {
    spyOnQueryMethod(undefined);
    const sender = '0x1440ec793ae50fa046b95bfeca5af475b6003f9e';
    const recipient = '0x77648f1407986479fb1fa5cc3597084b5dbdb057';
    const tokenContract = '0x6b175474e89094c44da98b954eedeac495271d0f';

    const transferFromData =
      '0x23b872dd' +
      '000000000000000000000000' +
      sender.slice(2).toLowerCase() +
      '000000000000000000000000' +
      recipient.slice(2).toLowerCase() +
      '0000000000000000000000000000000000000000000000000de0b6b3a7640000';

    const tx = {
      txParams: {
        from: sender,
        to: tokenContract,
        data: transferFromData,
      },
    };

    // User is the sender - should show sent
    const result = await getActionKey(tx, sender, undefined, MOCK_CHAIN_ID);

    expect(result).toBe(strings('transactions.sent_tokens'));
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

describe('Transaction utils :: generateApprovalData', () => {
  it('generates the correct data for a token increase allowance transaction', () => {
    const increaseAllowanceDataMock = `${INCREASE_ALLOWANCE_SIGNATURE}0000000000000000000000000000`;
    const data = generateApprovalData({
      spender: MOCK_ADDRESS3,
      value: '0x1',
      data: increaseAllowanceDataMock,
    });
    expect(data).toBe(
      '0x39509351000000000000000000000000b794f5ea0ba39494ce839613fffba742795792680000000000000000000000000000000000000000000000000000000000000001',
    );
  });
  it('generates the correct data for a approve transaction with a value of 0', () => {
    const data = generateApprovalData({
      spender: MOCK_ADDRESS3,
      value: '0x0',
      data: '0x095ea7b3',
    });
    expect(data).toBe(
      '0x095ea7b3000000000000000000000000b794f5ea0ba39494ce839613fffba742795792680000000000000000000000000000000000000000000000000000000000000000',
    );
  });

  it('throws an error if the spender is not defined', () => {
    expect(() => {
      generateApprovalData({
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spender: undefined as any,
        value: '0x0',
        data: '0x095ea7b3',
      });
    }).toThrow();
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

const dappTxMeta = {
  chainId: '0x1',
  origin: 'pancakeswap.finance',
  transaction: {
    from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
    data: '0x5ae401dc0000000000000000000000000000000000000000000000000000000065e8dac400000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d600000000000000000000000007865c6e87b9f70255377e024ace6630c1eaa37f00000000000000000000000000000000000000000000000000000000000001f4000000000000000000000000c5fe6ef47965741f6f7a4734bf784bf3ae3f245200000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000000000000f666eed8000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000e3cb0338a1e400000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000020d440d83ed000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000c80502b1c5000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000e5cdc5e9b7a80000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000140000000000000003b5dc1003926a168c11a816e10c13977f75f488bfffe88e4ab4991fe00000000000000000000000000000000000000000000000000bd',
    gas: '0x3dad5',
    nonce: '0x3e',
    to: '0x881d40237659c251811cec9c364ef91dc08d300c',
    value: '0x0',
    maxFeePerGas: '0x1bbbdf536e',
    maxPriorityFeePerGas: '0x120a5d1',
    estimatedBaseFee: '0x104fbb752f',
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
    data: '0x5f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f424000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000136f6e65496e6368563546656544796e616d6963000000000000000000000000000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000e3cb0338a1e400000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000020d440d83ed000000000000000000000000f326e4de8f66a0bdc0970b79e0924e33c79f1915000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000c80502b1c5000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000000f42400000000000000000000000000000000000000000000000000000e5cdc5e9b7a80000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000140000000000000003b6d0340b4e16d0168e52d35cacd2c6185b44281ec28c9dcab4991fe000000000000000000000000000000000000000000000000001e',
    gas: '0x333c5',
    nonce: '0x3c',
    to: '0x881d40237659c251811cec9c364ef91dc08d300c',
    value: '0x2386f26fc10000',
    maxFeePerGas: '0x1b6bf7e1c3',
    maxPriorityFeePerGas: '0x200a3b7',
    estimatedBaseFee: '0x1020371570',
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
  it('returns false if the transaction is a token transfer from swap origin', () => {
    const tokenTransferFromSwapOrigin = {
      chainId: '0x1',
      origin: ORIGIN_METAMASK,
      transaction: {
        from: '0xc5fe6ef47965741f6f7a4734bf784bf3ae3f2452',
        data: '0xa9059cbb000000000000000000000000dc738206f559bdae106894a62876a119e470aee20000000000000000000000000000000000000000000000000de0b6b3a7640000',
        gas: '0xc350',
        nonce: '0x10',
        to: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
        value: '0x0',
      },
    };

    const result = getIsSwapApproveOrSwapTransaction(
      tokenTransferFromSwapOrigin.transaction.data,
      tokenTransferFromSwapOrigin.origin,
      tokenTransferFromSwapOrigin.transaction.to,
      tokenTransferFromSwapOrigin.chainId,
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

describe('Transactions utils :: getTransactionActionKey', () => {
  it('returns increase allowance method when receiving increase allowance signature', async () => {
    const transaction = {
      txParams: {
        data: `${INCREASE_ALLOWANCE_SIGNATURE}000000000000000000000000000000000000000000000`,
        to: '0xAddress',
      },
    };
    const chainId = '1';

    const actionKey = await getTransactionActionKey(transaction, chainId);
    expect(actionKey).toBe(TOKEN_METHOD_INCREASE_ALLOWANCE);
  });

  it('returns correct value for upgrade smart account transaction', async () => {
    const transaction = {
      txParams: {
        authorizationList: [{ address: '0x1' }],
        to: '0x1',
      },
    };
    const chainId = '1';

    const actionKey = await getTransactionActionKey(transaction, chainId);
    expect(actionKey).toBe(UPGRADE_SMART_ACCOUNT_ACTION_KEY);
  });

  it('returns correct value for downgrade smart account transaction', async () => {
    const transaction = {
      txParams: {
        authorizationList: [{ address: EIP_7702_REVOKE_ADDRESS }],
        to: '0x1',
      },
    };
    const chainId = '1';

    const actionKey = await getTransactionActionKey(transaction, chainId);
    expect(actionKey).toBe(DOWNGRADE_SMART_ACCOUNT_ACTION_KEY);
  });

  it('calls findNetworkClientIdByChainId when toSmartContract is undefined', async () => {
    const spyOnFindNetworkClientIdByChainId = jest.spyOn(
      Engine.context.NetworkController,
      'findNetworkClientIdByChainId',
    );

    const transaction = {
      txParams: {
        to: '0x1',
      },
    };
    const chainId = '1';

    await getTransactionActionKey(transaction, chainId);
    expect(spyOnFindNetworkClientIdByChainId).toHaveBeenCalledWith('1');
  });

  it.each([
    TransactionType.stakingClaim,
    TransactionType.stakingDeposit,
    TransactionType.stakingUnstake,
    TransactionType.lendingDeposit,
    TransactionType.lendingWithdraw,
    TransactionType.perpsDeposit,
    TransactionType.predictDeposit,
  ])('returns transaction type if type is %s', async (type) => {
    const transaction = { type };
    const chainId = '1';

    const actionKey = await getTransactionActionKey(transaction, chainId);

    expect(actionKey).toBe(type);
  });

  it('returns TRANSFER_FROM_ACTION_KEY for tokenMethodTransferFrom type', async () => {
    const transaction = {
      type: TransactionType.tokenMethodTransferFrom,
      txParams: {
        to: '0x123',
        from: '0x456',
      },
    };

    const actionKey = await getTransactionActionKey(transaction, '0x1');

    expect(actionKey).toBe(TRANSFER_FROM_ACTION_KEY);
  });

  it('returns TRANSFER_FROM_ACTION_KEY for tokenMethodSafeTransferFrom type', async () => {
    const transaction = {
      type: TransactionType.tokenMethodSafeTransferFrom,
      txParams: {
        to: '0x123',
        from: '0x456',
      },
    };

    const actionKey = await getTransactionActionKey(transaction, '0x1');

    expect(actionKey).toBe(TRANSFER_FROM_ACTION_KEY);
  });

  it('returns TRANSFER_FROM_ACTION_KEY for legacy transferfrom type', async () => {
    const transaction = {
      type: 'transferfrom',
      txParams: {
        to: '0x123',
        from: '0x456',
      },
    };

    const actionKey = await getTransactionActionKey(transaction, '0x1');

    expect(actionKey).toBe(TRANSFER_FROM_ACTION_KEY);
  });

  it('returns mint for NFT mint method signatures', async () => {
    const mintSignatures = [
      SAFE_MINT_SIGNATURE,
      MINT_SIGNATURE,
      MINT_TO_SIGNATURE,
      SAFE_MINT_WITH_DATA,
    ];

    for (const signature of mintSignatures) {
      const transaction = {
        txParams: {
          to: '0x123',
          from: '0x456',
          data: `${signature}0000000000000000000000000000000000000000000000000000000000000001`,
        },
      };

      const actionKey = await getTransactionActionKey(transaction, '0x1');

      expect(actionKey).toBe(TOKEN_METHOD_MINT);
    }
  });
});

describe('Transactions utils :: getFourByteSignature', () => {
  const testCases = [
    {
      data: '0xa9059cbb0000000000000000000000002f318C334780961FB129D2a6c30D076E7C9C2fa5',
      expected: '0xa9059cbb',
    },
    {
      data: undefined,
      expected: undefined,
    },
    {
      data: '',
      expected: '',
    },
  ];

  it.each(testCases)(
    `extracts the four-byte signature from transaction data`,
    ({ data, expected }) => {
      expect(getFourByteSignature(data)).toBe(expected);
    },
  );
});

describe('Transactions utils :: isApprovalTransaction', () => {
  const testCases: {
    data: string;
    expectedResult: boolean;
    method: string;
  }[] = [
    {
      data: `${INCREASE_ALLOWANCE_SIGNATURE}0000000000000000000000002f318C334780961FB129D2a6c30D076E7C9C2fa5`,
      expectedResult: true,
      method: 'increaseAllowance',
    },
    {
      data: `${APPROVE_FUNCTION_SIGNATURE}0000000000000000000000002f318C334780961FB129D2a6c30D076E7C9C2fa5`,
      expectedResult: true,
      method: 'approve',
    },
    {
      data: `${SET_APPROVAL_FOR_ALL_SIGNATURE}0000000000000000000000002f318C334780961FB129D2a6c30D076E7C9C2fa5`,
      expectedResult: true,
      method: 'decreaseAllowance',
    },
    {
      data: '0x0a19b14a0000000000000000000000002f318C334780961FB129D2a6c30D076E7C9C2fa5',
      expectedResult: false,
      method: 'otherTransactionType',
    },
  ];

  it.each(testCases)(
    'returns $expectedResult for transaction data: $method',
    ({ data, expectedResult }) => {
      expect(isApprovalTransaction(data)).toBe(expectedResult);
    },
  );
});

describe('Transactions utils :: getTransactionReviewActionKey', () => {
  const transaction = { to: '0x1234567890123456789012345678901234567890' };
  const chainId = '1';

  it('returns "Confirm" review action key for ETH send transaction', async () => {
    const expectedReviewActionKey = 'Confirm';

    const result = await getTransactionReviewActionKey(
      { transaction },
      chainId,
    );

    expect(result).toEqual(expectedReviewActionKey);
  });

  it('returns "Increase Allowance" review action key for increase allowance transaction', async () => {
    const expectedReviewActionKey = 'Increase Allowance';

    const result = await getTransactionReviewActionKey(
      { transaction: { ...transaction, data: INCREASE_ALLOWANCE_SIGNATURE } },
      chainId,
    );

    expect(result).toEqual(expectedReviewActionKey);
  });
});

describe('Transactions utils :: getTransactionById', () => {
  it('returns the correct transaction when given a valid transaction ID', () => {
    const mockTransactions = [
      { id: 'tx1', value: '0x1' },
      { id: 'tx2', value: '0x2' },
      { id: 'tx3', value: '0x3' },
    ];

    const mockTransactionController = {
      state: {
        transactions: mockTransactions,
      },
    };

    const result = getTransactionById('tx2', mockTransactionController);

    expect(result).toEqual(mockTransactions[1]);
  });

  it('returns undefined when given an invalid transaction ID', () => {
    const mockTransactions = [
      { id: 'tx1', value: '0x1' },
      { id: 'tx2', value: '0x2' },
      { id: 'tx3', value: '0x3' },
    ];

    const mockTransactionController = {
      state: {
        transactions: mockTransactions,
      },
    };

    const result = getTransactionById('nonexistent', mockTransactionController);

    expect(result).toBeUndefined();
  });

  it('returns undefined when the transactions array is empty', () => {
    const mockTransactionController = {
      state: {
        transactions: [],
      },
    };

    const result = getTransactionById('tx1', mockTransactionController);

    expect(result).toBeUndefined();
  });
});

describe('Transactions utils :: isLegacyTransaction', () => {
  it('returns true for a transaction with legacy type', () => {
    const transactionMeta = {
      txParams: {
        type: TransactionEnvelopeType.legacy,
        from: '0x123',
        to: '0x456',
        gasPrice: '0x77359400',
      },
    };

    expect(isLegacyTransaction(transactionMeta)).toBe(true);
  });

  it('returns false for an EIP-1559 transaction', () => {
    const transactionMeta = {
      txParams: {
        type: TransactionEnvelopeType.feeMarket,
        from: '0x123',
        to: '0x456',
        maxFeePerGas: '0x77359400',
        maxPriorityFeePerGas: '0x1',
      },
    };

    expect(isLegacyTransaction(transactionMeta)).toBe(false);
  });

  it('returns false for a transaction without type field', () => {
    const transactionMeta = {
      txParams: {
        from: '0x123',
        to: '0x456',
        gasPrice: '0x77359400',
      },
    };

    expect(isLegacyTransaction(transactionMeta)).toBe(false);
  });

  it('returns false for undefined transactionMeta', () => {
    // @ts-expect-error Testing undefined input
    expect(isLegacyTransaction(undefined)).toBe(false);
  });

  it('returns false for transactionMeta without txParams', () => {
    const transactionMeta = {};
    expect(
      isLegacyTransaction(transactionMeta as Partial<TransactionMeta>),
    ).toBe(false);
  });
});

describe('Transactions utils :: getTokenAddressParam', () => {
  it('returns the _to parameter when present', () => {
    const tokenData = {
      args: {
        _to: '0x1234567890123456789012345678901234567890',
        _value: 100,
      },
    };

    const result = getTokenAddressParam(tokenData);
    expect(result).toBe('0x1234567890123456789012345678901234567890');
  });

  it('returns the first parameter when _to is not present', () => {
    const tokenData = {
      args: ['0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 100],
    };

    const result = getTokenAddressParam(tokenData);
    expect(result).toBe('0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');
  });

  it('returns undefined when no parameters are present', () => {
    const tokenData = {
      args: {},
    };

    const result = getTokenAddressParam(tokenData);
    expect(result).toBeUndefined();
  });

  it('returns undefined when tokenData is empty', () => {
    const result = getTokenAddressParam();
    expect(result).toBeUndefined();
  });

  it('converts the address to lowercase', () => {
    const tokenData = {
      args: {
        _to: '0x1234567890123456789012345678901234567890'.toUpperCase(),
      },
    };

    const result = getTokenAddressParam(tokenData);
    expect(result).toBe('0x1234567890123456789012345678901234567890');
  });
});

describe('Transactions utils :: getTokenValueParamAsHex', () => {
  it('returns the _value._hex parameter when present', () => {
    const tokenData = {
      args: {
        _value: {
          _hex: '0x64',
        },
      },
    };

    const result = getTokenValueParamAsHex(tokenData);
    expect(result).toBe('0x64');
  });

  it('returns the second parameter._hex when _value is not present', () => {
    const tokenData = {
      args: ['0x1234567890123456789012345678901234567890', { _hex: '0xABCD' }],
    };

    const result = getTokenValueParamAsHex(tokenData);
    expect(result).toBe('0xabcd');
  });

  it('returns undefined when no hex parameters are present', () => {
    const tokenData = {
      args: {
        _value: 100, // No _hex property
        0: 'address',
        1: 200, // No _hex property on second parameter either
      },
    };

    const result = getTokenValueParamAsHex(tokenData);
    expect(result).toBeUndefined();
  });

  it('returns undefined when tokenData is empty', () => {
    const result = getTokenValueParamAsHex();
    expect(result).toBeUndefined();
  });

  it('converts the hex value to lowercase', () => {
    const tokenData = {
      args: {
        _value: {
          _hex: '0xABCDEF',
        },
      },
    };

    const result = getTokenValueParamAsHex(tokenData);
    expect(result).toBe('0xabcdef');
  });
});

describe('Transactions utils :: getTokenValueParam', () => {
  it('returns the _value parameter as string when present', () => {
    const tokenData = {
      args: {
        _value: 100,
      },
    };

    const result = getTokenValueParam(tokenData);
    expect(result).toBe('100');
  });

  it('returns undefined when _value is not present', () => {
    const tokenData = {
      args: {
        _to: '0x1234567890123456789012345678901234567890',
      },
    };

    const result = getTokenValueParam(tokenData);
    expect(result).toBeUndefined();
  });

  it('returns undefined when tokenData is empty', () => {
    const result = getTokenValueParam();
    expect(result).toBeUndefined();
  });

  it('handles BigNumber values correctly', () => {
    const tokenData = {
      args: {
        _value: new BigNumber('1000000000000000000'),
      },
    };

    const result = getTokenValueParam(tokenData);
    expect(result).toBe('1000000000000000000');
  });
});

describe('Transactions utils :: getTokenValue', () => {
  it('returns the value for parameter with name "_value"', () => {
    const tokenParams = [
      { name: '_to', value: '0x1234567890123456789012345678901234567890' },
      { name: '_value', value: '1000000000000000000' },
    ];

    const result = getTokenValue(tokenParams);
    expect(result).toBe('1000000000000000000');
  });

  it('returns undefined when no "_value" parameter exists', () => {
    const tokenParams = [
      { name: '_to', value: '0x1234567890123456789012345678901234567890' },
      { name: '_amount', value: '1000000000000000000' },
    ];

    const result = getTokenValue(tokenParams);
    expect(result).toBeUndefined();
  });

  it('returns undefined when tokenParams is empty', () => {
    const result = getTokenValue([]);
    expect(result).toBeUndefined();
  });

  it('returns undefined when tokenParams is not provided', () => {
    const result = getTokenValue();
    expect(result).toBeUndefined();
  });

  it('returns the first "_value" parameter when multiple exist', () => {
    const tokenParams = [
      { name: '_to', value: '0x1234567890123456789012345678901234567890' },
      { name: '_value', value: '1000000000000000000' },
      { name: '_value', value: '2000000000000000000' },
    ];

    const result = getTokenValue(tokenParams);
    expect(result).toBe('1000000000000000000');
  });
});

describe('Transactions utils :: isNFTTokenStandard', () => {
  it('returns true for ERC721 token standard', () => {
    const result = isNFTTokenStandard(ERC721);
    expect(result).toBe(true);
  });

  it('returns true for ERC1155 token standard', () => {
    const result = isNFTTokenStandard(ERC1155);
    expect(result).toBe(true);
  });

  it('returns false for ERC20 token standard', () => {
    const result = isNFTTokenStandard('ERC20');
    expect(result).toBe(false);
  });

  it('returns false for unknown token standard', () => {
    const result = isNFTTokenStandard('UNKNOWN');
    expect(result).toBe(false);
  });

  it('returns false for undefined token standard', () => {
    // @ts-expect-error Testing undefined input
    const result = isNFTTokenStandard(undefined);
    expect(result).toBe(false);
  });

  it('returns false for empty string token standard', () => {
    const result = isNFTTokenStandard('');
    expect(result).toBe(false);
  });

  it('is case sensitive', () => {
    const result1 = isNFTTokenStandard('erc721');
    const result2 = isNFTTokenStandard('erc1155');
    expect(result1).toBe(false);
    expect(result2).toBe(false);
  });
});

describe('Transactions utils :: calcTokenValue', () => {
  it('calculates token value correctly with decimals', () => {
    const result = calcTokenValue('1.5', 18);
    expect(result.toString()).toBe('1500000000000000000');
  });

  it('calculates token value correctly with zero decimals', () => {
    const result = calcTokenValue('100', 0);
    expect(result.toString()).toBe('100');
  });

  it('handles string input correctly', () => {
    const result = calcTokenValue('123.456', 6);
    expect(result.toString()).toBe('123456000');
  });

  it('handles numeric input correctly', () => {
    const result = calcTokenValue(123.456, 6);
    expect(result.toString()).toBe('123456000');
  });

  it('handles BigNumber input correctly', () => {
    const input = new BigNumber('123.456');
    const result = calcTokenValue(input, 6);
    expect(result.toString()).toBe('123456000');
  });

  it('handles undefined decimals', () => {
    const result = calcTokenValue('100', undefined);
    expect(result.toString()).toBe('100');
  });
});

describe('Transactions utils :: Edge Cases and Error Handling', () => {
  describe('getMethodData edge cases', () => {
    it('handles very short data strings', async () => {
      const result = await getMethodData('0x123', MOCK_NETWORK_CLIENT_ID);
      expect(result).toEqual({});
    });

    it('handles empty data string', async () => {
      const result = await getMethodData('', MOCK_NETWORK_CLIENT_ID);
      expect(result).toEqual({});
    });

    it('handles handleMethodData returning null', async () => {
      (handleMethodData as jest.Mock).mockResolvedValue(null);
      const result = await getMethodData(
        '0x12345678aa',
        MOCK_NETWORK_CLIENT_ID,
      );
      expect(result).toEqual({});
    });

    it('handles handleMethodData throwing an error', async () => {
      (handleMethodData as jest.Mock).mockRejectedValue(
        new Error('Network error'),
      );
      const result = await getMethodData(
        '0x12345678bb',
        MOCK_NETWORK_CLIENT_ID,
      );
      expect(result).toEqual({});
    });
  });

  describe('generateApprovalData edge cases', () => {
    it('handles very large value inputs', () => {
      const largeValue =
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
      const data = generateApprovalData({
        spender: MOCK_ADDRESS3,
        value: largeValue,
      });
      expect(data).toBeTruthy();
      expect(data.length).toBeGreaterThan(10);
    });

    it('handles zero value approvals', () => {
      const data = generateApprovalData({
        spender: MOCK_ADDRESS3,
        value: '0x0',
      });
      expect(data).toBeTruthy();
      expect(data).toContain(
        '0000000000000000000000000000000000000000000000000000000000000000',
      );
    });
  });

  describe('getTransactionActionKey edge cases', () => {
    it('handles transaction with empty authorizationList', async () => {
      const transaction = {
        txParams: {
          authorizationList: [],
          to: '0x1',
        },
      };
      const result = await getTransactionActionKey(transaction, '1');
      expect(typeof result).toBe('string');
    });

    it('handles transaction with malformed txParams', async () => {
      const transaction = {
        txParams: null,
      };
      const result = await getTransactionActionKey(transaction, '1');
      expect(result).toBe('deploy');
    });

    it('handles empty transaction object', async () => {
      const result = await getTransactionActionKey({}, '1');
      expect(result).toBe('deploy');
    });

    it('handles transaction with no "to" field (contract deployment)', async () => {
      const transaction = {
        txParams: {
          from: '0x123',
          data: '0x608060405234801561001057600080fd5b50',
        },
      };
      const result = await getTransactionActionKey(transaction, '1');
      expect(result).toBe('deploy');
    });
  });
});

describe('Transactions utils :: getTransactionToName', () => {
  it('returns ensRecipient when provided', () => {
    const config: TransactionToNameConfig = {
      addressBook: {},
      chainId: '1',
      toAddress: '0x123',
      internalAccounts: [],
      ensRecipient: 'example.eth',
    };

    const result = getTransactionToName(
      config as unknown as Parameters<typeof getTransactionToName>[0],
    );
    expect(result).toBe('example.eth');
  });

  it('returns address book name when found', () => {
    const toAddress = '0x1234567890123456789012345678901234567890';
    const config: TransactionToNameConfig = {
      addressBook: {
        '1': {
          [toAddress]: { name: 'My Contact' },
        },
      },
      chainId: '1',
      toAddress,
      internalAccounts: [],
    };

    const result = getTransactionToName(
      config as unknown as Parameters<typeof getTransactionToName>[0],
    );
    expect(result).toBe('My Contact');
  });

  it('returns internal account name when found', () => {
    const toAddress = '0x1234567890123456789012345678901234567890';
    const config: TransactionToNameConfig = {
      addressBook: {},
      chainId: '1',
      toAddress,
      internalAccounts: [
        {
          address: toAddress,
          metadata: { name: 'My Account' },
        },
      ],
    };

    const result = getTransactionToName(
      config as unknown as Parameters<typeof getTransactionToName>[0],
    );
    expect(result).toBe('My Account');
  });

  it('returns undefined when no name is found', () => {
    const config: TransactionToNameConfig = {
      addressBook: {},
      chainId: '1',
      toAddress: '0x1234567890123456789012345678901234567890',
      internalAccounts: [],
    };

    const result = getTransactionToName(
      config as unknown as Parameters<typeof getTransactionToName>[0],
    );
    expect(result).toBeUndefined();
  });
});

describe('Transactions utils :: addAccountTimeFlagFilter', () => {
  it('returns true when transaction time is less than or equal to added time and flag is false', () => {
    const transaction: TransactionWithTime = { time: 1000 };
    const addedAccountTime = 1500;
    const accountAddedTimeInsertPointFound = false;

    // Use unknown then cast to avoid TypeScript strictness on JS function parameters
    const result = addAccountTimeFlagFilter(
      transaction as unknown as object,
      addedAccountTime as unknown as object,
      accountAddedTimeInsertPointFound as unknown as object,
    );
    expect(result).toBe(true);
  });

  it('returns false when transaction time is greater than added time', () => {
    const transaction: TransactionWithTime = { time: 2000 };
    const addedAccountTime = 1500;
    const accountAddedTimeInsertPointFound = false;

    const result = addAccountTimeFlagFilter(
      transaction as unknown as object,
      addedAccountTime as unknown as object,
      accountAddedTimeInsertPointFound as unknown as object,
    );
    expect(result).toBe(false);
  });

  it('returns false when flag is already true', () => {
    const transaction: TransactionWithTime = { time: 1000 };
    const addedAccountTime = 1500;
    const accountAddedTimeInsertPointFound = true;

    const result = addAccountTimeFlagFilter(
      transaction as unknown as object,
      addedAccountTime as unknown as object,
      accountAddedTimeInsertPointFound as unknown as object,
    );
    expect(result).toBe(false);
  });
});

describe('Transactions utils :: getNormalizedTxState', () => {
  it('returns merged transaction state when transaction exists', () => {
    const state: TransactionStateData = {
      transaction: {
        id: '1',
        transaction: {
          value: '0x1',
          gasPrice: '0x2',
        },
      },
    };

    const result = getNormalizedTxState(state);
    expect(result).toEqual({
      id: '1',
      value: '0x1',
      gasPrice: '0x2',
      transaction: {
        value: '0x1',
        gasPrice: '0x2',
      },
    });
  });

  it('returns undefined when no transaction exists', () => {
    const state: TransactionStateData = {};
    const result = getNormalizedTxState(state);
    expect(result).toBeUndefined();
  });

  it('throws error when state is null', () => {
    expect(() => getNormalizedTxState(null)).toThrow();
  });
});

describe('Transactions utils :: getActiveTabUrl', () => {
  it('returns active tab URL when browser state is valid', () => {
    const browserState: BrowserState = {
      browser: {
        activeTab: 'tab1',
        tabs: [
          { id: 'tab1', url: 'https://example.com' },
          { id: 'tab2', url: 'https://other.com' },
        ],
      },
    };

    const result = getActiveTabUrl(browserState);
    expect(result).toBe('https://example.com');
  });

  it('returns null when no active tab exists', () => {
    const browserState: BrowserState = {
      browser: {
        activeTab: null,
        tabs: [{ id: 'tab1', url: 'https://example.com' }],
      },
    };

    const result = getActiveTabUrl(browserState);
    expect(result).toBeNull();
  });

  it('returns undefined when no tabs exist', () => {
    const browserState: BrowserState = {
      browser: {
        activeTab: 'tab1',
        tabs: [],
      },
    };

    const result = getActiveTabUrl(browserState);
    expect(result).toBeUndefined();
  });

  it('returns undefined when browser state is empty', () => {
    const emptyState = {};
    const result = getActiveTabUrl(emptyState);
    expect(result).toBeUndefined();
  });
});

describe('Transactions utils :: getTicker', () => {
  it('returns provided ticker when valid', () => {
    const result = getTicker('BTC');
    expect(result).toBe('BTC');
  });

  it('returns ETH when ticker is undefined', () => {
    const result = getTicker(undefined as unknown as string);
    expect(result).toBe(strings('unit.eth'));
  });

  it('returns ETH when ticker is null', () => {
    const result = getTicker(null as unknown as string);
    expect(result).toBe(strings('unit.eth'));
  });

  it('returns ETH when ticker is empty string', () => {
    const result = getTicker('');
    expect(result).toBe(strings('unit.eth'));
  });
});

describe('Transactions utils :: getEther', () => {
  it('returns ETH object with provided ticker', () => {
    const result = getEther('ETH');
    expect(result).toEqual({
      name: 'Ether',
      address: '',
      symbol: 'ETH',
      logo: '../images/eth-logo-new.png',
      isETH: true,
    });
  });

  it('returns ETH object with default ticker when none provided', () => {
    const result = getEther(undefined as unknown as string);
    expect(result).toEqual({
      name: 'Ether',
      address: '',
      symbol: strings('unit.eth'),
      logo: '../images/eth-logo-new.png',
      isETH: true,
    });
  });
});

describe('Transactions utils :: validateTransactionActionBalance', () => {
  it('returns false when balance is sufficient for legacy transaction', () => {
    const transaction: TransactionForBalance = {
      transaction: {
        from: '0x123',
        gasPrice: '0x1',
        gas: '0x5208',
        value: '0x1',
      },
    };
    const rate = 1.1;
    const accounts: AccountsMap = {
      '0x123': { balance: '0x1000000000000000000' }, // Large balance
    };

    // Use unknown cast to work with JS function parameter expectations
    const result = validateTransactionActionBalance(
      transaction as unknown as object,
      String(rate),
      accounts,
    );
    expect(result).toBe(false);
  });

  it('returns true when balance is insufficient', () => {
    const transaction: TransactionForBalance = {
      transaction: {
        from: '0x123',
        gasPrice: '0x77359400',
        gas: '0x5208',
        value: '0x1000000000000000000',
      },
    };
    const rate = 1.1;
    const accounts: AccountsMap = {
      '0x123': { balance: '0x1' }, // Very small balance
    };

    const result = validateTransactionActionBalance(
      transaction as unknown as object,
      String(rate),
      accounts,
    );
    expect(result).toBe(true);
  });

  it('handles EIP-1559 transactions', () => {
    const transaction: TransactionForBalance = {
      transaction: {
        from: '0x123',
        maxFeePerGas: '0x77359400',
        gas: '0x5208',
        value: '0x1',
        type: '0x2',
      },
    };
    const rate = 1.1;
    const accounts: AccountsMap = {
      '0x123': { balance: '0x1000000000000000000' },
    };

    const result = validateTransactionActionBalance(
      transaction as unknown as object,
      String(rate),
      accounts,
    );
    expect(result).toBe(false);
  });

  it('returns false when validation throws an error', () => {
    const transaction = null;
    const rate = 1.1;
    const accounts: AccountsMap = {};

    const result = validateTransactionActionBalance(
      transaction as unknown as object,
      String(rate),
      accounts,
    );
    expect(result).toBe(false);
  });
});

describe('Transactions utils :: isSmartContractAddress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when address is undefined', async () => {
    const result = await isSmartContractAddress(
      undefined as unknown as string,
      '1',
    );
    expect(result).toBe(false);
  });

  it('returns false when address is empty', async () => {
    const result = await isSmartContractAddress('', '1');
    expect(result).toBe(false);
  });

  it('returns true when address is in token cache for mainnet', async () => {
    const address = '0x1234567890123456789012345678901234567890';

    // Mock the Engine context for mainnet with cached token
    ENGINE_MOCK.context.TokenListController.state.tokensChainsCache = {
      '0x1': {
        data: {
          [address]: { symbol: 'TEST' },
        },
      },
    };

    const result = await isSmartContractAddress(address, '0x1');
    expect(result).toBe(true);
  });

  it('returns true when contract code is found', async () => {
    const address = '0x1234567890123456789012345678901234567890';

    // Clear token cache
    ENGINE_MOCK.context.TokenListController.state.tokensChainsCache = {
      '0x5': { data: {} },
    };

    // Mock contract code
    spyOnQueryMethod('0x608060405234801561001057600080fd5b50');

    const result = await isSmartContractAddress(address, '0x5');
    expect(result).toBe(true);
  });

  it('returns false when no contract code is found', async () => {
    const address = '0x1234567890123456789012345678901234567890';

    // Clear token cache
    ENGINE_MOCK.context.TokenListController.state.tokensChainsCache = {
      '0x5': { data: {} },
    };

    // Mock empty contract code
    spyOnQueryMethod('0x');

    const result = await isSmartContractAddress(address, '0x5');
    expect(result).toBe(false);
  });

  it('uses provided networkClientId when specified', async () => {
    const address = '0x1234567890123456789012345678901234567890';
    const customNetworkClientId = 'custom-network';

    ENGINE_MOCK.context.TokenListController.state.tokensChainsCache = {
      '0x5': { data: {} },
    };

    spyOnQueryMethod('0x608060405234801561001057600080fd5b50');

    const result = await isSmartContractAddress(
      address,
      '0x5',
      customNetworkClientId,
    );
    expect(result).toBe(true);
  });
});
