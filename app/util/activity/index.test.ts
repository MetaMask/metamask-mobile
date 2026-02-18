import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  isFromOrToSelectedAddress,
  isFromCurrentChain,
  sortTransactions,
  filterByAddress as filterByAddressOriginal,
  filterByAddressAndNetwork as filterByAddressAndNetworkOriginal,
  PAY_TYPES,
  isTransactionOnChains,
  isTrustedAddress,
} from '.';
import { Token } from '@metamask/assets-controllers';
import { TX_SUBMITTED, TX_UNAPPROVED } from '../../constants/transaction';
import { DeepPartial } from '../test/renderWithProvider';
import { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import { Hex } from '@metamask/utils';
import { AddressBookControllerState } from '@metamask/address-book-controller';

const TEST_ADDRESS_ONE = '0x5a3ca5cd63807ce5e4d7841ab32ce6b6d9bbba2d';
const TEST_ADDRESS_TWO = '0x202637daaefbd7f131f90338a4a6c69f6cd5ce91';
const TEST_ADDRESS_THREE = '0xA9d8520b9F2da2A35df109dAeDf047CD7E10309a';

function filterByAddressAndNetwork(
  transaction: TransactionMeta,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tokens: any[],
  selectedAddress: string,
  tokenNetworkFilter: { [chainId: string]: boolean },
  allTransactions: TransactionMeta[] = [],
  bridgeHistory: Record<string, BridgeHistoryItem> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addressBook: any = {},
  internalAccountAddresses: string[] = [],
): boolean {
  return filterByAddressAndNetworkOriginal(
    transaction,
    tokens,
    selectedAddress,
    tokenNetworkFilter,
    allTransactions,
    bridgeHistory,
    addressBook,
    internalAccountAddresses,
  );
}

function filterByAddress(
  transaction: TransactionMeta,
  tokens: { address: string }[],
  selectedAddress: string,
  allTransactions: TransactionMeta[] = [],
  bridgeHistory: Record<string, BridgeHistoryItem> = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addressBook: any = {},
  internalAccountAddresses: string[] = [],
): boolean {
  return filterByAddressOriginal(
    transaction,
    tokens,
    selectedAddress,
    allTransactions,
    bridgeHistory,
    addressBook,
    internalAccountAddresses,
  );
}

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

  it('returns true for outgoing transfer even when token is not in list', () => {
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
    expect(result).toEqual(true);
  });

  it('returns false for incoming transfer when token is not in list', () => {
    const chainId = '0x1';
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_TWO,
        to: TEST_ADDRESS_ONE,
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
      chainId: '0x1',
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

  it('returns false if hash matches required transaction of alternate transaction', () => {
    const transaction = {
      id: '123',
      hash: '0xabc',
      chainId: '0x1',
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
        requiredTransactionIds: ['789'],
      },
      {
        id: '789',
        chainId: '0x1',
        requiredTransactionIds: ['123'],
        hash: '0xabc',
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

  it.each(PAY_TYPES)('returns false if in batch with %s', (type) => {
    const transaction = {
      id: '123',
      batchId: '0x456',
      chainId: '0x1',
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
        id: '789',
        batchId: '0x456',
        chainId: '0x1',
        type,
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

  it.each(PAY_TYPES)('returns true if no batch id and %s', (type) => {
    const transaction = {
      id: '123',
      chainId: '0x1',
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
        id: '789',
        chainId: '0x1',
        type,
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

  it('returns false if matches bridge destination hash and source is required transaction', () => {
    const transaction = {
      id: '456-123',
      hash: '0xdef',
      txParams: { from: TEST_ADDRESS_ONE, to: TEST_ADDRESS_TWO },
      chainId: '0x1' as Hex,
      status: TX_SUBMITTED,
    } as TransactionMeta;

    const allTransactions = [
      {
        id: '123-456',
        chainId: '0x1',
        txParams: {},
      },
      {
        requiredTransactionIds: ['123-456'],
        txParams: {},
      },
    ] as Partial<TransactionMeta>[] as TransactionMeta[];

    const bridgeHistory = {
      '123-456': {
        status: {
          destChain: {
            txHash: '0xdef',
          },
        },
        txMetaId: '123-456',
      } as BridgeHistoryItem,
    };

    const result = filterByAddressAndNetwork(
      transaction,
      [],
      TEST_ADDRESS_ONE,
      { '0x1': true },
      allTransactions,
      bridgeHistory,
    );

    expect(result).toEqual(false);
  });

  it('returns true if transaction is in pay batch but isIntentComplete is true', () => {
    // Arrange: transaction is part of a pay batch (would normally be filtered)
    // but isIntentComplete bypasses the filter
    const transaction = {
      id: '123',
      batchId: '0x456',
      chainId: '0x1',
      status: TX_SUBMITTED,
      isIntentComplete: true,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    } as Partial<TransactionMeta> as TransactionMeta;

    const allTransactions = [
      {
        id: '789',
        batchId: '0x456',
        chainId: '0x1',
        type: PAY_TYPES[0],
      },
    ] as Partial<TransactionMeta>[] as TransactionMeta[];

    // Act
    const result = filterByAddressAndNetwork(
      transaction,
      [],
      TEST_ADDRESS_ONE,
      { '0x1': true },
      allTransactions,
    );

    // Assert: shown because isIntentComplete overrides the pay batch filter
    expect(result).toEqual(true);
  });

  it('returns false if transaction hash matches hash of a required transaction', () => {
    // Arrange: tx has a different id but the same hash as a required transaction
    const transaction = {
      id: 'replacement-id',
      hash: '0xabc',
      chainId: '0x1',
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    } as Partial<TransactionMeta> as TransactionMeta;

    const allTransactions = [
      // This transaction is required by another, and shares hash with our tx
      {
        id: 'required-id',
        hash: '0xabc',
        chainId: '0x1',
      },
      // This transaction depends on 'required-id'
      {
        id: 'dependent-id',
        chainId: '0x1',
        requiredTransactionIds: ['required-id'],
      },
    ] as Partial<TransactionMeta>[] as TransactionMeta[];

    // Act
    const result = filterByAddressAndNetwork(
      transaction,
      [],
      TEST_ADDRESS_ONE,
      { '0x1': true },
      allTransactions,
    );

    // Assert: filtered out because hash matches a required dependency
    expect(result).toEqual(false);
  });
});

describe('Activity utils :: filterByAddress', () => {
  it('returns true for non-transfer when address matches and status not unapproved', () => {
    const transaction = {
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    } as DeepPartial<TransactionMeta> as TransactionMeta;

    const result = filterByAddress(transaction, [], TEST_ADDRESS_ONE);
    expect(result).toEqual(true);
  });

  it('returns true for transfer when token list contains contract address', () => {
    const transaction = {
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

    const result = filterByAddress(transaction, tokens, TEST_ADDRESS_ONE);
    expect(result).toEqual(true);
  });

  it('returns false when address does not match selected address', () => {
    const transaction = {
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    } as DeepPartial<TransactionMeta> as TransactionMeta;

    const result = filterByAddress(transaction, [], TEST_ADDRESS_THREE);
    expect(result).toEqual(false);
  });

  it('returns true for outgoing transfer even when token is not in list', () => {
    const transaction = {
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

    const tokens = [] as Token[];

    const result = filterByAddress(transaction, tokens, TEST_ADDRESS_ONE);
    expect(result).toEqual(true);
  });

  it('returns false for incoming transfer when token is not in list', () => {
    const transaction = {
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_TWO,
        to: TEST_ADDRESS_ONE,
      },
      isTransfer: true,
      transferInformation: {
        contractAddress: TEST_ADDRESS_THREE,
      },
    } as DeepPartial<TransactionMeta> as TransactionMeta;

    const tokens = [] as Token[];

    const result = filterByAddress(transaction, tokens, TEST_ADDRESS_ONE);
    expect(result).toEqual(false);
  });

  it('returns false when status is TX_UNAPPROVED', () => {
    const transaction = {
      status: TX_UNAPPROVED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    } as DeepPartial<TransactionMeta> as TransactionMeta;

    const result = filterByAddress(transaction, [], TEST_ADDRESS_ONE);
    expect(result).toEqual(false);
  });

  it('returns false when transaction is required by another transaction', () => {
    const transaction = {
      id: '123',
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
        requiredTransactionIds: ['123'],
      },
    ] as Partial<TransactionMeta>[] as TransactionMeta[];

    const result = filterByAddress(
      transaction,
      [],
      TEST_ADDRESS_ONE,
      allTransactions,
    );
    expect(result).toEqual(false);
  });

  it('returns false if hash matches required transaction of alternate transaction', () => {
    const transaction = {
      id: '123',
      hash: '0xabc',
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
        requiredTransactionIds: ['789'],
      },
      {
        id: '789',
        requiredTransactionIds: ['123'],
        hash: '0xabc',
      },
    ] as Partial<TransactionMeta>[] as TransactionMeta[];

    const result = filterByAddress(
      transaction,
      [],
      TEST_ADDRESS_ONE,
      allTransactions,
    );

    expect(result).toEqual(false);
  });

  it.each(PAY_TYPES)('returns false if in batch with %s', (type) => {
    const transaction = {
      id: '123',
      batchId: '0x456',
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
        id: '789',
        batchId: '0x456',
        type,
      },
    ] as Partial<TransactionMeta>[] as TransactionMeta[];

    const result = filterByAddress(
      transaction,
      [],
      TEST_ADDRESS_ONE,
      allTransactions,
    );

    expect(result).toEqual(false);
  });

  it.each(PAY_TYPES)('returns true if no batch id and %s', (type) => {
    const transaction = {
      id: '123',
      chainId: '0x1',
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
        id: '789',
        chainId: '0x1',
        type,
      },
    ] as Partial<TransactionMeta>[] as TransactionMeta[];

    const tokens = [] as Token[];

    const result = filterByAddress(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      allTransactions,
    );

    expect(result).toEqual(true);
  });

  it('returns false if matches bridge destination hash and source is required transaction', () => {
    const transaction = {
      id: '456-123',
      hash: '0xdef',
      txParams: { from: TEST_ADDRESS_ONE, to: TEST_ADDRESS_TWO },
      chainId: '0x1' as Hex,
      status: TX_SUBMITTED,
    } as TransactionMeta;

    const allTransactions = [
      {
        id: '123-456',
        chainId: '0x1',
        txParams: {},
      },
      {
        requiredTransactionIds: ['123-456'],
        txParams: {},
      },
    ] as Partial<TransactionMeta>[] as TransactionMeta[];

    const bridgeHistory = {
      '123-456': {
        status: {
          destChain: {
            txHash: '0xdef',
          },
        },
        txMetaId: '123-456',
      } as BridgeHistoryItem,
    };

    const result = filterByAddress(
      transaction,
      [],
      TEST_ADDRESS_ONE,
      allTransactions,
      bridgeHistory,
    );

    expect(result).toEqual(false);
  });
});

describe('Activity utils :: isTransactionOnChains', () => {
  it('returns true if transaction chain ID matches', () => {
    expect(
      isTransactionOnChains(
        { chainId: '0x1' as Hex } as TransactionMeta,
        ['0x1', '0x2'],
        [],
      ),
    ).toBe(true);
  });

  it('returns true if required transaction has matching chain ID', () => {
    expect(
      isTransactionOnChains(
        {
          chainId: '0x3' as Hex,
          requiredTransactionIds: ['123'],
        } as TransactionMeta,
        ['0x1', '0x2'],
        [
          {
            id: '123',
            chainId: '0x1' as Hex,
          } as TransactionMeta,
        ],
      ),
    ).toBe(true);
  });

  it('returns false if neither transaction nor required transaction match chain IDs', () => {
    expect(
      isTransactionOnChains(
        {
          chainId: '0x3' as Hex,
          requiredTransactionIds: ['123'],
        } as TransactionMeta,
        ['0x1', '0x2'],
        [
          {
            id: '123',
            chainId: '0x4' as Hex,
          } as TransactionMeta,
        ],
      ),
    ).toBe(false);
  });

  it('returns false if perps deposit and required transaction chain does not match', () => {
    expect(
      isTransactionOnChains(
        {
          chainId: '0x1' as Hex,
          type: TransactionType.perpsDeposit,
          requiredTransactionIds: ['123'],
        } as TransactionMeta,
        ['0x1', '0x2'],
        [
          {
            id: '123',
            chainId: '0x3' as Hex,
          } as TransactionMeta,
        ],
      ),
    ).toBe(false);
  });

  it('returns true if perps deposit and required transaction chain does match', () => {
    expect(
      isTransactionOnChains(
        {
          chainId: '0x1' as Hex,
          type: TransactionType.perpsDeposit,
          requiredTransactionIds: ['123'],
        } as TransactionMeta,
        ['0x1', '0x2'],
        [
          {
            id: '123',
            chainId: '0x2' as Hex,
          } as TransactionMeta,
        ],
      ),
    ).toBe(true);
  });

  it('returns true if perps deposit and no required transactions', () => {
    expect(
      isTransactionOnChains(
        {
          chainId: '0x1' as Hex,
          type: TransactionType.perpsDeposit,
        } as TransactionMeta,
        ['0x1', '0x2'],
        [],
      ),
    ).toBe(true);
  });
});

describe('Activity utils :: isTrustedAddress', () => {
  const CHAIN_ID = '0x1' as Hex;

  it('should return true for user own account', () => {
    const addressBook = {};
    const internalAccountAddresses = [TEST_ADDRESS_ONE, TEST_ADDRESS_TWO];

    const result = isTrustedAddress(
      TEST_ADDRESS_ONE,
      CHAIN_ID,
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toBe(true);
  });

  it('should return true for address in address book', () => {
    const addressBook: AddressBookControllerState['addressBook'] = {
      '0x1': {
        '0x5A3CA5cd63807Ce5e4d7841AB32Ce6b6d9bBBa2D': {
          address: '0x5A3CA5cd63807Ce5e4d7841AB32Ce6b6d9bBBa2D',
          name: 'Friend',
          chainId: '0x1' as Hex,
          memo: '',
          isEns: false,
        },
      },
    };
    const internalAccountAddresses = [TEST_ADDRESS_TWO];

    const result = isTrustedAddress(
      TEST_ADDRESS_ONE,
      CHAIN_ID,
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toBe(true);
  });

  it('should return false for unknown address', () => {
    const addressBook = {};
    const internalAccountAddresses = [TEST_ADDRESS_ONE];

    const result = isTrustedAddress(
      TEST_ADDRESS_THREE,
      CHAIN_ID,
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toBe(false);
  });

  it('should return false for empty address', () => {
    const addressBook = {};
    const internalAccountAddresses = [TEST_ADDRESS_ONE];

    const result = isTrustedAddress(
      '',
      CHAIN_ID,
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toBe(false);
  });

  it('should handle case-insensitive comparison for EVM addresses', () => {
    const addressBook = {};
    // Use uppercase hex digits only — preserving '0x' prefix so it remains a valid EVM address
    const internalAccountAddresses = [
      '0x' + TEST_ADDRESS_ONE.slice(2).toUpperCase(),
    ];

    const result = isTrustedAddress(
      TEST_ADDRESS_ONE.toLowerCase(),
      CHAIN_ID,
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toBe(true);
  });

  it('should return false for address in wrong chain address book', () => {
    const addressBook: AddressBookControllerState['addressBook'] = {
      '0x89': {
        // Polygon, not Mainnet
        '0x5A3CA5cd63807Ce5e4d7841AB32Ce6b6d9bBBa2D': {
          address: '0x5A3CA5cd63807Ce5e4d7841AB32Ce6b6d9bBBa2D',
          name: 'Friend',
          chainId: '0x89' as Hex,
          memo: '',
          isEns: false,
        },
      },
    };
    const internalAccountAddresses = [TEST_ADDRESS_TWO];

    const result = isTrustedAddress(
      TEST_ADDRESS_ONE,
      CHAIN_ID, // Looking in mainnet (0x1)
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toBe(false);
  });
});

describe('Activity utils :: filterByAddressAndNetwork - token poisoning protection', () => {
  const chainId = '0x1' as Hex;
  const UNKNOWN_SENDER = '0x9999999999999999999999999999999999999999';

  it('should hide incoming transfer from unknown address even when token exists', () => {
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: UNKNOWN_SENDER,
        to: TEST_ADDRESS_ONE,
      },
      isTransfer: true,
      transferInformation: {
        contractAddress: TEST_ADDRESS_THREE,
      },
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [{ address: TEST_ADDRESS_THREE }];
    const addressBook = {};
    const internalAccountAddresses = [TEST_ADDRESS_ONE];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
      [],
      {},
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toEqual(false);
  });

  it('should show incoming transfer from address in address book', () => {
    const friendAddress = TEST_ADDRESS_TWO;
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: friendAddress,
        to: TEST_ADDRESS_ONE,
      },
      isTransfer: true,
      transferInformation: {
        contractAddress: TEST_ADDRESS_THREE,
      },
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [{ address: TEST_ADDRESS_THREE }];
    const addressBook = {
      '0x1': {
        [friendAddress]: {
          address: friendAddress,
          name: 'Friend',
          chainId: '0x1',
          memo: '',
          isEns: false,
        },
      },
    };
    const internalAccountAddresses = [TEST_ADDRESS_ONE];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
      [],
      {},
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toEqual(true);
  });

  it('should show incoming transfer from user own account (Account 2 -> Account 1)', () => {
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_TWO,
        to: TEST_ADDRESS_ONE,
      },
      isTransfer: true,
      transferInformation: {
        contractAddress: TEST_ADDRESS_THREE,
      },
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [{ address: TEST_ADDRESS_THREE }];
    const addressBook = {};
    const internalAccountAddresses = [TEST_ADDRESS_ONE, TEST_ADDRESS_TWO];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
      [],
      {},
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toEqual(true);
  });

  it('should always show outgoing transfers to unknown addresses', () => {
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: TEST_ADDRESS_ONE,
        to: UNKNOWN_SENDER,
      },
      isTransfer: true,
      transferInformation: {
        contractAddress: TEST_ADDRESS_THREE,
      },
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [{ address: TEST_ADDRESS_THREE }];
    const addressBook = {};
    const internalAccountAddresses = [TEST_ADDRESS_ONE];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
      [],
      {},
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toEqual(true);
  });

  it('should hide incoming transfer if token not in wallet (existing behavior)', () => {
    const friendAddress = TEST_ADDRESS_TWO;
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: friendAddress,
        to: TEST_ADDRESS_ONE,
      },
      isTransfer: true,
      transferInformation: {
        contractAddress: TEST_ADDRESS_THREE,
      },
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens: Token[] = [];
    const addressBook = {
      '0x1': {
        [friendAddress]: {
          address: friendAddress,
          name: 'Friend',
          chainId: '0x1',
          memo: '',
          isEns: false,
        },
      },
    };
    const internalAccountAddresses = [TEST_ADDRESS_ONE];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      { '0x1': true },
      [],
      {},
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toEqual(false);
  });
});

describe('Activity utils :: filterByAddress - token poisoning protection', () => {
  const chainId = '0x1' as Hex;
  const UNKNOWN_SENDER = '0x9999999999999999999999999999999999999999';

  it('should hide incoming transfer from unknown address', () => {
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: UNKNOWN_SENDER,
        to: TEST_ADDRESS_ONE,
      },
      isTransfer: true,
      transferInformation: {
        contractAddress: TEST_ADDRESS_THREE,
      },
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [{ address: TEST_ADDRESS_THREE }];
    const addressBook = {};
    const internalAccountAddresses = [TEST_ADDRESS_ONE];

    const result = filterByAddress(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      [],
      {},
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toEqual(false);
  });

  it('should show incoming transfer from trusted address', () => {
    const friendAddress = TEST_ADDRESS_TWO;
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      txParams: {
        from: friendAddress,
        to: TEST_ADDRESS_ONE,
      },
      isTransfer: true,
      transferInformation: {
        contractAddress: TEST_ADDRESS_THREE,
      },
    } as DeepPartial<TransactionMeta> as TransactionMeta;
    const tokens = [{ address: TEST_ADDRESS_THREE }];
    const addressBook = {
      '0x1': {
        [friendAddress]: {
          address: friendAddress,
          name: 'Friend',
          chainId: '0x1',
          memo: '',
          isEns: false,
        },
      },
    };
    const internalAccountAddresses = [TEST_ADDRESS_ONE];

    const result = filterByAddress(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      [],
      {},
      addressBook,
      internalAccountAddresses,
    );
    expect(result).toEqual(true);
  });
});
