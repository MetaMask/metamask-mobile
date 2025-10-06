type RootStateLike = Record<string, unknown>;
import { initialState as bridgeInitialState } from '../../../../components/UI/Bridge/_mocks_/initialState';
import { selectNoFeeAssets } from './index';

interface BridgeFeatureFlagsChainConfig {
  noFeeAssets?: string[];
  isActiveSrc?: boolean;
  isActiveDest?: boolean;
}

type StateWithBridgeFlags = RootStateLike & {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          bridgeConfigV2: {
            chains: Record<string, BridgeFeatureFlagsChainConfig>;
          };
        };
      };
    };
  };
};

// Ensure remote feature flags are not overridden to empty
jest.mock('../../../Engine/controllers/remote-feature-flag-controller', () => ({
  ...jest.requireActual(
    '../../../Engine/controllers/remote-feature-flag-controller',
  ),
  isRemoteFeatureFlagOverrideActivated: false,
}));

// Avoid compareVersions path by forcing minimum version check to pass
jest.mock('./utils/hasMinimumRequiredVersion', () => ({
  hasMinimumRequiredVersion: () => true,
}));

describe('selectNoFeeAssets', () => {
  it("returns mUSD for chain '0x1' when bridgeConfigV2 lists it as no-fee", () => {
    const musd = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

    const state: Partial<RootStateLike> = {
      ...bridgeInitialState,
    } as unknown as RootStateLike;

    // Inject noFeeAssets for eip155:1 in remote feature flags
    const typedState = state as unknown as StateWithBridgeFlags;
    typedState.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags.bridgeConfigV2.chains[
      'eip155:1'
    ] = {
      ...(typedState.engine.backgroundState.RemoteFeatureFlagController
        .remoteFeatureFlags.bridgeConfigV2.chains['eip155:1'] || {}),
      noFeeAssets: [musd],
      isActiveSrc: true,
      isActiveDest: true,
    };

    const result = selectNoFeeAssets(
      typedState as unknown as Parameters<typeof selectNoFeeAssets>[0],
      '0x1',
    );
    expect(result).toEqual([musd]);
  });
});
