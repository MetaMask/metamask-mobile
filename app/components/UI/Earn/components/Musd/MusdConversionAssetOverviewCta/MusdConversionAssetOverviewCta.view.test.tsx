import '../../../../../../util/test/component-view/mocks';
import { renderComponentViewScreen } from '../../../../../../util/test/component-view/render';
import { initialStateWallet } from '../../../../../../util/test/component-view/presets/wallet';
import { describeForPlatforms } from '../../../../../../util/test/platform';
import React from 'react';
import { View } from 'react-native';
import MusdConversionAssetOverviewCta from './index';
import { EARN_TEST_IDS } from '../../../constants/testIds';
import { fireEvent } from '@testing-library/react-native';

// Wrapper component to render the CTA in a screen context
const MusdConversionAssetOverviewCtaScreen = ({
  asset,
  onDismiss,
}: {
  asset: { symbol: string; address: string; chainId: string };
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
      () => <MusdConversionAssetOverviewCtaScreen asset={mockAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('displays CTA text correctly', () => {
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

    const { getByText } = renderComponentViewScreen(
      () => <MusdConversionAssetOverviewCtaScreen asset={mockAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    expect(getByText('Boost your stablecoin balance')).toBeOnTheScreen();
    expect(
      getByText(/Earn a bonus every time you convert stablecoins to/),
    ).toBeOnTheScreen();
    expect(getByText('mUSD')).toBeOnTheScreen();
  });

  it('renders close button when onDismiss is provided', () => {
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

    expect(
      getByTestId(
        EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA_CLOSE_BUTTON,
      ),
    ).toBeOnTheScreen();
  });

  it('does not render close button when onDismiss is not provided', () => {
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

    const { queryByTestId } = renderComponentViewScreen(
      () => <MusdConversionAssetOverviewCtaScreen asset={mockAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    expect(
      queryByTestId(
        EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA_CLOSE_BUTTON,
      ),
    ).toBeNull();
  });

  it('calls onDismiss when close button is pressed', () => {
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

    fireEvent.press(
      getByTestId(
        EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA_CLOSE_BUTTON,
      ),
    );

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders CTA when asset is not in allowlist', () => {
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

    const { queryByTestId } = renderComponentViewScreen(
      () => (
        <MusdConversionAssetOverviewCtaScreen asset={mockAssetNotInAllowlist} />
      ),
      { name: 'TestScreen' },
      { state },
    );

    // Component always renders, but visibility is controlled by parent
    // The parent would hide it based on shouldShowAssetOverviewCta hook
    expect(
      queryByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('renders CTA when asset balance is above minimum', () => {
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

    const { getByTestId } = renderComponentViewScreen(
      () => (
        <MusdConversionAssetOverviewCtaScreen asset={mockAssetWithBalance} />
      ),
      { name: 'TestScreen' },
      { state },
    );

    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('renders CTA for different asset symbols', () => {
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

    const { getByTestId } = renderComponentViewScreen(
      () => <MusdConversionAssetOverviewCtaScreen asset={mockDAIAsset} />,
      { name: 'TestScreen' },
      { state },
    );

    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('renders CTA when asset address is missing', () => {
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

    // Component should still render, error handling happens in handlePress
    const { getByTestId } = renderComponentViewScreen(
      () => (
        <MusdConversionAssetOverviewCtaScreen asset={mockAssetWithoutAddress} />
      ),
      { name: 'TestScreen' },
      { state },
    );

    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });
});
