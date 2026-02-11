import '../../../../../../util/test/component-view/mocks';
import { renderComponentViewScreen } from '../../../../../../util/test/component-view/render';
import { initialStateWallet } from '../../../../../../util/test/component-view/presets/wallet';
import { describeForPlatforms } from '../../../../../../util/test/platform';
import React from 'react';
import { View } from 'react-native';
import MusdConversionAssetListCta from './index';
import { EARN_TEST_IDS } from '../../../constants/testIds';

// Wrapper component to render the CTA in a screen context
const MusdConversionAssetListCtaScreen = () => (
  <View>
    <MusdConversionAssetListCta />
  </View>
);

describeForPlatforms('MusdConversionAssetListCta', () => {
  it('hides CTA when feature flag disabled', () => {
    // Arrange
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdCtaEnabled: { enabled: false },
        earnMusdConversionFlowEnabled: { enabled: true },
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
      MusdConversionAssetListCtaScreen,
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      queryByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
    ).toBeNull();
  });

  it('hides CTA when conversion flow feature flag disabled', () => {
    // Arrange
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: false },
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
      MusdConversionAssetListCtaScreen,
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    expect(
      queryByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
    ).toBeNull();
  });

  it('does not render CTA when visibility conditions are not met', () => {
    // Arrange
    // Component visibility depends on complex hook logic that requires
    // specific state configuration. When conditions aren't met, component returns null.
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdCtaEnabled: { enabled: true },
        earnMusdConversionFlowEnabled: { enabled: true },
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
      MusdConversionAssetListCtaScreen,
      { name: 'TestScreen' },
      { state },
    );

    // Assert
    // Component returns null when visibility conditions are not met
    // This test verifies the component handles the case gracefully without crashing
    const cta = queryByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA);
    // When conditions aren't met, component should return null
    expect(cta).toBeNull();
  });
});
