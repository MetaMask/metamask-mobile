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

    const { queryByTestId } = renderComponentViewScreen(
      MusdConversionAssetListCtaScreen,
      { name: 'TestScreen' },
      { state },
    );

    expect(
      queryByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
    ).toBeNull();
  });

  it('hides CTA when conversion flow feature flag disabled', () => {
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

    const { queryByTestId } = renderComponentViewScreen(
      MusdConversionAssetListCtaScreen,
      { name: 'TestScreen' },
      { state },
    );

    expect(
      queryByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA),
    ).toBeNull();
  });
});
