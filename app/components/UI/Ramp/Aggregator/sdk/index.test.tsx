import React from 'react';
import { Text } from 'react-native';
import { act } from '@testing-library/react-native';
import { CryptoCurrency } from '@consensys/on-ramp-sdk';
import { RampSDKProvider, useRampSDK } from './index';
import { RampType } from '../types';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

const mockGetSelectedAccount = jest.fn();
const mockSelectRampWalletAddress = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: mockGetSelectedAccount,
    },
  },
}));

jest.mock('../../../../../selectors/ramp', () => ({
  selectRampWalletAddress: jest.fn((state, asset) =>
    mockSelectRampWalletAddress(state, asset),
  ),
}));

describe('RampSDKProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSelectedAccount.mockReturnValue({
      id: 'test-account-id',
      address: '0x123456789',
      scopes: ['eip155:1'],
    });
    mockSelectRampWalletAddress.mockReturnValue('0x123456789');
  });

  it('should provide correct initial values for buy ramp type', () => {
    let contextValue: ReturnType<typeof useRampSDK> | undefined;
    const TestComponent = () => {
      contextValue = useRampSDK();
      return <Text>Test Component</Text>;
    };

    renderWithProvider(
      <RampSDKProvider rampType={RampType.BUY}>
        <TestComponent />
      </RampSDKProvider>,
      {
        state: {
          engine: { backgroundState },
          fiatOrders: {
            getStartedAgg: false,
            getStartedSell: false,
            selectedRegionAgg: null,
            selectedPaymentMethodAgg: null,
          },
        },
      },
    );

    expect(contextValue?.rampType).toBe(RampType.BUY);
    expect(contextValue?.isBuy).toBe(true);
    expect(contextValue?.isSell).toBe(false);
    expect(contextValue?.selectedAsset).toBe(null);
  });

  it('should provide correct initial values for sell ramp type', () => {
    let contextValue: ReturnType<typeof useRampSDK> | undefined;
    const TestComponent = () => {
      contextValue = useRampSDK();
      return <Text>Test Component</Text>;
    };

    renderWithProvider(
      <RampSDKProvider rampType={RampType.SELL}>
        <TestComponent />
      </RampSDKProvider>,
      {
        state: {
          engine: { backgroundState },
          fiatOrders: {
            getStartedAgg: false,
            getStartedSell: false,
            selectedRegionAgg: null,
            selectedPaymentMethodAgg: null,
          },
        },
      },
    );

    expect(contextValue?.rampType).toBe(RampType.SELL);
    expect(contextValue?.isBuy).toBe(false);
    expect(contextValue?.isSell).toBe(true);
  });
});

describe('Clear incompatible assets when account changes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not clear asset when multichain accounts is disabled', () => {
    mockGetSelectedAccount.mockReturnValue({
      id: 'test-account-id',
      address: '0x123456789',
      scopes: ['eip155:1'],
    });

    let contextValue: ReturnType<typeof useRampSDK> | undefined;
    const TestComponent = () => {
      contextValue = useRampSDK();
      return <Text>Test Component</Text>;
    };

    const stateWithMultichainDisabled = {
      engine: {
        backgroundState: {
          ...backgroundState,
          RemoteFeatureFlagController: {
            ...backgroundState.RemoteFeatureFlagController,
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: false,
                version: '1',
              },
            },
          },
        },
      },
      fiatOrders: {
        getStartedAgg: false,
        getStartedSell: false,
        selectedRegionAgg: null,
        selectedPaymentMethodAgg: null,
      },
    };

    renderWithProvider(
      <RampSDKProvider rampType={RampType.BUY}>
        <TestComponent />
      </RampSDKProvider>,
      { state: stateWithMultichainDisabled },
    );

    const solanaAsset = {
      id: 'solana-usdc',
      network: { chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
    } as CryptoCurrency;

    act(() => {
      contextValue?.setSelectedAsset(solanaAsset);
    });

    expect(contextValue?.selectedAsset).toBe(solanaAsset);
  });

  it('should execute multichain asset clearing logic when component renders', () => {
    mockGetSelectedAccount.mockReturnValue({
      id: 'evm-account-id',
      address: '0x123456789',
      scopes: ['eip155:1'],
    });

    let contextValue: ReturnType<typeof useRampSDK> | undefined;
    const TestComponent = () => {
      contextValue = useRampSDK();
      return <Text>Test Component</Text>;
    };

    const stateWithMultichainEnabled = {
      engine: {
        backgroundState: {
          ...backgroundState,
          RemoteFeatureFlagController: {
            ...backgroundState.RemoteFeatureFlagController,
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: true,
                version: '1',
              },
            },
          },
        },
      },
      fiatOrders: {
        getStartedAgg: false,
        getStartedSell: false,
        selectedRegionAgg: null,
        selectedPaymentMethodAgg: null,
      },
    };

    renderWithProvider(
      <RampSDKProvider rampType={RampType.BUY}>
        <TestComponent />
      </RampSDKProvider>,
      { state: stateWithMultichainEnabled },
    );

    expect(contextValue?.selectedAddress).toBe('0x123456789');
  });

  it('should not clear Solana asset when current account has Solana scopes', () => {
    mockGetSelectedAccount.mockReturnValue({
      id: 'multichain-account-id',
      address: '0x123456789',
      scopes: ['eip155:1', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    });

    let contextValue: ReturnType<typeof useRampSDK> | undefined;
    const TestComponent = () => {
      contextValue = useRampSDK();
      return <Text>Test Component</Text>;
    };

    const stateWithMultichainEnabled = {
      engine: {
        backgroundState: {
          ...backgroundState,
          RemoteFeatureFlagController: {
            ...backgroundState.RemoteFeatureFlagController,
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: true,
                version: '1',
              },
            },
          },
        },
      },
      fiatOrders: {
        getStartedAgg: false,
        getStartedSell: false,
        selectedRegionAgg: null,
        selectedPaymentMethodAgg: null,
      },
    };

    renderWithProvider(
      <RampSDKProvider rampType={RampType.BUY}>
        <TestComponent />
      </RampSDKProvider>,
      { state: stateWithMultichainEnabled },
    );

    const solanaAsset = {
      id: 'solana-usdc',
      network: { chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
    } as CryptoCurrency;

    act(() => {
      contextValue?.setSelectedAsset(solanaAsset);
    });

    expect(contextValue?.selectedAsset).toBe(solanaAsset);
  });

  it('should not clear EVM asset regardless of account scopes', () => {
    mockGetSelectedAccount.mockReturnValue({
      id: 'solana-account-id',
      address: 'solana-address',
      scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    });

    let contextValue: ReturnType<typeof useRampSDK> | undefined;
    const TestComponent = () => {
      contextValue = useRampSDK();
      return <Text>Test Component</Text>;
    };

    const stateWithMultichainEnabled = {
      engine: {
        backgroundState: {
          ...backgroundState,
          RemoteFeatureFlagController: {
            ...backgroundState.RemoteFeatureFlagController,
            remoteFeatureFlags: {
              enableMultichainAccounts: {
                enabled: true,
                version: '1',
              },
            },
          },
        },
      },
      fiatOrders: {
        getStartedAgg: false,
        getStartedSell: false,
        selectedRegionAgg: null,
        selectedPaymentMethodAgg: null,
      },
    };

    renderWithProvider(
      <RampSDKProvider rampType={RampType.BUY}>
        <TestComponent />
      </RampSDKProvider>,
      { state: stateWithMultichainEnabled },
    );

    const evmAsset = {
      id: 'ethereum-usdc',
      network: { chainId: '0x1' },
    } as CryptoCurrency;

    act(() => {
      contextValue?.setSelectedAsset(evmAsset);
    });

    expect(contextValue?.selectedAsset).toBe(evmAsset);
  });
});
