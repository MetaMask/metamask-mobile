import '../../../../../../util/test/component-view/mocks';
import { renderComponentViewScreen } from '../../../../../../util/test/component-view/render';
import { initialStateWallet } from '../../../../../../util/test/component-view/presets/wallet';
import { describeForPlatforms } from '../../../../../../util/test/platform';
import React from 'react';
import { View } from 'react-native';
import MusdConversionAssetOverviewCta from './index';
import { EARN_TEST_IDS } from '../../../constants/testIds';
import { MUSD_CONVERSION_APY } from '../../../constants/musd';
import { fireEvent } from '@testing-library/react-native';
import { TokenI } from '../../../../Tokens/types';

// Wrapper component to render the CTA in a screen context
const MusdConversionAssetOverviewCtaScreen = ({
  asset,
  onDismiss,
}: {
  asset: TokenI;
  onDismiss?: () => void;
}) => (
  <View>
    <MusdConversionAssetOverviewCta asset={asset} onDismiss={onDismiss} />
  </View>
);

describeForPlatforms('MusdConversionAssetOverviewCta', () => {
  const mockAsset = {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: '0x1',
    symbol: 'USDC',
    aggregators: [],
    decimals: 6,
    image: 'https://example.com/usdc.png',
    name: 'USD Coin',
    balance: '1000000000',
    logo: 'https://example.com/usdc.png',
    isETH: false,
  };

  it('renders CTA with asset', () => {
    // Arrange
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { getByTestId } = renderComponentViewScreen(
      () => <MusdConversionAssetOverviewCtaScreen asset={mockAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('displays CTA text correctly', () => {
    // Arrange
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { getByText } = renderComponentViewScreen(
      () => <MusdConversionAssetOverviewCtaScreen asset={mockAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      getByText(`Get ${MUSD_CONVERSION_APY}% on your stablecoins`),
    ).toBeOnTheScreen();
    expect(
      getByText(
        `Convert your stablecoins to mUSD and receive up to a ${MUSD_CONVERSION_APY}% bonus.`,
      ),
    ).toBeOnTheScreen();
  });

  it('renders close button when onDismiss is provided', () => {
    // Arrange
    const mockOnDismiss = jest.fn();

    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { getByTestId } = renderComponentViewScreen(
      () => (
        <MusdConversionAssetOverviewCtaScreen
          asset={mockAsset}
          onDismiss={mockOnDismiss}
        />
      ),
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      getByTestId(
        EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA_CLOSE_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it('does not render close button when onDismiss is not provided', () => {
    // Arrange
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { queryByTestId } = renderComponentViewScreen(
      () => <MusdConversionAssetOverviewCtaScreen asset={mockAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      queryByTestId(
        EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA_CLOSE_BUTTON,
      ),
    ).toBeNull();
  });

  it('calls onDismiss when close button is pressed', () => {
    // Arrange
    const mockOnDismiss = jest.fn();

    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByTestId } = renderComponentViewScreen(
      () => (
        <MusdConversionAssetOverviewCtaScreen
          asset={mockAsset}
          onDismiss={mockOnDismiss}
        />
      ),
      { name: 'TestScreen' },
      { state },
    );

    // Act
    fireEvent.press(
      getByTestId(
        EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA_CLOSE_BUTTON,
      ),
    );

    // Assert
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders CTA component as presentational component regardless of allowlist', () => {
    // Arrange
    const mockAssetNotInAllowlist = {
      ...mockAsset,
      symbol: 'USDT', // Not in allowlist
    };

    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] }, // Only USDC in allowlist
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { queryByTestId } = renderComponentViewScreen(
      () => (
        <MusdConversionAssetOverviewCtaScreen asset={mockAssetNotInAllowlist} />
      ),
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    // Component always renders when called - it's a presentational component
    // Visibility logic (including allowlist checks) is handled by the parent
    // component via shouldShowAssetOverviewCta hook, not by this component itself
    expect(
      queryByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('renders CTA when asset balance is above minimum', () => {
    // Arrange
    const mockAssetWithBalance = {
      ...mockAsset,
      balance: '1000000000', // 1000 USDC (above minimum)
    };

    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] },
        earnMusdConversionMinAssetBalanceRequired: 0.01,
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { getByTestId } = renderComponentViewScreen(
      () => (
        <MusdConversionAssetOverviewCtaScreen asset={mockAssetWithBalance} />
      ),
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('renders CTA for different asset symbols', () => {
    // Arrange
    const mockDAIAsset = {
      ...mockAsset,
      symbol: 'DAI',
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    };

    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['DAI', 'USDC'] },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { getByTestId } = renderComponentViewScreen(
      () => <MusdConversionAssetOverviewCtaScreen asset={mockDAIAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('renders CTA when asset address is missing', () => {
    // Arrange
    const mockAssetWithoutAddress = {
      ...mockAsset,
      address: '',
    };

    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    // Component should still render, error handling happens in handlePress
    const { getByTestId } = renderComponentViewScreen(
      () => (
        <MusdConversionAssetOverviewCtaScreen asset={mockAssetWithoutAddress} />
      ),
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('renders CTA with asset having low balance', () => {
    // Arrange
    const mockAssetLowBalance = {
      ...mockAsset,
      balance: '1000', // 0.001 USDC (very low)
    };

    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] },
        earnMusdConversionMinAssetBalanceRequired: 0.01,
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { getByTestId } = renderComponentViewScreen(
      () => (
        <MusdConversionAssetOverviewCtaScreen asset={mockAssetLowBalance} />
      ),
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    // Component renders regardless of balance - balance check is in parent
    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('renders CTA for asset on different chain', () => {
    // Arrange
    const mockLineaAsset = {
      ...mockAsset,
      chainId: '0xe708', // Linea Mainnet
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    };

    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { getByTestId } = renderComponentViewScreen(
      () => <MusdConversionAssetOverviewCtaScreen asset={mockLineaAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('renders CTA with correct boost title text', () => {
    // Arrange
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { getByText } = renderComponentViewScreen(
      () => <MusdConversionAssetOverviewCtaScreen asset={mockAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      getByText(`Get ${MUSD_CONVERSION_APY}% on your stablecoins`),
    ).toBeOnTheScreen();
  });

  it('renders CTA with correct boost description text', () => {
    // Arrange
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC'] },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { getByText } = renderComponentViewScreen(
      () => <MusdConversionAssetOverviewCtaScreen asset={mockAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      getByText(
        `Convert your stablecoins to mUSD and receive up to a ${MUSD_CONVERSION_APY}% bonus.`,
      ),
    ).toBeOnTheScreen();
  });

  it('renders CTA for USDT asset when in allowlist', () => {
    // Arrange
    const mockUSDTAsset = {
      ...mockAsset,
      symbol: 'USDT',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      name: 'Tether USD',
    };

    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdConversionAssetOverviewCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
        earnMusdConversionCtaTokens: { '*': ['USDC', 'USDT'] },
      })
      .withOverrides({
        engine: {
          backgroundState: {
            AssetsController: {
              assets: {},
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    // Act
    const { getByTestId } = renderComponentViewScreen(
      () => <MusdConversionAssetOverviewCtaScreen asset={mockUSDTAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });
});
