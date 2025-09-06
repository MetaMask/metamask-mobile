import { TransactionMeta } from '@metamask/transaction-controller';
import {
  isFromOrToSelectedAddress,
  isFromCurrentChain,
  sortTransactions,
  filterByAddressAndNetwork,
} from '.';
import { Token } from '../../components/UI/Swaps/utils/token-list-utils';
import { TX_SUBMITTED, TX_UNAPPROVED } from '../../constants/transaction';
import { DeepPartial } from '../test/renderWithProvider';

const TEST_ADDRESS_ONE = '0x5a3ca5cd63807ce5e4d7841ab32ce6b6d9bbba2d';
const TEST_ADDRESS_TWO = '0x202637daaefbd7f131f90338a4a6c69f6cd5ce91';
const TEST_ADDRESS_THREE = '0xA9d8520b9F2da2A35df109dAeDf047CD7E10309a';

describe('Activity utils :: isFromOrToSelectedAddress', () => {
  const tx = {
    txParams: {
      from: TEST_ADDRESS_ONE,
      to: TEST_ADDRESS_TWO,
    },
  };

  it('should return true if the transaction is from the selected address', () => {
    const {
      txParams: { from, to },
    } = tx;
    const selectedAddress = TEST_ADDRESS_ONE;
    const result = isFromOrToSelectedAddress(from, to, selectedAddress);
    expect(result).toEqual(true);
  });

  it('should return true if the transaction is to the selected address', () => {
    const {
      txParams: { from, to },
    } = tx;
    const selectedAddress = TEST_ADDRESS_TWO;
    const result = isFromOrToSelectedAddress(from, to, selectedAddress);
    expect(result).toEqual(true);
  });

  it('should return false if the transaction is not from nor to the selected address', () => {
    const {
      txParams: { from, to },
    } = tx;
    const selectedAddress = TEST_ADDRESS_THREE;
    const result = isFromOrToSelectedAddress(from, to, selectedAddress);
    expect(result).toEqual(false);
  });

  it('should return false if no address is provided', () => {
    const {
      txParams: { from, to },
    } = tx;
    const selectedAddress = '';
    const result = isFromOrToSelectedAddress(from, to, selectedAddress);
    expect(result).toEqual(false);
  });
});

describe('Activity utils :: isFromCurrentChain', () => {
  const txWithChainId = {
    chainId: '4',
    networkID: '4',
  };

  it('should return true if the chain ids match', () => {
    expect(isFromCurrentChain(txWithChainId, '4', '4')).toEqual(true);
  });

  it('should return true if the network ids match and chain id is missing', () => {
    const txWithoutChainId = {
      networkID: '4',
    };
    expect(isFromCurrentChain(txWithoutChainId, '4', '4')).toEqual(true);
  });

  it('should return false if the chain ids do not match', () => {
    expect(isFromCurrentChain(txWithChainId, '1', '1')).toEqual(false);
  });

  it('should return false if the network ids do not match and chain id is missing', () => {
    const txWithoutChainId = {
      networkID: '4',
    };
    expect(isFromCurrentChain(txWithoutChainId, '1', '1')).toEqual(false);
  });
});

describe('Activity utils :: sortTransactions', () => {
  it('should sort txs based on the timestamp', () => {
    const unsortedTxs = [
      { id: 'a3', time: 1645104692826 },
      { id: 'a2', time: 1645322223255 },
      { id: 'a1', time: 1645406937199 },
    ];

    const expectedSortedTxs = [
      { id: 'a1', time: 1645406937199 },
      { id: 'a2', time: 1645322223255 },
      { id: 'a3', time: 1645104692826 },
    ];

    const sortedTxs = sortTransactions(unsortedTxs);
    expect(sortedTxs).toEqual(expectedSortedTxs);
  });

  it('should return correct data when it is already sorted', () => {
    const unsortedTxs = [
      { id: 'a1', time: 1645406937199 },
      { id: 'a2', time: 1645322223255 },
      { id: 'a3', time: 1645104692826 },
    ];

    const expectedSortedTxs = [
      { id: 'a1', time: 1645406937199 },
      { id: 'a2', time: 1645322223255 },
      { id: 'a3', time: 1645104692826 },
    ];

    const sortedTxs = sortTransactions(unsortedTxs);
    expect(sortedTxs).toEqual(expectedSortedTxs);
  });

  it('should return the same array if all timestamps are equal', () => {
    const unsortedTxs = [
      { id: 'a1', time: 1645406937199 },
      { id: 'a2', time: 1645406937199 },
      { id: 'a3', time: 1645406937199 },
      { id: 'a4', time: 1645406937199 },
    ];

    const expectedSortedTxs = [
      { id: 'a1', time: 1645406937199 },
      { id: 'a2', time: 1645406937199 },
      { id: 'a3', time: 1645406937199 },
      { id: 'a4', time: 1645406937199 },
    ];

    const sortedTxs = sortTransactions(unsortedTxs);
    expect(sortedTxs).toEqual(expectedSortedTxs);
  });
});

describe('Activity utils :: filterByAddressAndNetwork', () => {
  it('should return true if the transaction meets the condition of address, network, and status', () => {
    const chainId = '0x1';
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [] as Token[];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
    );
    expect(result).toEqual(true);
  });

  it('should return true if the transaction meets the condition for a transfer with a matching token', () => {
    const chainId = '0x1';
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: true,
      transferInformation: {
        contractAddress: TEST_ADDRESS_THREE,
      },
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [{ address: TEST_ADDRESS_THREE }];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
    );
    expect(result).toEqual(true);
  });

  it('should return false if the transaction does not meet the address condition', () => {
    const chainId = '0x1';
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [{ address: TEST_ADDRESS_THREE }];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_THREE,
      { '0x1': true },
    );
    expect(result).toEqual(false);
  });

  it('should return false if the transaction does not meet the chain condition', () => {
    const transaction = {
      chainId: '0x4',
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [{ address: TEST_ADDRESS_THREE }];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
    );
    expect(result).toEqual(false);
  });

  it('should return false if the transaction does not meet the token condition for transfers', () => {
    const chainId = '0x1';
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: true,
      transferInformation: {
        contractAddress: TEST_ADDRESS_THREE,
      },
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    // Empty tokens array so matching token is not found.
    const tokens = [] as Token[];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
    );
    expect(result).toEqual(false);
  });

  it('should return false if transaction status is TX_UNAPPROVED', () => {
    const chainId = '0x1';
    const transaction = {
      chainId,
      status: TX_UNAPPROVED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [] as Token[];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
    );
    expect(result).toEqual(false);
  });

  it('should return true when tokenNetworkFilter length is not equal to 1 (forcing chain condition to true) even if chain ids do not match', () => {
    const transaction = {
      chainId: '0x2', // Different than provided chainId
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [] as Token[];

    // tokenNetworkFilter array with two items, so Object.keys(tokenNetworkFilter).length === 2
    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true, '0x2': true },
    );
    // Despite chainId mismatch, the condition becomes true
    expect(result).toEqual(true);
  });

  it('returns true if network filter matches chain of required transaction', () => {
    const transaction = {
      chainId: '0x2',
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
      requiredTransactionIds: ['123-456'],
    } as Partial<TransactionMeta> as TransactionMeta;

    const allTransactions = [
      {
        id: '123-456',
        chainId: '0x1',
      },
    ] as Partial<TransactionMeta>[] as TransactionMeta[];

    const tokens = [] as Token[];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
      allTransactions,
    );

    expect(result).toEqual(true);
  });

  it('returns false if required transaction of alternate transaction', () => {
    const transaction = {
      id: '123',
      chainId: '0x2',
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    } as Partial<TransactionMeta> as TransactionMeta;

    const allTransactions = [
      {
        id: '456',
        chainId: '0x1',
        requiredTransactionIds: ['123'],
      },
    ] as Partial<TransactionMeta>[] as TransactionMeta[];

    const tokens = [] as Token[];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
      allTransactions,
    );

    expect(result).toEqual(false);
  });
});
