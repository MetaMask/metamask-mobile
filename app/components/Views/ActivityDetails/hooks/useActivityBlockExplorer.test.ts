import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useActivityBlockExplorer } from './useActivityBlockExplorer';
import { SolScope, TrxScope } from '@metamask/keyring-api';
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

  it.each([
    [SolScope.Mainnet, 'https://solscan.io/tx/', 'solscan.io'],
    [TrxScope.Mainnet, 'https://tronscan.org/#/transaction/', 'tronscan.org'],
  ])('builds a non-EVM templated explorer link', (chainId, url, title) => {
    expect(resolve(chainId, '0xhash')).toEqual({
      url: `${url}0xhash`,
      title: title,
    });
  });

  // it is a never case
  it('return undefined for url and title when it cannot be parsed', () => {
    expect(resolve('unknown-non-evm:abc', '0xhash')).toBeUndefined();
  });
});
