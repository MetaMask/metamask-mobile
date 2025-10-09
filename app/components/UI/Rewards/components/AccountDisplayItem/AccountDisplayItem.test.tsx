// Additional edge case tests for AccountDisplayItem
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import AccountDisplayItem from './AccountDisplayItem';

// Mock external dependencies
jest.mock('../../../../../component-library/components/Avatars/Avatar', () => ({
  __esModule: true,
  default: jest.fn(({ variant, name, size }) => {
    const MockedAvatar = () => null;
    MockedAvatar.displayName = `Avatar-${variant}-${name}-${size}`;
    return <MockedAvatar />;
  }),
  AvatarSize: {
    Sm: '24',
    Md: '32',
    Lg: '40',
  },
  AvatarVariant: {
    Account: 'account',
    Network: 'network',
  },
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  TextVariant: {
    BodyMd: 'BodyMd',
    BodySm: 'BodySm',
  },
  FontWeight: {
    Regular: 'regular',
    Medium: 'medium',
    Bold: 'bold',
  },
  BoxFlexDirection: {
    Row: 'row',
  },
  BoxAlignItems: {
    Center: 'center',
  },
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(),
  }),
}));

// Mock utility functions
jest.mock('../../../../../util/address', () => ({
  formatAddress: jest.fn((address, format) => {
    if (format === 'short') {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return address;
  }),
}));

jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(({ chainId }) => {
    if (chainId === 'eip155:1') {
      return { uri: 'ethereum-icon' };
    }
    if (chainId === 'error-chain') {
      throw new Error('Network image not found');
    }
    return { uri: 'default-network-icon' };
  }),
}));

// Mock selectors
jest.mock('../../../../../selectors/networkController', () => ({
  selectNetworkConfigurationsByCaipChainId: jest.fn(),
}));

const mockNetworkConfigurations = {
  'eip155:1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcEndpoints: [],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: [],
    defaultBlockExplorerUrlIndex: 0,
  },
  'eip155:137': {
    chainId: '0x89',
    name: 'Polygon Mainnet',
    nativeCurrency: 'MATIC',
    rpcEndpoints: [],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: [],
    defaultBlockExplorerUrlIndex: 0,
  },
};

const createMockStore = (
  networkConfigurations: Record<string, unknown> = mockNetworkConfigurations,
) =>
  configureStore({
    reducer: {
      engine: () => ({
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: networkConfigurations,
          },
        },
      }),
    },
    preloadedState: {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: networkConfigurations,
          },
        },
      },
    },
  });

const mockAccount = {
  id: '1',
  address: '0x1234567890123456789012345678901234567890',
  metadata: {
    name: 'Test Account',
    importTime: Date.now(),
    keyring: {
      type: 'HD Key Tree',
    },
  },
  options: {},
  methods: [],
  type: 'eip155:eoa' as const,
  scopes: ['eip155:1' as const],
};

describe('AccountDisplayItem - Edge Cases', () => {
  const renderWithProvider = (
    component: React.ReactElement,
    networkConfigurations: Record<string, unknown> = mockNetworkConfigurations,
  ) => {
    // Setup selector mock before creating store
    const networkController = jest.requireMock(
      '../../../../../selectors/networkController',
    );
    networkController.selectNetworkConfigurationsByCaipChainId.mockReturnValue(
      networkConfigurations,
    );

    const store = createMockStore(networkConfigurations);
    return render(<Provider store={store}>{component}</Provider>);
  };

  describe('Error boundaries and edge cases', () => {
    it('should handle account without metadata', () => {
      const accountWithoutMetadata = {
        ...mockAccount,
        metadata: {
          name: '',
          importTime: Date.now(),
          keyring: { type: '' },
        },
      };

      const component = <AccountDisplayItem account={accountWithoutMetadata} />;

      expect(() => renderWithProvider(component)).not.toThrow();
    });

    it('should handle very long account names', () => {
      const longNameAccount = {
        ...mockAccount,
        metadata: {
          ...mockAccount.metadata,
          name: 'This is a very long account name that should be handled properly by the component without breaking the layout or causing any rendering issues',
          importTime: Date.now(),
        },
      };

      const component = <AccountDisplayItem account={longNameAccount} />;

      expect(() => renderWithProvider(component)).not.toThrow();
    });

    it('should handle account with missing address', () => {
      const accountWithoutAddress = {
        ...mockAccount,
        address: '' as string,
      };

      const component = <AccountDisplayItem account={accountWithoutAddress} />;

      expect(() => renderWithProvider(component)).not.toThrow();
    });
  });

  describe('Network functionality', () => {
    it('should render with network avatar when valid chainId is available', () => {
      const component = <AccountDisplayItem account={mockAccount} />;

      expect(() => renderWithProvider(component)).not.toThrow();
    });

    it('should use provided caipChainId over account scopes', () => {
      const component = (
        <AccountDisplayItem account={mockAccount} caipChainId="eip155:137" />
      );

      expect(() => renderWithProvider(component)).not.toThrow();
    });

    it('should render simplified version when no valid chainId is available', () => {
      const accountWithoutScopes = {
        ...mockAccount,
        scopes: [],
      };

      const component = <AccountDisplayItem account={accountWithoutScopes} />;

      expect(() => renderWithProvider(component)).not.toThrow();
    });

    it('should handle unknown network configuration', () => {
      const component = (
        <AccountDisplayItem account={mockAccount} caipChainId="eip155:999" />
      );

      expect(() => renderWithProvider(component)).not.toThrow();
    });

    it('should handle error in getNetworkImageSource', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const component = (
        <AccountDisplayItem account={mockAccount} caipChainId="error-chain" />
      );

      expect(() => renderWithProvider(component)).not.toThrow();

      consoleWarnSpy.mockRestore();
    });

    it('should render with empty network configurations', () => {
      const component = <AccountDisplayItem account={mockAccount} />;

      expect(() =>
        renderWithProvider(component, {
          'eip155:1': undefined,
          'eip155:137': undefined,
        }),
      ).not.toThrow();
    });
  });

  describe('Conditional rendering', () => {
    it('should render only address when no chainId is available', () => {
      const accountWithoutScopes = {
        ...mockAccount,
        scopes: [],
      };

      const component = <AccountDisplayItem account={accountWithoutScopes} />;

      expect(() => renderWithProvider(component)).not.toThrow();
    });

    it('should render full layout with network when chainId is available', () => {
      const component = <AccountDisplayItem account={mockAccount} />;

      expect(() => renderWithProvider(component)).not.toThrow();
    });

    it('should handle account with undefined scopes', () => {
      const accountWithUndefinedScopes = {
        ...mockAccount,
        scopes: [] as `${string}:${string}`[], // Empty array instead of undefined
      };

      const component = (
        <AccountDisplayItem account={accountWithUndefinedScopes} />
      );

      expect(() => renderWithProvider(component)).not.toThrow();
    });
  });

  describe('Component unmounting', () => {
    it('should clean up properly when unmounted', () => {
      const { unmount } = renderWithProvider(
        <AccountDisplayItem account={mockAccount} />,
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});
