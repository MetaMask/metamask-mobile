import { Hex } from '@metamask/utils';
import { getNetworkName } from './network';

const mockNetworkConfigurationsByChainId: Record<Hex, { name: string }> = {};
const mockNetworkControllerState = {
  networkConfigurationsByChainId: mockNetworkConfigurationsByChainId,
};

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    get context() {
      return {
        NetworkController: {
          state: mockNetworkControllerState,
        },
      };
    },
  },
}));

const clearObject = <T extends object>(value: T) => {
  Object.keys(value).forEach((key) => {
    delete value[key as keyof T];
  });
};

describe('getNetworkName', () => {
  beforeEach(() => {
    clearObject(mockNetworkConfigurationsByChainId);
  });

  it('returns Unknown Network when chainId is not provided', () => {
    const chainId = undefined;

    const networkName = getNetworkName(chainId);

    expect(networkName).toBe('Unknown Network');
  });

  it('returns network shortName when chainId matches NetworkList', () => {
    const chainId = '0x1' as Hex;
    mockNetworkConfigurationsByChainId[chainId] = {
      name: 'Ethereum Main Network',
    };

    const networkName = getNetworkName(chainId);

    expect(networkName).toBe('Ethereum');
  });

  it('returns nickname when NetworkList does not contain the chainId', () => {
    const chainId = '0x89' as Hex;
    mockNetworkConfigurationsByChainId[chainId] = {
      name: 'Polygon Mainnet',
    };

    const networkName = getNetworkName(chainId);

    expect(networkName).toBe('Polygon Mainnet');
  });

  it('returns chainId when neither shortName nor nickname exists', () => {
    const chainId = '0x539' as Hex;

    const networkName = getNetworkName(chainId);

    expect(networkName).toBe(chainId);
  });
});
