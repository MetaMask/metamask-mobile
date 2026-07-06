import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useActivityBlockExplorer } from './useActivityBlockExplorer';
import {
  findBlockExplorerUrlForChain,
  getBlockExplorerTxUrl,
} from '../../../../util/networks';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(),
}));
jest.mock('../../../../util/networks', () => ({
  findBlockExplorerUrlForChain: jest.fn(),
  getBlockExplorerTxUrl: jest.fn(),
}));

const findBase = jest.mocked(findBlockExplorerUrlForChain);
const getEvmTxUrl = jest.mocked(getBlockExplorerTxUrl);

function resolve(chainId: string | undefined, hash: string | undefined) {
  return renderHook(() => useActivityBlockExplorer(chainId, hash)).result
    .current;
}

describe('useActivityBlockExplorer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useSelector).mockReturnValue({});
  });

  it('returns undefined without a chainId or hash', () => {
    expect(resolve(undefined, '0x1')).toBeUndefined();
    expect(resolve('eip155:1', undefined)).toBeUndefined();
  });

  it('returns undefined when no explorer is configured', () => {
    findBase.mockReturnValue(undefined);
    expect(resolve('eip155:1', '0x1')).toBeUndefined();
  });

  it('builds an EVM explorer link via getBlockExplorerTxUrl', () => {
    findBase.mockReturnValue('https://etherscan.io');
    getEvmTxUrl.mockReturnValue({
      url: 'https://etherscan.io/tx/0x1',
      title: 'Etherscan',
    });
    expect(resolve('eip155:1', '0x1')).toEqual({
      url: 'https://etherscan.io/tx/0x1',
      title: 'Etherscan',
    });
  });

  it('returns undefined when the EVM explorer url cannot be built', () => {
    findBase.mockReturnValue('https://etherscan.io');
    getEvmTxUrl.mockReturnValue({ url: null, title: null });
    expect(resolve('eip155:1', '0x1')).toBeUndefined();
  });

  it('builds a non-EVM templated explorer link', () => {
    findBase.mockReturnValue('https://explorer.solana.com/tx/{txId}');
    expect(resolve('solana:abc', '0xhash')).toEqual({
      url: 'https://explorer.solana.com/tx/0xhash',
      title: 'explorer.solana.com',
    });
  });

  it('builds a non-EVM /tx/ link and strips the trailing slash', () => {
    findBase.mockReturnValue('https://solscan.io/');
    expect(resolve('solana:abc', '0xhash')).toEqual({
      url: 'https://solscan.io/tx/0xhash',
      title: 'solscan.io',
    });
  });

  it('falls back to the raw url for the title when it cannot be parsed', () => {
    findBase.mockReturnValue('not-a-valid-base');
    expect(resolve('solana:abc', '0xhash')).toEqual({
      url: 'not-a-valid-base/tx/0xhash',
      title: 'not-a-valid-base/tx/0xhash',
    });
  });
});
