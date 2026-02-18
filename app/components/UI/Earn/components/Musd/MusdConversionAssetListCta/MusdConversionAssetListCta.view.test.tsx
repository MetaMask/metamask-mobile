import '../../../../../../util/test/component-view/mocks';
import { renderComponentViewScreen } from '../../../../../../util/test/component-view/render';
import { initialStateWallet } from '../../../../../../util/test/component-view/presets/wallet';
import { describeForPlatforms } from '../../../../../../util/test/platform';
import React from 'react';
import { View } from 'react-native';
import MusdConversionAssetListCta from './index';
import { EARN_TEST_IDS } from '../../../constants/testIds';
import { initialState as initialFiatOrdersState } from '../../../../../../reducers/fiatOrders';

const fiatOrdersNoFetch = {
  ...initialFiatOrdersState,
  detectedGeolocation: undefined,
  rampRoutingDecision: null,
};

// Version-gated flags require { enabled, minimumVersion } so validatedVersionGatedFeatureFlag returns a boolean instead of undefined (env fallback).
const versionGatedFlag = (enabled: boolean) => ({
  enabled,
  minimumVersion: '0.0.0',
});

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
        earnMusdCtaEnabled: versionGatedFlag(false),
        earnMusdConversionFlowEnabled: versionGatedFlag(true),
      })
      .withOverrides({
        fiatOrders: fiatOrdersNoFetch,
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
        earnMusdCtaEnabled: versionGatedFlag(true),
        earnMusdConversionFlowEnabled: versionGatedFlag(false),
      })
      .withOverrides({
        fiatOrders: fiatOrdersNoFetch,
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

  it('does not render CTA when visibility conditions are not met', () => {
    const state = initialStateWallet()
      .withMinimalMultichainAssets()
      .withRemoteFeatureFlags({
        earnMusdCtaEnabled: versionGatedFlag(true),
        earnMusdConversionFlowEnabled: versionGatedFlag(true),
      })
      .withOverrides({
        fiatOrders: fiatOrdersNoFetch,
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

    const cta = queryByTestId(EARN_TEST_IDS.MUSD.ASSET_LIST_CONVERSION_CTA);
    expect(cta).toBeNull();
  });
});
