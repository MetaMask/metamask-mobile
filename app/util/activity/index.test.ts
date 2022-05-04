import {
  isFromOrToSelectedAddress,
  isFromCurrentChain,
  sortTransactions,
  filterByAddressAndNetwork,
} from '.';
import { TX_SUBMITTED } from '../../constants/transaction';

const TEST_ADDRESS_ONE = '0x5a3ca5cd63807ce5e4d7841ab32ce6b6d9bbba2d';
const TEST_ADDRESS_TWO = '0x202637daaefbd7f131f90338a4a6c69f6cd5ce91';
const TEST_ADDRESS_THREE = '0xA9d8520b9F2da2A35df109dAeDf047CD7E10309a';
const UNISWAP_ADDRESS = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
const MAKER_ADDRESS = '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2';

describe('Activity utils :: isFromOrToSelectedAddress', () => {
  const tx = {
    transaction: {
      from: TEST_ADDRESS_ONE,
      to: TEST_ADDRESS_TWO,
    },
  };
  it('should return true if the transaction is from the selected address', () => {
    const {
      transaction: { from, to },
    } = tx;
    const selectedAddress = TEST_ADDRESS_ONE;
    const result = isFromOrToSelectedAddress(from, to, selectedAddress);
    expect(result).toEqual(true);
  });
  it('should return true if the transaction is to the selected address', () => {
    const {
      transaction: { from, to },
    } = tx;
    const selectedAddress = TEST_ADDRESS_TWO;
    const result = isFromOrToSelectedAddress(from, to, selectedAddress);
    expect(result).toEqual(true);
  });
  it('should return false if the transaction is not from nor to the selected address', () => {
    const {
      transaction: { from, to },
    } = tx;
    const selectedAddress = TEST_ADDRESS_THREE;
    const result = isFromOrToSelectedAddress(from, to, selectedAddress);
    expect(result).toEqual(false);
  });
  it('should return false if no address is provided', () => {
    const {
      transaction: { from, to },
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
  it('should return true if the chain ids matches', () => {
    expect(isFromCurrentChain(txWithChainId, '4', '4')).toEqual(true);
  });
  it('should return true if the network ids matches and chain id is missing', () => {
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
});

describe('Activity utils :: filterByAddressAndNetwork', () => {
  it('should return true if the transaction meets the condition of address, network, and status', () => {
    const chainId = '1';
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      transaction: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    };
    const tokens: any[] = [];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      chainId,
      chainId,
    );
    expect(result).toEqual(true);
  });
  it('should return true if the transaction meets the condition of address, network, and status and its a transfer transaction from a token contract', () => {
    const chainId = '1';
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      transaction: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: true,
      transferInformation: {
        contractAddress: TEST_ADDRESS_THREE,
      },
    };
    const tokens = [{ address: TEST_ADDRESS_THREE }];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      chainId,
      chainId,
    );
    expect(result).toEqual(true);
  });
  it('should return false if the transaction does not meet the address condition', () => {
    const chainId = '1';
    const transaction = {
      chainId,
      status: TX_SUBMITTED,
      transaction: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    };
    const tokens = [{ address: TEST_ADDRESS_THREE }];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_THREE,
      chainId,
      chainId,
    );
    expect(result).toEqual(false);
  });
  it('should return false if the transaction does not meet the chain condition', () => {
    const chainId = '1';
    const transaction = {
      chainId: '4',
      status: TX_SUBMITTED,
      transaction: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: undefined,
    };
    const tokens = [{ address: TEST_ADDRESS_THREE }];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      chainId,
      chainId,
    );
    expect(result).toEqual(false);
  });
  it('should return false if the transaction does not meet the token condition', () => {
    const chainId = '1';
    const transaction = {
      chainId: '4',
      status: TX_SUBMITTED,
      transaction: {
        from: TEST_ADDRESS_ONE,
        to: TEST_ADDRESS_TWO,
      },
      isTransfer: false,
      transferInformation: {
        contractAddress: MAKER_ADDRESS,
      },
    };
    const tokens = [{ address: UNISWAP_ADDRESS }];

    const result = filterByAddressAndNetwork(
      transaction,
      tokens,
      TEST_ADDRESS_ONE,
      chainId,
      chainId,
    );
    expect(result).toEqual(false);
  });
});
