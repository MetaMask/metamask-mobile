/*
 * Rewards Money builder-fee-address integration harness.
 *
 * Covers the seam RWDS-1675 sits on: the Hyperliquid mainnet builder address
 * the mobile Perps client config supplies must be the same configured address
 * the Rewards grant matcher (`RewardsController.getPerpsTradingFeeGrant`)
 * compares backend grants against, so Perps fee attribution stays correct.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REAL (runs production code paths):
 *   - `createMobileClientConfig` — the app's Perps client configuration,
 *     including the Hyperliquid mainnet builder address it trades with
 *   - `RewardsController` — its trading-fee-grant matcher and validation
 *     chain (status, bips, expiry, builder-code comparison)
 *   - `getHyperliquidMainnetBuilderAddress` — the shared address source
 *
 * MOCKED (app-shell glue + the I/O boundary):
 *   - `RewardsControllerMessenger` — `RewardsDataService:*` calls are the
 *     network boundary; the stub is injected, no module mock
 *   - Engine, analytics, Sentry, trace, storage, stream manager, WebView
 *     signer bridge and formatter glue that the mobile infrastructure
 *     adapter imports for its wider surface — none of it runs on this path
 *   - `util/address`, snap signers, Multichain utils, Logger and the
 *     subscription-token vault that the Rewards controller module imports
 * ─────────────────────────────────────────────────────────────────────────
 */

import { BUILDER_FEE_CONFIG } from '@metamask/perps-controller';
import type { PerpsControllerConfig } from '@metamask/perps-controller';
import { createMobileClientConfig } from '../../../app/components/UI/Perps/adapters/mobileInfrastructure';
import { RewardsController } from '../../../app/core/Engine/controllers/rewards-controller/RewardsController';
import { getHyperliquidMainnetBuilderAddress } from '../../../app/core/Engine/controllers/rewards-controller/utils/hyperliquid-builder-address';
import type { TradingFeeGrantResponseDto } from '../../../app/core/Engine/controllers/rewards-controller/types';
import type { RewardsControllerMessenger } from '../../../app/core/Engine/messengers/rewards-controller-messenger';
import { getRewardsControllerDefaultState } from '../../../app/core/Engine/controllers/rewards-controller/defaultState';

jest.mock('../../../app/util/Logger');
jest.mock('../../../app/core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));
jest.mock('../../../app/core/Analytics', () => ({
  MetaMetricsEvents: {},
}));
jest.mock('../../../app/util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(() => ({})),
    })),
  },
}));
jest.mock('../../../app/util/analytics/analytics', () => ({
  analytics: { isEnabled: jest.fn(() => false), trackEvent: jest.fn() },
}));
jest.mock('../../../app/util/trace', () => ({
  trace: jest.fn(),
  endTrace: jest.fn(),
  setTraceMeasurement: jest.fn(),
  TraceName: {},
  TraceOperation: {},
}));
jest.mock('@sentry/react-native', () => ({
  setMeasurement: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock('react-native-performance', () => ({
  now: jest.fn(() => 0),
}));
jest.mock('../../../app/components/UI/Perps/utils/perpsLoadingSession', () => ({
  getActivePerpsLoadingSessionTraceData: jest.fn(() => undefined),
  recordPerpsControllerConstructedAt: jest.fn(),
}));
jest.mock(
  '../../../app/components/UI/Perps/providers/PerpsStreamManager',
  () => ({
    getStreamManagerInstance: jest.fn(() => null),
  }),
);
jest.mock('../../../app/store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    getItemSync: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));
jest.mock('../../../app/store', () => ({
  store: { getState: jest.fn(() => ({})), dispatch: jest.fn() },
}));
jest.mock('../../../app/core/Engine', () => ({
  __esModule: true,
  default: { context: {}, controllerMessenger: { call: jest.fn() } },
}));
jest.mock(
  '../../../app/components/UI/Perps/services/PerpsCacheInvalidator',
  () => ({
    PerpsCacheInvalidator: { invalidate: jest.fn(), invalidateAll: jest.fn() },
  }),
);
jest.mock('../../../app/util/remoteFeatureFlag', () => ({
  validatedVersionGatedFeatureFlag: jest.fn(() => null),
  hasMinimumRequiredVersion: jest.fn(() => true),
}));
jest.mock('../../../app/selectors/featureFlagController/vipProgram', () => ({
  selectVipProgramEnabled: jest.fn(() => false),
}));
jest.mock('../../../app/components/UI/Perps/utils/formatUtils', () => ({
  formatVolume: jest.fn(),
  formatPerpsFiat: jest.fn(),
  PRICE_RANGES_UNIVERSAL: [],
}));
jest.mock('../../../app/util/intl', () => ({
  getIntlNumberFormatter: jest.fn(() => ({
    format: jest.fn((value: number) => `${value}`),
  })),
}));
jest.mock('../../../app/util/address', () => ({
  getKeyringByAddress: jest.fn(() => undefined),
  isHardwareAccount: jest.fn(() => false),
  isSnapAccount: jest.fn(() => false),
}));
jest.mock('../../../app/core/Multichain/utils', () => ({
  isNonEvmAddress: jest.fn(() => false),
  isBtcAccount: jest.fn(() => false),
  isTronAccount: jest.fn(() => false),
}));
jest.mock('@solana/addresses', () => ({
  isAddress: jest.fn(() => false),
}));
jest.mock('@metamask/controller-utils', () => ({
  toHex: jest.fn(() => '0x0'),
}));
jest.mock(
  '../../../app/core/Engine/controllers/rewards-controller/utils/solana-snap',
  () => ({
    signSolanaRewardsMessage: jest.fn(),
  }),
);
jest.mock(
  '../../../app/core/Engine/controllers/rewards-controller/utils/bitcoin-snap',
  () => ({
    signBitcoinRewardsMessage: jest.fn(),
  }),
);
jest.mock(
  '../../../app/core/Engine/controllers/rewards-controller/utils/tron-snap',
  () => ({
    signTronRewardsMessage: jest.fn(),
  }),
);
jest.mock(
  '../../../app/core/Engine/controllers/rewards-controller/utils/multi-subscription-token-vault',
  () => ({
    storeSubscriptionToken: jest.fn(),
    removeSubscriptionToken: jest.fn(),
    resetAllSubscriptionTokens: jest.fn(),
    getSubscriptionToken: jest.fn(),
  }),
);

/** The address RWDS-1675 gave the Terminal web interface, not the mobile app. */
export const TERMINAL_BUILDER_ADDRESS =
  '0xf5e3aef7366c8e5ccc5bdc62d34aed19080aeb36';

export interface RewardsMoneyBuilderFeeHarness {
  /** The client config the Perps controller is built with. */
  clientConfig: PerpsControllerConfig;
  /** The configured address both sides must agree on. */
  configuredBuilderAddress: string;
  /** The real Rewards controller whose grant matcher runs for real. */
  rewardsController: RewardsController;
  /** The data-service I/O boundary behind the controller. */
  messenger: {
    call: jest.Mock;
  };
  /** Restores the environment the harness changed. */
  restoreEnvironment: () => void;
}

/**
 * Builds the real client config and the real Rewards controller over a stub
 * messenger. Without `mainnetBuilderAddressOverride` the environment is left
 * clean so both sides resolve the Core default; with one, the override is
 * what both sides must resolve.
 */
export function buildRewardsMoneyBuilderFeeHarness({
  mainnetBuilderAddressOverride,
}: {
  mainnetBuilderAddressOverride?: string;
} = {}): RewardsMoneyBuilderFeeHarness {
  const savedMainnetBuilderAddress =
    process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET;
  const savedLighterProviderEnabled =
    process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;

  if (mainnetBuilderAddressOverride === undefined) {
    delete process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET;
  } else {
    process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET =
      mainnetBuilderAddressOverride;
  }
  delete process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;

  const clientConfig = createMobileClientConfig();

  const messenger = {
    call: jest.fn(),
    registerActionHandler: jest.fn(),
    registerMethodActionHandlers: jest.fn(),
    unregisterActionHandler: jest.fn(),
    publish: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    clearEventSubscriptions: jest.fn(),
    registerInitialEventPayload: jest.fn(),
  } as unknown as {
    call: jest.Mock;
  };
  const rewardsController = new RewardsController({
    messenger: messenger as unknown as RewardsControllerMessenger,
    state: getRewardsControllerDefaultState(),
    isDisabled: () => false,
  });

  return {
    clientConfig,
    configuredBuilderAddress: getHyperliquidMainnetBuilderAddress(),
    rewardsController,
    messenger,
    restoreEnvironment: () => {
      if (savedMainnetBuilderAddress === undefined) {
        delete process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET;
      } else {
        process.env.MM_PERPS_HL_BUILDER_ADDRESS_MAINNET =
          savedMainnetBuilderAddress;
      }
      if (savedLighterProviderEnabled === undefined) {
        delete process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED;
      } else {
        process.env.MM_PERPS_LIGHTER_PROVIDER_ENABLED =
          savedLighterProviderEnabled;
      }
    },
  };
}

/** A backend trading-fee grant carrying one builder code. */
export function tradingFeeGrantResponse(builderCode: string): {
  grant: TradingFeeGrantResponseDto['grant'];
} {
  return {
    grant: {
      programId: 'perps-builder-fee-experiment',
      hyperliquid: {
        builderCode,
        builderFeeBips: '2.5',
      },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
  };
}

export { BUILDER_FEE_CONFIG };
