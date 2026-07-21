import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  selectPopularNetworkConfigurationsByCaipChainId,
  selectCustomNetworkConfigurationsByCaipChainId,
} from '../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../selectors/multichainNetworkController';
import { useNetworkFilterOptions } from './useNetworkFilterOptions';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectPopularNetworkConfigurationsByCaipChainId: jest.fn(),
  selectCustomNetworkConfigurationsByCaipChainId: jest.fn(),
}));

jest.mock('../../../../selectors/multichainNetworkController', () => ({
  selectNonEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(({ chainId }) => `image:${chainId}`),
}));

const mockUseSelector = useSelector as unknown as jest.Mock;

const mockSelectors = ({
  popular,
  custom,
  nonEvm,
}: {
  popular: unknown;
  custom: unknown;
  nonEvm: unknown;
}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPopularNetworkConfigurationsByCaipChainId) {
      return popular;
    }
    if (selector === selectCustomNetworkConfigurationsByCaipChainId) {
      return custom;
    }
    if (selector === selectNonEvmNetworkConfigurationsByChainId) {
      return nonEvm;
    }
    return undefined;
  });
};

describe('useNetworkFilterOptions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('orders popular EVM → non-EVM mainnets → custom, and ignores enablement', () => {
    mockSelectors({
      popular: [
        { caipChainId: 'eip155:1', name: 'Ethereum' },
        { caipChainId: 'eip155:137', name: 'Polygon' },
      ],
      custom: [{ caipChainId: 'eip155:59141', name: 'My Custom Net' }],
      nonEvm: {
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
          name: 'Solana',
          isTestnet: false,
        },
        'solana:devnet': { name: 'Solana Devnet', isTestnet: true },
      },
    });

    const { result } = renderHook(() => useNetworkFilterOptions());

    // Testnet non-EVM dropped; order is popular → non-EVM mainnet → custom.
    expect(result.current.map((n) => n.caipChainId)).toStrictEqual([
      'eip155:1',
      'eip155:137',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      'eip155:59141',
    ]);
    // Selection is never derived from the enablement controller.
    expect(result.current.every((n) => n.isSelected === false)).toBe(true);
    expect(result.current[0]).toMatchObject({
      id: 'eip155:1',
      name: 'Ethereum',
      imageSource: 'image:eip155:1',
    });
  });

  it('de-duplicates a network present in more than one source', () => {
    mockSelectors({
      popular: [{ caipChainId: 'eip155:1', name: 'Ethereum' }],
      custom: [{ caipChainId: 'eip155:1', name: 'Ethereum (dup)' }],
      nonEvm: {},
    });

    const { result } = renderHook(() => useNetworkFilterOptions());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].name).toBe('Ethereum');
  });
});
