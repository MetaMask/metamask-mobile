import {
  getGanachePortForFixture,
  getAnvilPortForFixture,
  getMockServerPortForFixture,
  getDappUrl,
  getDappUrlForFixture,
} from './FixtureUtils.ts';
import { merge } from 'lodash';
import defaultFixture from './json/default-fixture.json';
import onboardingFixture from './json/onboarding-fixture.json';
import { encryptVault } from './helpers.ts';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { SolScope } from '@metamask/keyring-api';
import {
  Caip25CaveatType,
  Caip25CaveatValue,
  Caip25EndowmentPermissionName,
  getEthAccounts,
  setEthAccounts,
  setPermittedEthChainIds,
} from '@metamask/chain-agnostic-permission';
import {
  DEFAULT_TAB_ID,
  RampsRegions,
  RampsRegionsEnum,
} from '../Constants.ts';
import {
  CustomNetworks,
  PopularNetworksList,
} from '../../resources/networks.e2e';
import { BackupAndSyncSettings, RampsRegion } from '../types.ts';
import {
  MULTIPLE_ACCOUNTS_ACCOUNTS_CONTROLLER,
  TEST_ANALYTICS_ID,
} from './constants.ts';
import {
  MOCK_ENTROPY_SOURCE,
  MOCK_ENTROPY_SOURCE_2,
  MOCK_ENTROPY_SOURCE_3,
} from '../../../app/util/test/keyringControllerTestUtils.ts';
import { NetworkEnablementControllerState } from '@metamask/network-enablement-controller';
import { USDC_MAINNET, MUSD_MAINNET } from '../../constants/musd-mainnet.ts';

export const DEFAULT_FIXTURE_ACCOUNT_CHECKSUM =
  '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3';

export const DEFAULT_FIXTURE_ACCOUNT =
  DEFAULT_FIXTURE_ACCOUNT_CHECKSUM.toLowerCase() as Lowercase<
    typeof DEFAULT_FIXTURE_ACCOUNT_CHECKSUM
  >;

export const DEFAULT_FIXTURE_ACCOUNT_2 =
  '0xcdd74c6eb517f687aa2c786bc7484eb2f9bae1da';

export const DEFAULT_IMPORTED_FIXTURE_ACCOUNT =
  '0x43e1c289177ecfbe6ef34b5fb2b66ebce5a8e05b';

export const DEFAULT_SOLANA_FIXTURE_ACCOUNT =
  'CEQ87PmqFPA8cajAXYVrFT2FQobRrAT4Wd53FvfgYrrd';

// AccountTreeController Wallet and Group IDs - reused across fixtures
export const ENTROPY_WALLET_1_ID = `entropy:${MOCK_ENTROPY_SOURCE}`;
export const ENTROPY_WALLET_2_ID = `entropy:${MOCK_ENTROPY_SOURCE_2}`;
export const ENTROPY_WALLET_3_ID = `entropy:${MOCK_ENTROPY_SOURCE_3}`;
export const QR_HARDWARE_WALLET_ID = 'keyring:QR Hardware Wallet Device';
export const SIMPLE_KEYRING_WALLET_ID = 'keyring:Simple Key Pair';

// Snap Wallet IDs - using real Snap IDs from the codebase
export const SIMPLE_KEYRING_SNAP_ID =
  'snap:npm:@metamask/snap-simple-keyring-snap';
export const GENERIC_SNAP_WALLET_1_ID = 'snap:npm:@metamask/generic-snap-1';
export const GENERIC_SNAP_WALLET_2_ID = 'snap:npm:@metamask/generic-snap-2';

/**
 * Options for mUSD conversion E2E fixture state.
 */
export interface MusdFixtureOptions {
  musdConversionEducationSeen: boolean;
  hasUsdcBalance?: boolean;
  usdcBalance?: number;
  hasMusdBalance?: boolean;
  musdBalance?: number;
}

/**
 * FixtureBuilder class provides a fluent interface for building fixture data.
 */
class FixtureBuilder {
  // We currently have no type representation of the whole fixture state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fixture: any;

  /**
   * Create a new instance of FixtureBuilder.
   * @param {Object} options - Options for the fixture builder.
   * @param {boolean} options.onboarding - Flag indicating if onboarding fixture should be used.
   */
  constructor({ onboarding = false } = {}) {
    // Initialize the fixture based on the onboarding flag
    onboarding === true
      ? this.withOnboardingFixture()
      : this.withDefaultFixture();
  }

  /**
   * Set the asyncState property of the fixture.
   * @param {any} asyncState - The value to set for asyncState.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withAsyncState(asyncState: Record<string, unknown>) {
    this.fixture.asyncState = asyncState;
    return this;
  }

  /**
   * Set the state property of the fixture.
   * @param {any} state - The value to set for state.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withState(state: Record<string, unknown>) {
    this.fixture.state = state;
    return this;
  }

  /**
   * Ensures that the Solana feature modal is suppressed by adding the appropriate flag to asyncState.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  ensureSolanaModalSuppressed() {
    if (!this.fixture.asyncState) {
      this.fixture.asyncState = {};
    }
    this.fixture.asyncState['@MetaMask:solanaFeatureModalShownV2'] = 'true';
    return this;
  }

  /**
   * Ensures that the multichain accounts intro modal is suppressed by setting the appropriate flag.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  ensureMultichainIntroModalSuppressed() {
    if (!this.fixture?.state?.user) {
      this.fixture.state.user = {};
    }
    this.fixture.state.user.multichainAccountsIntroModalSeen = true;
    return this;
  }

  /**
   * Defines a Perps profile for E2E mocks.
   * The value is stored in the PerpsController state so that the mocks can read it.
   * @param profile Profile, e.g.: 'no-funds', 'default'.
   * @returns {FixtureBuilder}
   */
  withPerpsProfile(profile: string) {
    merge(this.fixture.state.engine.backgroundState.PerpsController, {
      // Field only for E2E; read by the mocks mixin
      mockProfile: profile,
    });
    return this;
  }

  /**
   * Forces the Perps first-time flag in the initial state.
   * @param firstTime true to show tutorial; false to mark as seen.
   */
  withPerpsFirstTimeUser(firstTime: boolean) {
    merge(this.fixture.state.engine.backgroundState.PerpsController, {
      isFirstTimeUser: {
        testnet: firstTime,
        mainnet: firstTime,
      },
    });
    return this;
  }

  withSolanaFeatureSheetDisplayed() {
    if (!this.fixture.asyncState) {
      this.fixture.asyncState = {};
    }
    this.fixture.asyncState = {
      '@MetaMask:existingUser': 'true',
      '@MetaMask:OptinMetaMetricsUISeen': 'true',
      '@MetaMask:UserTermsAcceptedv1.0': 'true',
      '@MetaMask:WhatsNewAppVersionSeen': '7.24.3',
      '@MetaMask:solanaFeatureModalShownV2': 'false',
    };
    return this;
  }

  /**
   * Set the showTestNetworks property of the fixture to false.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withTestNetworksOff() {
    this.fixture.state.engine.backgroundState.PreferencesController.showTestNetworks = false;
    return this;
  }

  /**
   * Set the default fixture values.
   * Uses JSON-based fixture with runtime-injected dynamic values.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withDefaultFixture() {
    // Deep clone the JSON fixture to avoid mutations
    this.fixture = JSON.parse(JSON.stringify(defaultFixture));

    // Inject dynamic values that can't be stored in static JSON
    // 1. Timestamp for legal notices
    this.fixture.state.legalNotices.newPrivacyPolicyToastShownDate = Date.now();

    // 2. Mock server port for browser tab URL
    this.fixture.state.browser.tabs[0].url = `http://localhost:${getMockServerPortForFixture()}/health-check`;

    // 3. Ganache port for localhost network RPC URL
    this.fixture.state.engine.backgroundState.NetworkController.networkConfigurationsByChainId[
      '0x539'
    ].rpcEndpoints[0].url = `http://localhost:${getGanachePortForFixture()}`;

    return this;
  }

  /**
   * Merges provided data into the background state of the PermissionController.
   * @param {object} data - Data to merge into the PermissionController's state.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withPermissionController(data: Record<string, unknown>) {
    merge(this.fixture.state.engine.backgroundState.PermissionController, data);
    return this;
  }

  /**
   * Merges provided data into the background state of the NetworkController.
   * @param {object} data - Data to merge into the NetworkController's state.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withNetworkController(data: Record<string, unknown>) {
    const networkController =
      this.fixture.state.engine.backgroundState.NetworkController;

    // Extract providerConfig data
    const { providerConfig } = data as {
      providerConfig: Record<string, unknown>;
    };

    // Generate a unique key for the new network client ID
    const newNetworkClientId = `networkClientId${
      Object.keys(networkController.networkConfigurationsByChainId).length + 1
    }`;

    // Define the network configuration
    const networkConfig = {
      chainId: providerConfig.chainId,
      rpcEndpoints: [
        {
          networkClientId: newNetworkClientId,
          url: providerConfig.rpcUrl,
          type: providerConfig.type,
          name: providerConfig.nickname,
        },
      ],
      defaultRpcEndpointIndex: 0,
      blockExplorerUrls: [],
      name: providerConfig.nickname,
      nativeCurrency: providerConfig.ticker,
    };

    // Add the new network configuration to the object
    networkController.networkConfigurationsByChainId[
      providerConfig.chainId as string
    ] = networkConfig;

    // Update selectedNetworkClientId to the new network client ID
    networkController.selectedNetworkClientId = newNetworkClientId;
    return this;
  }

  /**
   * Private helper method to create permission controller configuration
   * @private
   * @param {Object} additionalPermissions - Additional permissions to merge with permission
   * @returns {Object} Permission controller configuration object
   */
  createPermissionControllerConfig(
    additionalPermissions: Record<string, unknown> = {},
    dappUrl = getDappUrlForFixture(0),
  ) {
    const permission = additionalPermissions?.[
      Caip25EndowmentPermissionName
    ] as { caveats?: { type: string; value: Caip25CaveatValue }[] };
    const caip25CaveatValue =
      permission?.caveats?.find((caveat) => caveat.type === Caip25CaveatType)
        ?.value ??
      ({
        optionalScopes: {
          'eip155:1': { accounts: [] },
        },
        requiredScopes: {},
        sessionProperties: {},
        isMultichainOrigin: false,
      } as Caip25CaveatValue);

    const incomingEthAccounts = getEthAccounts(caip25CaveatValue);
    const permittedEthAccounts =
      incomingEthAccounts.length > 0
        ? incomingEthAccounts
        : [DEFAULT_FIXTURE_ACCOUNT_CHECKSUM];

    // Cast addresses to the required 0x${string} format
    const typedAddresses = permittedEthAccounts.map(
      (addr) => addr as `0x${string}`,
    );

    const basePermissionCaveatValue = setEthAccounts(
      caip25CaveatValue,
      typedAddresses,
    );

    const basePermissions = {
      [Caip25EndowmentPermissionName]: {
        id: 'ZaqPEWxyhNCJYACFw93jE',
        parentCapability: Caip25EndowmentPermissionName,
        invoker: dappUrl,
        caveats: [
          {
            type: Caip25CaveatType,
            value: basePermissionCaveatValue,
          },
        ],
        date: 1664388714636,
      },
    };

    return {
      subjects: {
        [dappUrl]: {
          origin: dappUrl,
          permissions: basePermissions,
        },
      },
    };
  }

  /**
   * Connects the PermissionController to a test dapp with specific accounts permissions and origins.
   * @param {Object} additionalPermissions - Additional permissions to merge.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withPermissionControllerConnectedToTestDapp(
    additionalPermissions = {},
    connectSecondDapp = false,
  ) {
    const testDappPermissions = this.createPermissionControllerConfig(
      additionalPermissions,
    );
    let secondDappPermissions = {};
    if (connectSecondDapp) {
      secondDappPermissions = this.createPermissionControllerConfig(
        additionalPermissions,
        getDappUrlForFixture(1),
      );
    }
    this.withPermissionController(
      merge(testDappPermissions, secondDappPermissions),
    );

    // Ensure Solana feature modal is suppressed
    return this.ensureSolanaModalSuppressed();
  }

  /**
   * @param {RampsRegion | null} region - The region to set, or null for default (Saint Lucia).
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   * @example
   * new FixtureBuilder()
   *   .withRampsSelectedRegion(RampsRegions[RampsRegionsEnum.UNITED_STATES])
   *   .build()
   */
  withRampsSelectedRegion(region: RampsRegion | null = null) {
    const defaultRegion = RampsRegions[RampsRegionsEnum.SAINT_LUCIA];
    const selectedRegion = region ?? defaultRegion;

    // Extracting the region code and currency
    const regionCode = selectedRegion.id.replace('/regions/', '').toLowerCase();
    const currencyPath = selectedRegion.currencies[0];
    const currency = currencyPath.split('/').pop()?.toUpperCase();

    // Create Country object for RampsController (uses different field names)
    const rampsControllerCountry = {
      isoCode: selectedRegion.countryIsoCode,
      name: selectedRegion.countryName,
      flag: selectedRegion.emoji,
      phone: {
        prefix: '',
        placeholder: '',
        template: '',
      },
      currency,
      supported: {
        buy: selectedRegion.support?.buy ?? true,
        sell: selectedRegion.support?.sell ?? true,
      },
    };

    // Create Country object for aggregator SDK (legacy sell/offramp flow)
    // Uses the SDK's Country type with fields: id, name, emoji, support, etc.
    const aggregatorCountry = {
      id: selectedRegion.id,
      name: selectedRegion.countryName,
      emoji: selectedRegion.emoji,
      currencies: selectedRegion.currencies,
      unsupported: selectedRegion.unsupported,
      hidden: false,
      states: selectedRegion.stateIsoCode
        ? [
            {
              id: `${selectedRegion.id}-${selectedRegion.stateIsoCode}`,
              name: selectedRegion.stateName || selectedRegion.name,
              stateId: selectedRegion.stateIsoCode,
              emoji: selectedRegion.emoji,
              unsupported: false,
              support: {
                buy: selectedRegion.support?.buy ?? true,
                sell: selectedRegion.support?.sell ?? true,
              },
              detected: selectedRegion.detected,
            },
          ]
        : [],
      support: {
        buy: selectedRegion.support?.buy ?? true,
        sell: selectedRegion.support?.sell ?? true,
      },
      recommended: selectedRegion.recommended,
      enableSell: selectedRegion.support?.sell ?? true,
      detected: selectedRegion.detected,
    };

    this.fixture.state.engine.backgroundState.RampsController.userRegion = {
      country: rampsControllerCountry,
      state: selectedRegion.stateIsoCode
        ? {
            stateId: selectedRegion.stateIsoCode,
            name: selectedRegion.stateName || selectedRegion.name,
            supported: {
              buy: selectedRegion.support?.buy ?? true,
              sell: selectedRegion.support?.sell ?? true,
            },
          }
        : null,
      regionCode,
    };

    // Also set the legacy fiatOrders.selectedRegionAgg for backwards compatibility
    // with the sell/offramp flow which still uses the aggregator SDK
    this.fixture.state.fiatOrders.selectedRegionAgg = aggregatorCountry;

    return this;
  }

  /**
   * Sets the selected payment method for the fiat orders.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withRampsSelectedPaymentMethod() {
    const paymentType = '/payments/debit-credit-card';

    // Use the provided region or fallback to the default
    this.fixture.state.fiatOrders.selectedPaymentMethodAgg = paymentType;
    return this;
  }

  /**
   * Adds chain switching permission for specific chains.
   * @param {string[]} chainIds - Array of chain IDs to permit (defaults to ['0x1']), other nexts like linea mainnet 0xe708
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withChainPermission(chainIds: `0x${string}`[] = ['0x1']) {
    const optionalScopes = chainIds
      .map((id) => ({
        [`eip155:${parseInt(id)}`]: { accounts: [] },
      }))
      .reduce((acc, obj) => ({ ...acc, ...obj }));

    const defaultCaip25CaveatValue = {
      optionalScopes,
      requiredScopes: {},
      sessionProperties: {},
      isMultichainOrigin: false,
    };

    const caip25CaveatValueWithChains = setPermittedEthChainIds(
      defaultCaip25CaveatValue,
      chainIds,
    );
    const caip25CaveatValueWithDefaultAccount = setEthAccounts(
      caip25CaveatValueWithChains,
      [DEFAULT_FIXTURE_ACCOUNT_CHECKSUM],
    );
    const chainPermission = {
      [Caip25EndowmentPermissionName]: {
        id: 'Lde5rzDG2bUF6HbXl4xxT',
        parentCapability: Caip25EndowmentPermissionName,
        invoker: 'localhost',
        caveats: [
          {
            type: Caip25CaveatType,
            value: caip25CaveatValueWithDefaultAccount,
          },
        ],
        date: 1732715918637,
      },
    };

    this.withPermissionController(
      this.createPermissionControllerConfig(chainPermission),
    );
    return this;
  }

  /**
   * Adds Solana account permissions for default fixture account.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withSolanaAccountPermission() {
    const caveatValue = {
      optionalScopes: {
        [SolScope.Mainnet]: {
          accounts: [`${SolScope.Mainnet}:${DEFAULT_SOLANA_FIXTURE_ACCOUNT}`],
        },
      },
      requiredScopes: {},
      sessionProperties: {},
      isMultichainOrigin: false,
    };

    const permissionConfig = {
      [Caip25EndowmentPermissionName]: {
        id: 'Lde5rzDG2bUF6HbXl4xxT',
        parentCapability: Caip25EndowmentPermissionName,
        invoker: 'localhost',
        caveats: [
          {
            type: Caip25CaveatType,
            value: caveatValue,
          },
        ],
        date: 1732715918637,
      },
    };

    this.withPermissionController(
      this.createPermissionControllerConfig(permissionConfig),
    );
    return this;
  }

  /**
   * Sets the user profile key ring in the fixture's background state.
   * @param {object} userState - The user state to set.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withUserProfileKeyRing(userState: any) {
    merge(
      this.fixture.state.engine.backgroundState.KeyringController,
      userState.KEYRING_CONTROLLER_STATE,
    );

    // Add accounts controller with the first account selected
    const firstAccountAddress =
      userState.KEYRING_CONTROLLER_STATE.keyrings[0].accounts[0];
    const accountId = '4d7a5e0b-b261-4aed-8126-43972b0fa0a1';

    merge(this.fixture.state.engine.backgroundState.AccountsController, {
      internalAccounts: {
        accounts: {
          [accountId]: {
            address: firstAccountAddress,
            id: accountId,
            metadata: {
              name: 'Account 1',
              importTime: 1684232000456,
              keyring: {
                type: 'HD Key Tree',
              },
            },
            options: {},
            methods: [
              'personal_sign',
              'eth_signTransaction',
              'eth_signTypedData_v1',
              'eth_signTypedData_v3',
              'eth_signTypedData_v4',
            ],
            type: 'eip155:eoa',
            scopes: ['eip155:1'],
          },
        },
        selectedAccount: accountId,
      },
    });

    return this;
  }

  /**
   * Sets the user profile snap unencrypted state in the fixture's background state.
   * @param {object} userState - The user state to set.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withUserProfileSnapUnencryptedState(userState: any) {
    merge(
      this.fixture.state.engine.backgroundState.SnapController,
      userState.SNAPS_CONTROLLER_STATE,
    );

    return this;
  }

  /**
   * Sets the user profile snap permissions in the fixture's background state.
   * @param {object} userState - The user state to set.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withUserProfileSnapPermissions(userState: any) {
    merge(
      this.fixture.state.engine.backgroundState.PermissionController,
      userState.PERMISSION_CONTROLLER_STATE,
    );
    return this;
  }

  /**
   * Sets the tokens for all popular networks in the fixture's background state.
   * @param tokens - The tokens to set.
   * @param userState - The user state to set.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withTokensForAllPopularNetworks(
    tokens: Record<string, unknown>[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userState: any = null,
  ) {
    // Get all popular network chain IDs using proper constants
    const popularChainIds = [
      CHAIN_IDS.MAINNET, // Ethereum Mainnet
      CHAIN_IDS.POLYGON, // Polygon Mainnet
      CHAIN_IDS.BSC, // BNB Smart Chain
      CHAIN_IDS.OPTIMISM, // Optimism
      CHAIN_IDS.ARBITRUM, // Arbitrum One
      CHAIN_IDS.AVALANCHE, // Avalanche C-Chain
      CHAIN_IDS.BASE, // Base
      CHAIN_IDS.ZKSYNC_ERA, // zkSync Era
      CHAIN_IDS.SEI, // Sei Mainnet
    ];

    // Use userState accounts if provided, otherwise fall back to MULTIPLE_ACCOUNTS_ACCOUNTS_CONTROLLER
    let allAccountAddresses: string[] = [];
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (userState && userState.KEYRING_CONTROLLER_STATE) {
      // Extract all account addresses from the user state keyring
      allAccountAddresses = userState.KEYRING_CONTROLLER_STATE.keyrings.flatMap(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (keyring: any) => keyring.accounts,
      );
    } else {
      // Fallback to the hardcoded accounts
      const accountsData =
        MULTIPLE_ACCOUNTS_ACCOUNTS_CONTROLLER.internalAccounts.accounts;
      allAccountAddresses = Object.values(accountsData).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (account: any) => account.address,
      );
    }

    // Create tokens object for all accounts
    const accountTokens: Record<string, Record<string, unknown>[]> = {};
    allAccountAddresses.forEach((address) => {
      accountTokens[address] = tokens;
    });

    const allTokens: Record<string, Record<string, unknown>> = {};

    // Add tokens to each popular network
    popularChainIds.forEach((chainId) => {
      allTokens[chainId] = accountTokens;
    });

    merge(this.fixture.state.engine.backgroundState.TokensController, {
      allTokens,
    });

    // we need to test this ...

    // Create token balances for TokenBalancesController
    // Structure: { [accountAddress]: { [chainId]: { [tokenAddress]: balance } } }
    const tokenBalances: Record<
      string,
      Record<string, Record<string, string>>
    > = {};

    allAccountAddresses.forEach((accountAddress, accountIndex) => {
      tokenBalances[accountAddress] = {};

      // Add balances for each popular network
      popularChainIds.forEach((chainId) => {
        tokenBalances[accountAddress][chainId] = {};

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tokens.forEach((token: any, tokenIndex: number) => {
          // Generate realistic but varied balances for testing
          // Using different multipliers to create variety across accounts and tokens
          const baseBalance = (accountIndex + 1) * (tokenIndex + 1) * 1000;
          const randomVariation = Math.floor(Math.random() * 5000);
          const finalBalance = baseBalance + randomVariation;

          // Convert to hex with proper padding for token decimals
          const balanceInWei = (
            finalBalance * Math.pow(10, token.decimals)
          ).toString(16);
          tokenBalances[accountAddress][chainId][token.address] =
            `0x${balanceInWei}`;
        });
      });
    });

    merge(this.fixture.state.engine.backgroundState.TokenBalancesController, {
      tokenBalances,
    });

    return this;
  }

  /**
   * Set the fixture to an empty object for onboarding.
   * Uses JSON-based fixture for consistency.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withOnboardingFixture() {
    // Deep clone the JSON fixture to avoid mutations
    this.fixture = JSON.parse(JSON.stringify(onboardingFixture));
    return this;
  }

  /**
   * @deprecated Use withNetworkController instead
   * @param chainId
   * @param port
   * @returns
   */
  withGanacheNetwork(chainId = '0x539', port = getAnvilPortForFixture()) {
    const fixtures = this.fixture.state.engine.backgroundState;

    // Generate a unique key for the new network client ID
    const newNetworkClientId = `networkClientId${
      Object.keys(fixtures.NetworkController.networkConfigurationsByChainId)
        .length + 1
    }`;

    // Define the Ganache network configuration
    const ganacheNetworkConfig = {
      chainId,
      rpcEndpoints: [
        {
          networkClientId: newNetworkClientId,
          url: `http://localhost:${port}`,
          type: 'custom',
          name: 'Localhost',
        },
      ],
      defaultRpcEndpointIndex: 0,
      defaultBlockExplorerUrlIndex: 0,
      blockExplorerUrls: ['https://test.io'],
      name: 'Localhost',
      nativeCurrency: 'ETH',
    };

    // Add the new Ganache network configuration
    fixtures.NetworkController.networkConfigurationsByChainId[chainId] =
      ganacheNetworkConfig;

    // Update selectedNetworkClientId to the new network client ID
    fixtures.NetworkController.selectedNetworkClientId = newNetworkClientId;

    // Ensure Solana feature modal is suppressed
    return this.ensureSolanaModalSuppressed();
  }

  withSepoliaNetwork() {
    const fixtures = this.fixture.state.engine.backgroundState;

    // Extract Sepolia network configuration from CustomNetworks
    const sepoliaConfig = CustomNetworks.Sepolia.providerConfig;

    // Generate a unique key for the new network client ID
    const newNetworkClientId = `networkClientId${
      Object.keys(fixtures.NetworkController.networkConfigurationsByChainId)
        .length + 1
    }`;

    // Define the Sepolia network configuration
    const sepoliaNetworkConfig = {
      chainId: sepoliaConfig.chainId,
      rpcEndpoints: [
        {
          networkClientId: newNetworkClientId,
          url: sepoliaConfig.rpcUrl,
          type: 'custom',
          name: sepoliaConfig.nickname,
        },
      ],
      defaultRpcEndpointIndex: 0,
      blockExplorerUrls: [],
      name: sepoliaConfig.nickname,
      nativeCurrency: sepoliaConfig.ticker,
    };

    // Add the new Sepolia network configuration
    fixtures.NetworkController.networkConfigurationsByChainId[
      sepoliaConfig.chainId
    ] = sepoliaNetworkConfig;

    // Update selectedNetworkClientId to the new network client ID
    fixtures.NetworkController.selectedNetworkClientId = newNetworkClientId;

    // Ensure Solana feature modal is suppressed
    return this.ensureSolanaModalSuppressed();
  }

  /**
   * Configure Polygon network to route through mock server proxy
   * This allows RPC calls to be intercepted by the mock server
   * Uses Infura URL format to match app code expectations
   */
  withPolygon(chainId = CHAIN_IDS.POLYGON) {
    const fixtures = this.fixture.state.engine.backgroundState;

    const newNetworkClientId = `networkClientId${
      Object.keys(fixtures.NetworkController.networkConfigurationsByChainId)
        .length + 1
    }`;

    const infuraProjectId =
      process.env.MM_INFURA_PROJECT_ID || 'test-project-id';
    const polygonNetworkConfig = {
      chainId,
      rpcEndpoints: [
        {
          networkClientId: newNetworkClientId,
          url: `http://localhost:${getMockServerPortForFixture()}/proxy?url=https://polygon-mainnet.infura.io/v3/${infuraProjectId}`,
          type: 'custom',
          name: 'Polygon Localhost',
        },
      ],
      defaultRpcEndpointIndex: 0,
      defaultBlockExplorerUrlIndex: 0,
      blockExplorerUrls: ['https://polygonscan.com'],
      name: 'Polygon Localhost',
      nativeCurrency: 'MATIC',
    };

    fixtures.NetworkController.networkConfigurationsByChainId[chainId] =
      polygonNetworkConfig;

    fixtures.NetworkController.selectedNetworkClientId = newNetworkClientId;

    return this.ensureSolanaModalSuppressed();
  }

  withPopularNetworks() {
    const fixtures = this.fixture.state.engine.backgroundState;
    const networkConfigurationsByChainId = {
      ...fixtures.NetworkController.networkConfigurationsByChainId,
    }; // Object to store network configurations

    // Loop through each network in PopularNetworksList
    for (const key in PopularNetworksList) {
      const network =
        PopularNetworksList[key as keyof typeof PopularNetworksList];
      const {
        rpcUrl: rpcTarget,
        chainId,
        ticker,
        nickname,
      } = network.providerConfig;

      // Generate a unique key for the new network client ID
      const newNetworkClientId = `networkClientId${
        Object.keys(networkConfigurationsByChainId).length + 1
      }`;

      // Define the network configuration
      const networkConfig = {
        chainId,
        rpcEndpoints: [
          {
            networkClientId: newNetworkClientId,
            url: rpcTarget,
            type: 'custom',
            name: nickname,
          },
        ],
        defaultRpcEndpointIndex: 0,
        blockExplorerUrls: [],
        name: nickname,
        nativeCurrency: ticker,
      };

      // Add the new network configuration to the object
      networkConfigurationsByChainId[chainId] = networkConfig;
    }

    // Assign networkConfigurationsByChainId object to NetworkController in fixtures
    fixtures.NetworkController = {
      ...fixtures.NetworkController,
      networkConfigurationsByChainId,
    };

    // Ensure Solana feature modal is suppressed
    return this.ensureSolanaModalSuppressed();
  }

  /**
   * Sets the privacy mode preferences in the fixture's asyncState.
   * This indicates that the user has agreed to MetaMetrics data collection.
   *
   * @returns {FixtureBuilder} The current instance for method chaining.
   */
  withPrivacyModePreferences(privacyMode: boolean) {
    merge(this.fixture.state.engine.backgroundState.PreferencesController, {
      privacyMode,
    });
    return this;
  }

  /**
   * Disables smart transactions
   * @returns FixtureBuilder
   */
  withDisabledSmartTransactions() {
    merge(this.fixture.state.engine.backgroundState.PreferencesController, {
      smartTransactionsOptInStatus: false,
    });
    return this;
  }

  withPreferencesController(data: Record<string, unknown>) {
    merge(
      this.fixture.state.engine.backgroundState.PreferencesController,
      data,
    );
    return this;
  }

  /**
   * Merges provided data into the KeyringController's state with a random imported account.
   * and also includes the default HD Key Tree fixture account.
   *
   * @param {Object} account - ethers.Wallet object containing address and privateKey.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withRandomImportedAccountKeyringController(
    address: string,
    privateKey: string,
  ) {
    // mnemonics belonging to the DEFAULT_FIXTURE_ACCOUNT
    const vault = encryptVault([
      {
        type: 'HD Key Tree',
        data: {
          mnemonic: [
            100, 114, 105, 118, 101, 32, 109, 97, 110, 97, 103, 101, 32, 99,
            108, 111, 115, 101, 32, 114, 97, 118, 101, 110, 32, 116, 97, 112,
            101, 32, 97, 118, 101, 114, 97, 103, 101, 32, 115, 97, 117, 115, 97,
            103, 101, 32, 112, 108, 101, 100, 103, 101, 32, 114, 105, 111, 116,
            32, 102, 117, 114, 110, 97, 99, 101, 32, 97, 117, 103, 117, 115,
            116, 32, 116, 105, 112,
          ],
          numberOfAccounts: 1,
          hdPath: "m/44'/60'/0'/0",
        },
      },
      {
        type: 'Simple Key Pair',
        data: [privateKey],
      },
    ]);
    merge(this.fixture.state.engine.backgroundState.KeyringController, {
      keyrings: [
        {
          accounts: [DEFAULT_FIXTURE_ACCOUNT],
          type: 'HD Key Tree',
        },
        {
          type: 'Simple Key Pair',
          accounts: [address],
        },
      ],
      vault,
    });
    return this;
  }

  withKeyringController() {
    merge(this.fixture.state.engine.backgroundState.KeyringController, {
      keyrings: [
        {
          accounts: [DEFAULT_FIXTURE_ACCOUNT],
          type: 'HD Key Tree',
        },
        { type: 'QR Hardware Wallet Device', accounts: [] },
      ],
      vault:
        '{"cipher":"T+MXWPPwXOh8RLxpryUuoFCObwXqNQdwak7FafAoVeXOehhpuuUDbjWiHkeVs9slsy/uzG8z+4Va+qyz4dlRnd/Gvc/2RbHTAb/LG1ECk1rvLZW23JPGkBBVAu36FNGCTtT+xrF4gRzXPfIBVAAgg40YuLJWkcfVty6vGcHr3R3/9gpsqs3etrF5tF4tHYWPEhzhhx6HN6Tr4ts3G9sqgyEhyxTLCboAYWp4lsq2iTEl1vQ6T/UyBRNhfDj8RyQMF6hwkJ0TIq2V+aAYkr5NJguBBSi0YKPFI/SGLrin9/+d66gcOSFhIH0GhUbez3Yf54852mMtvOH8Vj7JZc664ukOvEdJIpvCw1CbtA9TItyVApkjQypLtE+IdV3sT5sy+v0mK7Xc054p6+YGiV8kTiTG5CdlI4HkKvCOlP9axwXP0aRwc4ffsvp5fKbnAVMf9+otqmOmlA5nCKdx4FOefTkr/jjhMlTGV8qUAJ2c6Soi5X02fMcrhAfdUtFxtUqHovOh3KzOe25XhjxZ6KCuix8OZZiGtbNDu3xJezPc3vzkTFwF75ubYozLDvw8HzwI+D5Ifn0S3q4/hiequ6NGiR3Dd0BIhWODSvFzbaD7BKdbgXhbJ9+3FXFF9Xkp74msFp6o7nLsx02ywv/pmUNqQhwtVBfoYhcFwqZZQlOPKcH8otguhSvZ7dPgt7VtUuf8gR23eAV4ffVsYK0Hll+5n0nZztpLX4jyFZiV/kSaBp+D2NZM2dnQbsWULKOkjo/1EpNBIjlzjXRBg5Ui3GgT3JXUDx/2GmJXceacrbMcos3HC2yfxwUTXC+yda4IrBx/81eYb7sIjEVNxDuoBxNdRLKoxwmAJztxoQLF3gRexS45QKoFZZ0kuQ9MqLyY6HDK","iv":"3271713c2b35a7c246a2a9b263365c3d","keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"original","salt":"l4e+sn/jdsaofDWIB/cuGQ=="}',
    });
    return this;
  }

  withImportedAccountKeyringController() {
    merge(this.fixture.state.engine.backgroundState.KeyringController, {
      keyrings: [
        {
          type: 'HD Key Tree',
          accounts: [DEFAULT_FIXTURE_ACCOUNT],
        },
        {
          type: 'Simple Key Pair',
          accounts: ['0xDDFFa077069E1d4d478c5967809f31294E24E674'],
        },
      ],
      vault:
        '{"cipher":"vxFqPMlClX2xjUidoCTiwazr43W59dKIBp6ihT2lX66q8qPTeBRwv7xgBaGDIwDfk4DpJ3r5FBety1kFpS9ni3HtcoNQsDN60Pa80L94gta0Fp4b1jVeP8EJ7Ho71mJ360aDFyIgxPBSCcHWs+l27L3WqF2VpEuaQonK1UTF7c3WQ4pyio4jMAH9x2WQtB11uzyOYiXWmiD3FMmWizqYZY4tHuRlzJZTWrgE7njJLaGMlMmw86+ZVkMf55jryaDtrBVAoqVzPsK0bvo1cSsonxpTa6B15A5N2ANyEjDAP1YVl17roouuVGVWZk0FgDpP82i0YqkSI9tMtOTwthi7/+muDPl7Oc7ppj9LU91JYH6uHGomU/pYj9ufrjWBfnEH/+ZDvPoXl00H1SmX8FWs9NvOg7DZDB6ULs4vAi2/5KGs7b+Td2PLmDf75NKqt03YS2XeRGbajZQ/jjmRt4AhnWgnwRzsSavzyjySWTWiAgn9Vp/kWpd70IgXWdCOakVf2TtKQ6cFQcAf4JzP+vqC0EzgkfbOPRetrovD8FHEFXQ+crNUJ7s41qRw2sketk7FtYUDCz/Junpy5YnYgkfcOTRBHAoOy6BfDFSncuY+08E6eiRHzXsXtbmVXenor15pfbEp/wtfV9/vZVN7ngMpkho3eGQjiTJbwIeA9apIZ+BtC5b7TXWLtGuxSZPhomVkKvNx/GNntjD7ieLHvzCWYmDt6BA9hdfOt1T3UKTN4yLWG0v+IsnngRnhB6G3BGjJHUvdR6Zp5SzZraRse8B3z5ixgVl2hBxOS8+Uvr6LlfImaUcZLMMzkRdKeowS/htAACLowVJe3pU544IJ2CGTsnjwk9y3b5bUJKO3jXukWjDYtrLNKfdNuQjg+kqvIHaCQW40t+vfXGhC5IDBWC5kuev4DJAIFEcvJfJgRrm8ua6LrzEfH0GuhjLwYb+pnQ/eg8dmcXwzzggJF7xK56kxgnA4qLtOqKV4NgjVR0QsCqOBKb3l5LQMlSktdfgp9hlW","iv":"b09c32a79ed33844285c0f1b1b4d1feb","keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"original","salt":"GYNFQCSCigu8wNp8cS8C3w=="}',
    });
    return this;
  }

  withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController() {
    merge(this.fixture.state.engine.backgroundState.KeyringController, {
      keyrings: [
        {
          type: 'HD Key Tree',
          accounts: [DEFAULT_FIXTURE_ACCOUNT, DEFAULT_FIXTURE_ACCOUNT_2],
          metadata: {
            id: '01JX9NJ15HPNS6RRRYBCKDK33R',
            name: '',
          },
        },
        {
          type: 'HD Key Tree',
          accounts: [DEFAULT_IMPORTED_FIXTURE_ACCOUNT],
          metadata: {
            id: '01JX9NZWRAVQKES02TWSN8GD91',
            name: '',
          },
        },
      ],
      vault:
        '{"cipher":"0ItM5QzNA6pT0De09iJtURXuNiwwoeZnf7vt/Mx7P05EDzh+5m9agA4w2JrPM0favpgKpL6AlZ81CebDkVSdE5OSBon37N1Xs5F0DEbJxdw0NjmeDZaZlAHNcr7XJiXDsRW+Udz67y6DO8S1MdC2Ju/qthj04nEdaofDHR6qEtM5OYLYG9LHsf/UzqtAwe/5LHbaJtQCvM2JLLfk0BQTg9s5Fce5Nk6YkPHQ1JlUc9WXNRv90Iyclwh08lIr93A6RHNlzSYHRyfpGE5lZv5Soe2m5ZlOKBCDUQFLWjh5vCqFHMaMpMkfrqhdNBaZvHERCpppp2FARn0ufmWsn4/KJdCrxL438BRufDaXdbG8KfrEHmx9r10YjBAv3GFDUYahene8GyuwP/OTvL9i4PfN6CUGaS5sLY4kWBFFDIASlCahtMatp23+G+4I1z0x2O2XOIMiegqqkXZU/uXuDoAeSQ7jTuKzoE4rCXm67DXepECoBCrX1/gWwRQ9hLeyz4KpYfmL05tN0fzWEiMeCi50gpy0Da6QYzPoWyYYURFbE5iPU7XIqww/RtIpzw3UBCtAGuohsxf/hkK27SNcN4k1eW+Bym6G1H7BjhQSFAft2/mi4fuOHsUX+seu3Wqy3uhE0/fu0fazqX4NloiHZbDXq90CCnIUn+owW8ORsSSRO4NywjXARdeU3VtW8j25E7Q37vJ9OIoLqVE9GVyDCN7Gdn88eaBUk14qe5YzYrx3K9KSbz3MVcPmYKaZFR1+qeLWPDVzYFsZHcrGQuSgY33qF9KuI2PAZUuzwA1xroHZxZlGIH5JJSvglHKxNLkK57PK5Y6tb0EGjrVFYUhc/xvCQoMHq20aRGHqqhKL2Ij3ASnSdkTvE1Q1pb3/NpO4NVHxowocYjWGQbp7RHGm1h6BwenzGdli/4XX8iocnjkz4dkzlkXyTwmvh9enyt1bAo6ZpiLNTIMYV2Uvc4E8xP+KRoBXHhTuwHqWbu/jTg6byZjh3bJ4CcXk/CB26ymLzH5GaY4wTTpZnkhUYXa/jW1TexvwnVkD5rzin1S7wYv4Qq3cnLP+J1MwOcjl+94eHYvxVk5xBd3hBt1QDINDEfClzHvq4aV3GSuQXMRlKWcnOmtUzpcrHAmiR4hk4w5E3mCgcJeP3MJo3819Do1vWMLXEUpZfT5Z65Q/HAGpaxh9YZ9yuZkJ+rQe1AX6+hMjG0r+IDtY+MtJ0/AjBwic2H5O7w/7Ztkoy9mLTidR4U0eAWxRMo+/Xx8/gEiJk4pxB/jQbyLFCr8+XySmyx0BnVLyE1sYMb9xXrd7ivm2k0iBtUDtM51frR12m60zT90ecxCxwniwuRGZgf1R/ZI2nBru1begmchDGguDbtmv9wO88USFYXLBP24LiJLJw+1TxooFCAz7r78FPW4wuvBonzCEQnJPSZm9wK7Z/ymmz3RMoBhPobrkp0afX8YY2EpExrMF5yUwrQdg8qld6B9kQWz69C8+wn5YOjTgDp1q2oNF4adC21Mz3klldzpk7JAO+KWe4tAJJj8HicP+IBe2PW9SheBM3Xb77SF0q/SKe1suriYh4d5lVcM2lWY1ryky5upw","iv":"0df9d14eb4d5c6729eacff6ba9cda8dd","keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"original","salt":"5Dedq0Jg6wCFJ9whKIeUzP6yePVlUFO1aY2ZlmR+q3A="}',
    });
    return this;
  }

  /**
   * Fixture for constructing a multichain compliant account tree with a default HD keyring and a simple key pair account.
   */
  withImportedHdKeyringAndTwoDefaultAccountsSimpleKeyPairAccount() {
    merge(this.fixture.state.engine.backgroundState.KeyringController, {
      keyrings: [
        {
          type: 'HD Key Tree',
          accounts: [
            '0x9bc75e92dcf60daf800ef9413f46f77826ea4d3d',
            '0x1c1a775452d9db6bd1ef9eadcbce35201d0be3a5',
          ],
          metadata: {
            id: '01KGQQ9KNS2HEQZ5H9TVF4TZ4N',
            name: '',
          },
        },
        {
          type: 'Snap Keyring',
          accounts: [
            'TXY5MnKKVwxDSvjJHj64Ayo4jZvFG9vgih',
            'CoTrLYQmYbGdpYzy9bo3Nhjs3xT2rHzpsEfBGna3bb6C',
            'bc1qkz2mkjvu8jxujxkk2jzlt9nn69xgf4kk2g4yht',
            'TXMctKHdRgMRhkejvGf5S42TK9GvHpGQBA',
            '6CFragas8KRyz8zN8c7hzrzDCoMkeRdGc2Yk3tJRmqoM',
            'bc1qjrx4w3ptlcjatxt8cq0w0nkw858xw3gjjeh4gy',
          ],
          metadata: {
            id: '01KGQQ9KV568YTF835F8632NY3',
            name: '',
          },
        },
        {
          type: 'Snap Keyring',
          accounts: [],
          metadata: {
            id: '01KGQQ9KV8FNENY4HRBQY094G3',
            name: '',
          },
        },
        {
          type: 'Simple Key Pair',
          accounts: ['0x6b0932820c1ef138b54bae9abef053f68762e763'],
          metadata: {
            id: '01KGQQB4C902YGYZS5R70SDZ44',
            name: '',
          },
        },
      ],
      vault:
        '{"cipher":"xwDUn4Q3i7OZPHu7snWHizXstv1HM4V6l2HYCAyfDPXLYxNnzBF80F/yrjdcTrRxhtr2fJQBXsi9By2LGmuJhCcGsbd/yzvPvIBblkrYVjSiw88DqkojEo6fs259VmlTHp78Fv/ue3WZgm21wFQ6uhDO82HTeXazs35tAUTk3cJx7K+ciKxNObMePrfAG3PhwqqihOaUMZpc7IDmpTM8EqEXPfN4dQye5MPEFx+3qQjPKAlD4Y21H0VnHIkFGSUdD0S5PKzdGr7/OxxVGQDxgtzQ7BbWHtgqJvP63N9lWJnkLW2xkZbFvpiPcoWukR79Wy1ZqxO2LpzqMFGSK9wEx+LMt24SDHJeCTl5VPPk9KAqxb63MxASPgdGFubZtWzCU4Xp648yJnW7anRCUHz52E7/65AvkjHFKUn3IlRCJLuKSosxyTbGWQZ+MFYdI1prJHj7esnDajgBSNOomBlH8O9u2nfyprXO5QCMPT/Ams8amiOUHBUOT3aeRO7rSTAtMmXy7ONjsR0PN7gAaWaxNhQOFeFiP92gNydGRhqEnWkwXOzArQp5xO03YfylecC/lRvGa9R+RI055sqIesEwwhe4kFPQg3BE4mJDAyQ4K/aY05APP9eT+9bHsJwag3lGN7iVBjp0+J11reVgRleXDXHNzvJCOmUBs+3XBGWg9vgrn0mohXa2cNn3C6pbAjtWOF6Noey0G4nI895PmSd7KNtjlZ3ZM+A3j8P0a5hfFxHZAgNK2EiiHZWqUqWw2UVdDdc8mq6MVh1IrcDVw1l+kddAwwYG11uFwsOYDZKAu/wAcojhz+P93eVJm6ZM4+N0Y7pfEmvSJcX6yGXNTgCS7rH+0bSP8Dal2OFa3C3TUmy+88QSDfcrBcgV3sHWgt4yAfFMfy+gv9Y9+ufrGt85Tfp6ErmZIJXlzqT0I/jR0Vz08enZUGi0MfgqsFUB+xwYxiMzjRwCtEgv4mWUo9jQir73NCk78LZBZ67TVTEP97Zryq/mZNQnPZ+JozPaL8WEIiP4GyMRiIUnKYHa2kV22v+7OJDpWI4K3WglzwJsK6Xv/K5yRvPfRg0gFAR4kiXsNtJ1bjnp9tf0po7gYFj2Q9ryzn/lIXQrJcoh7BANfNcGwckDuYCPwso+CLa/8Z9MlerYFVC4kEXOaY6olm2DfE2W6ZaFbvugF7pm/hScbWqKXObIQjFCTpMP1XnpJ+/5G12FmHtX1RfVKvg0q5yCwVTEJVKYzsKpAICNUIiGz8s2isl0xsD4Xj2OAOBLN56BTUbzbEcNQAGM626Op92mWwEWCw5hyM08HmgfAGaAXSVSHfGXpPmAqPLNM1YN68nNwpV23DGtKzwy3szAqjyRJgDk09RtrA2YvW92Cq+WNFNhAc2wxdQcOWifblhDKYXC1lcO0QLjVieg3m76vJnG2WiauXsf1t7vqaniJ91sv7lWlQveqK2t9s/7tk9C9jWEO3VGeZVrd+7jRiy78dcWWoC9eVgqhxZyDyF/j/+9pTt37QH0l6vaHVurONkoyVHCewr/0T0N08g1OVAP6MkhnnbCnkjTj5xMtZjnYRBhzPf+VWSkkmH0zneDcw866fyYuy/RHJa3t3DGBhI45pGBNP7y2vAlDZUYE5xQ7G3+MdqFQCYOJLOd+e+EsDTui234UdrRES06gfCqmNmZcdGRANGEGVazVIfT3Aw6RQs9P0BsrWjQLVlb1az65w3/6xKp1l9qODAyaJp87wguGOv5yVxUCgmjUwQPAh/Crc/rsBe15csxoXQUD4Vc0/rrkv9O5urGnZV/snOmHLs4EHkTBbQIUNv/691C6vN/mpzG0Cs3DYHB/7/Y4LQMyMGf3QeqvHO4CAHdE85BnC9rgY50QttoU1P9BIz9KDyj6jrdgR+BL8qrjMambaCCm1EdyMXytX0/Gr4GyZn/OItBcAo9qcRJKMIjQ2Glqy6bbV+DX3BLx6v4KhmZ+YR2h4mHywcWd5NQ5aJoVqOx1dqOyOSPBGqyMUOy0eQwJvAJBzkYygRBzY2h2YdPrMNLW5adGp7cWtm/vRHYFAi7QZPSxSp3QDt5ViBpaG/7ns3FsnobP8ks4+FLjfQe1YMXGyYcuNYpLmR3qAcK1jhfT0PaEtJ9iyr+EuZG2r803quimPGCk4ji7DZMn1ke7i1Tpw0iu+kmKLwJW3kJNzkkhcv1PGB6CQAyB/mMLB8wGqDngNQmL1hA0Xb2+WRo4vVXJTnLovuFEIqyUtmgelZuXWP0rdJb5rutAivAIqws6WBhC9a1G60CZWZ1Vp1ac3mSgJpOG0d8NAt8IbQutXKhr5SzewAd9XOhGaqNe6r7mRIh5AZzrPUbqhJ5P/yxLosTcnr7VNlvDv7LrEStRy5Yv75T1b76iKWXRSgzGszLsCARnf1bvVFmSHVchw9muKDfGvCU/4xZYSdZQaUSnSiso/7TAUERCvyUSi4TwLbta1el1fiVxu7LQ7BZwCgOKZB73VJ3a1s4Ds/Gbyoivh5sPu56H/2usjKz5Pofoeyiz07Iz2mos1Gst/lf4oDkguBL2GJvJVvFwJkdQXzW0eQiF+h2ht/5BX0yTZdnw4RLZxln6Xk+NQofV4hRS6DmBnSIgr2+7HQUUbiiEQvM0GM5Qsfm0NGPs/+zLO2SCVabz/N2YVZU5hagnYeos+3yAZyJdY8OIT4Yep1fOJh65zx7C6gIGlx0p86fsBPfc3j6riX7JWd4Q+hJIfLhkUSKTfeiYB1SQSUCyEVjuFk4VI90+uhFXSmOfMOakAEvDS2PuB1oOsO37laP54+bUFQlRKW1uHXIyMzVReykVDjNOhHLBkmSDkr8dcrExWRXxKT9qM7zEDwZF1hNIt8Vq4Cff2EhgIVPvOTKQuXlwthq+LrENaSIM7QIYFYaH+7+o9Jy6lpwN8y3zkmv47WvrYM5w07ovRkgotqFD6OhO486ysI7gYlYakALauyu0lVl+hVTHkuIqXQ2F1MLhBMonE4tZH6bArE901wpE/yNl43BAyptUhr9CzpBofd30shhWs94Jt39z/4WrpSjEC59L1HXVlIRQoinkMWabskBw5y/YaD2MsaQyIazLEZrhQhde5FFmzyfv9Snd3ioJHjYMnrMD7xYk6QFSm3QWBsD/BXzjy95dilaM1puQwq8Q+lyM2nbsIUwsLVYjJpZZeKfNEVKr9GIYLHYo49ONfJ1+eNgQVvWjJINY36I/9qHxt0OIYJwq6Xo/Vx/N6vJT0VlBIscHmI57nRG6n7/zte0X6pV5oYidiJDQNsOt9WXvyDooYVyAe0FawBh3C3ZZPPR/nnWtEcMYJuD0Izm0irSADaW4UJwN9y8fsIO1lD0LVs5XYwKu+7WGhjRIaBmBxEixHx0eNU3R8nJbZNFjRBsLjDGGGWtBzbY044ursN7Nm43nk+Z4Z12dC3yeBzBKV4miYk03qfnqpN4R0JyOr+wt3wazDMfj9cjf4kEFjmyKtqmYNWxyhAmHLGQKAiq3EttFR3MZdVvtWt6jNDSxlbReboc2lhIsSng7/TUjjLeeSlxkJV4CZzeIUU/i5HYLSWCSTmiQIuybDh+ZMrNi92oF3E3XQeb4wRaB3BmFqCtuMwMPtjukFkOOpJqGKIc74K7qcyPHyKFjVo6ziWteeW/WipJ51vZPGQW6qySXLDnxPaImX6H4KB20sN72sm2liLBj/c338tbzUhk0z0d3cgHSLteJ92IGpjgVO6Vn9lpLMSv+WiD/8O1ugTu4IjbiKfrfmMHwTQSJUF1bRudaZC7gWPDWcbSMppK84n7H/zPwFsgCQ/BqOuQkd2KPABXiX1pxGdDxu/abQTtQL/LZtJ9MiEltP8reU9KUt5z7SCWbweUNluDUorNmIn/IS8HN/5t0rOLbmlJmw7eA+CKsu74EuqNLDbGhmDJ+opQ75ng0AD8+4dQ8aCiPubGm5NNcMmBe7Xn6+Diu5CF6oH3L1hbT5+8LFRG6D3IdsU9Os3Grp/fggvnWCbcDGnr0OhE7lyKyL8XSFpok2cpyrnS+7O2XdbNdYK5nouuHpD+vNoFGij+1QwTqf/NXigZjozQgakpgk/3KL8qd0Yf4CFjrdXFbLyqoiKYmOR7gP28nUPxK4bPZBsRo8M3cgz32tYY01o/MbNoSyGY6qce2hHHcnw2SxkeuDhNi+LrP/KEwmPaG9xgSIR6RR3GiNzfo4KAUsuUkuqsEOaCSph5LqBQAlbUGLTXXhGDkz95VYwxX02juqq9AdO3T4Mx1gGJlgtACMpaUlLLdttx/t6Jh4ALSGUFLWPy/EMSjRda4HVfOYma/pbxBebOaoJGrkhODharM5DtNv4a8xVvaAPvANPovWMzvBNwt4A7YYeewplmkHAnwptq+g5QPy+Rth1kvOV21zJi7fmFYgEmj4mDH01NMMzkUP/ZoKdCaUkqJ5L+pp8pg1/hue3qrbX+xHpYhRzKWykf2cngVrTHeeJN/9/23uIukXWRLzv9JU+xw1YrdiXPwaJHPkAJtQPgTt0wwu10REuAvZO/SamUUqRy8eu/JCjpyp+a48HBTZ4xdCg8dLwS80LK1l9bQRtgwxmsea2W5pYCdo6cvaSPmYPUi3sJH9NPAOeLg2kdVSXhPhTB6As0c58WIzooBlbtcIIdD4j/xX9DWVMbgTK8XRM977vcLtu2lYEdc/xeh53qVfocshy6v5hXU1IWPK/QpgzdJ0OoUO5BEsQ9Fix2la3dAE/7XLskqzxt0erwUsFaEvlU4imKmxkvIeo5to4aZ1pOaxe87OTYKeYnwbwVNyYfYffjnm9EGfDtMTaxZlrMIohI5vwh6SH8Zi6GpelL26q6Y+koqA+u55fsuH/7IWU+NTZ94c0qxMWJuY7Kwcw0aqgTq/X49+Q7mbntPq7nLQkl9ClXv3Y42yzlcb7VqVIExBNDfsaWLLfJctJqSgpwsjcWXDHJj51t4dwaG75dd9wMBx8zwHbvncdaW6/t3woMklS9/jwcaSXxDAuasgodl3g6NlHv009uqAZolWQQpz8BaBKf/GsNBDEgjhT1pJ+MiF7g3rO5nqKFXSfDK6/9c2DwVlUeLx2PvUWLe1EnPtc1FnpFUcIiRjTLmoRxZM0RtwUytD/S/gsuFf9zUnXaanAeGZqC0lodLJgo4tWTFa0LC+Cll1n27uQj3ny2pLxW+FGe+iiROgX3SNBKpVI9k9uKQVU014cKiNBO8woucOohACsfeC766Uvu23WsDms8+J0RRFzR1w/Ji2XRSBq0SpWVtMzJsAMBhY+Ozu3ILb2NQOgN2hrNyEfAyhDrA46CBjFWrqybg4uB945EEp8r155x2TDXsg5KtyEQMNQZ8z34R0Pl+MyOm7FFgYur80sCXpusNaz/pBP0qI0S3A2ENIinG/g8PRtYPyRjJyrqTWCwtrU1gBtWR7BxpnuazxYGpP0gK0STi961jjd7GO3K1P9lA6Gqf4kPyH5Z/WQ7ws5JKy5LDxxehhKSsjQCnccMVxfjPwmh2A0p05d0cfrzl31aQGw5gJ7VUrWIg4lB2HVVh11PhwrUbvT0hCA6qZSCTduFibHVDveD3/oU0ocI/46HxTNB/cV3uw4FXHrUVwkoVRfPMcEOIT2G0wVp4n7ripnD3k9jO+rYPoI4CBywx00SgIjkht/kWk+ZkIPTXAD6ihg=","iv":"a19067b9fe5645014788fc2cda013438","keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"quick-crypto","salt":"i48pl663CxNLyJX/s64EAn6cZREaqo4KuchJxaxm/Z0="}',
    });

    return this;
  }

  /**
   * Fixture for constructing a multichain compliant account tree with two imported HD keyrings and two default accounts.
   */
  withTwoImportedHdKeyringsAndTwoDefaultAccounts() {
    merge(this.fixture.state.engine.backgroundState.KeyringController, {
      keyrings: [
        {
          type: 'HD Key Tree',
          accounts: [
            '0x9bc75e92dcf60daf800ef9413f46f77826ea4d3d',
            '0x1c1a775452d9db6bd1ef9eadcbce35201d0be3a5',
          ],
          metadata: {
            id: '01KGQTTPD5167R0VCM1ENY17VF',
            name: '',
          },
        },
        {
          type: 'Snap Keyring',
          accounts: [
            '6CFragas8KRyz8zN8c7hzrzDCoMkeRdGc2Yk3tJRmqoM',
            'bc1qjrx4w3ptlcjatxt8cq0w0nkw858xw3gjjeh4gy',
            'TXMctKHdRgMRhkejvGf5S42TK9GvHpGQBA',
            'CoTrLYQmYbGdpYzy9bo3Nhjs3xT2rHzpsEfBGna3bb6C',
            'TXY5MnKKVwxDSvjJHj64Ayo4jZvFG9vgih',
            'bc1qkz2mkjvu8jxujxkk2jzlt9nn69xgf4kk2g4yht',
            '8k4YSvwmSCqMEmATrFKt3jxZ5UWANnG7RrbYN3fao54Q',
            'bc1q68l0apx6adc5y2re646k98gedgx00f07mqt4ee',
            'TQqRUeD2CYeKbzvtjHrmLE93ZNVYkAqTQm',
          ],
          metadata: {
            id: '01KGQTTPHP9N2KNEBM0820W3N7',
            name: '',
          },
        },
        {
          type: 'Snap Keyring',
          accounts: [],
          metadata: {
            id: '01KGQTTPHR741KY20NNN8P2ERG',
            name: '',
          },
        },
        {
          type: 'HD Key Tree',
          accounts: ['0x43e1c289177ecfbe6ef34b5fb2b66ebce5a8e05b'],
          metadata: {
            id: '01KGQTVQTW3Q1RN5D60ZRQDSNK',
            name: '',
          },
        },
      ],
      vault:
        '{"cipher":"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","iv":"3b187e1feba01e131573809ba29ced57","keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"quick-crypto","salt":"kXuNcnU2X/LvymF+HSVhxJpD8/i8azgkqDYHwNxWOrk="}',
    });
    return this;
  }

  withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountOneQrAccountOneSimpleKeyPairAccount() {
    merge(this.fixture.state.engine.backgroundState.KeyringController, {
      keyrings: [
        {
          accounts: [
            '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3',
            '0xcdd74c6eb517f687aa2c786bc7484eb2f9bae1da',
          ],
          metadata: {
            id: '01JXA9KQBWD60ZB6STX279GQMF',
            name: '',
          },
          type: 'HD Key Tree',
        },
        {
          accounts: ['0x428f04e9ea21b31090d377f24501065cbb48512f'],
          metadata: {
            id: '01JXA9M05DGJ92SMSEPFG8VN17',
            name: '',
          },
          type: 'QR Hardware Wallet Device',
        },
        {
          accounts: ['0x43e1c289177ecfbe6ef34b5fb2b66ebce5a8e05b'],
          metadata: {
            id: '01JXA9MYRXNW16JZSZJXD6F9SD',
            name: '',
          },
          type: 'HD Key Tree',
        },
        {
          accounts: ['0x84b4ebb7492e6deb8892b16b0ee425e39d3116a4'],
          metadata: {
            id: '01JXA9YPC99YPE39C063RYGVX1',
            name: '',
          },
          type: 'Simple Key Pair',
        },
      ],
      vault:
        '{"cipher":"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","iv":"4df215ad8ea053bc082a369a40267680","keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"original","salt":"TWbGoRlf8VcWi4RXapCjOg44EaJ6xskBCbvgevIjiWc="}',
    });

    return this;
  }

  /**
   * Enables profile syncing in the fixture.
   * @returns {this} The current instance for method chaining.
   */
  withKeyringControllerOfMultipleAccounts() {
    merge(this.fixture.state.engine.backgroundState.KeyringController, {
      keyrings: [
        {
          accounts: ['0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6'],
          metadata: { id: '01JYMQCWV547WJ1X7X8KA72BHB', name: null },
          type: 'HD Key Tree',
        },
        // {
        //   accounts: ['C8WwCAxqd7CsdF2nmQWaMqj8bc6b4RtTZEmaQCAusgkh'],
        //   metadata: { id: '01JYMQCXJR780W8479CHWADRMW', name: null },
        //   type: 'Snap Keyring',
        // },
        {
          accounts: [],
          metadata: { id: '01JYMQD2ZW9MH3QDV97J1T9H9A', name: null },
          type: 'QR Hardware Wallet Device',
        },
      ],
      vault:
        '{"cipher":"DUx7iAsJoxlE+MKGopEvRQBL50daKCxL5stSFkxjZl4ZA3DMv4tLxUs1yAr31VMwM9rDuTFDZmZmTLj/WVNnPUgu8PXioD+Qufj3NP6cFmU3oTN1mw+sneI+9CSVlPYnuTzBOWaCXhxHEqTe4jfjPRc0rEeiBAzvJvvnZh93BNoBO7aqr5LNEx32cIuNqefG4mBzNbKq8ytfWHRsKZOZRl9yROpPtUtCaiuk8tuSAtTbtEOT5Btbiha/gAEYT5JjLsMe2Gw96oqyqS8Oza4WagQSVCIJvT/kJDPuO+KZJiIV2VZXmpck+UF02xiw2qvrnm9gu/hZ20t19alx3nbKsF3Q/Kxrfxt02MS/5Z+XKgRDl6qrNmD2K7NkMphuiWI4TdKT8yEU7ZWucJ83XLdQwAhyG2T1ugoe5dwbN9QvY4Fcyw92kba3A3ILKlV3XLnDnel1ZG6V9GAa4SRRCs7z/+lTzfj/h1QpO24ETznMi+PqJF4gtp/RNtgu/aTHwAqj0zkenZYtSME44lYe5hgbJCZXdK5zUTC1czqXshkVotccoKBly9kyML/ajAfO9RIGhSjglrrRUsCco7yyUafz2jLZYuQvFFAuVVukgbAEdINimRlHbYGran1klp9YVaMDADrTB31IVnDCAuNMb5RVoiiS7J0iCuvJWLAVrV5sukHFMi9oA6XMRYCYE6v6jvHgOPXRhJfxV8k7U96Vgv6o7VXkaA9s10y/tuYUhnQpH8AuhOqtQthytlt1FeTF1c74G+Vt/fLfWd3B2p6Iyqrf+XMOT+e/4fAZc0jTsmMM9cfoYoVd8ofyAmRGhql19cAYUEAwvMNfu3QAiOLl00EicHdX8IK8EzoObwLHO+008erBUKbjRvJ1ePl9Dvx83BZkqb2wlP5GmXSQjy9JmUDrCS6TuquVVNHpVKA8EoBwORN68p3B1hnP29yC79Kq7hc8K94K/Xofm0T0wj+Tzspru2iFxA0aZhEAoe13CGy9hBq9QqT285XPGby7vvek9wifIgvwA1yBXjU6lQ5ObyYCKitp8NLXPb5U0UXEOho7mu0QE+GwhoI3uxjtcKyIWkZlPldYsh2eZfcP/mfNhuFsqqlRin+SWynNUY9HMyaDw3FvtPkDZ6VgYMymP3DnWbmiOUa82iKJ2uGKuVgzvKzOlP5pf/GyWSdBz9ZjPNWMTEW/WYPvTkfGDdDCbTWxAG7fKU9locF+D09CV9mboSAQGTbZSI2f7d48Uo+77rntE6ODcumD++qASMZrGHOapCRtv0a4fHbMa3dWDtx6GHLlbvViDbvCsec7ChOUBoL39sgZEyWrC5JiOgYuRUWnU7xkaZHtYha7yKEVLWg4UFtXnLliYQLQseDa/k2/SDbSqLrz9ACVHgKpS3vtY6mSdhNWyrBkWamwVPXinb1Wjni3OQUqN0R7TeQ/QmRRp20atkY5OoFUuYOkBWU4HgyJHg0wEiYOXkscktGS1vl6RvOHyoTPKiWPJFgtz46NOP5ynmlBqS2+srespbKPh2GEN5EGhbdFWGAXSUoecbvjzizxRQdzm8nLNWtx2eDHo54fv3IahvWQNvmDIL265Ezfo+ZEYhOeHTerWvuVBzg78ZeHpOd1ZwTZz/k5JVtW9BZDoJoO1DZ98Bliew7i2uaN0De2ZP10RMQzH5GL636aptqRiUw9mwbavkaI2xC8f2Y9J2jsgtZ8Gjp48lGjBMxWpG4xywu3J8aUi+rLEiOthEK1Ob6LjkUEBeKC8eFreM1LeB9adIuWpdre84RdWTfWvirzCpvyStNc6USpZtgMKTYGmbqgFtZouphiNEvW2zbUi82Qp5v9XqhXB/zGnJwHRFs+Qk/k20tTLnp1U1+5uIjm+uzbXkLix5KGHNwdDpsx4GrZs04HHN2aRcBHnPZokGajwtcv/1PDHW4VMLKb0bttZSYr1tiYYuFp/0p1EcsCJ1cUcQTdTm8xmjKJWune9L2L","iv":"9e427fa9c50d74903acc326dc5f57f32","keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"original","salt":"r6Ta3qV3uqZgiXbnJ6bmT5oJhqKpH3ojd2NUzmc2ZLU="}',
    });

    // Update AccountsController to only include Ethereum account (hide Solana account)
    this.fixture.state.engine.backgroundState.AccountsController = {
      internalAccounts: {
        accounts: {
          // Ethereum Account 1 only
          '4d7a5e0b-b261-4aed-8126-43972b0fa0a1': {
            address: '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6',
            id: '4d7a5e0b-b261-4aed-8126-43972b0fa0a1',
            metadata: {
              name: 'Account 1',
              importTime: 1684232000456,
              keyring: {
                type: 'HD Key Tree',
              },
            },
            options: {},
            methods: [
              'personal_sign',
              'eth_signTransaction',
              'eth_signTypedData_v1',
              'eth_signTypedData_v3',
              'eth_signTypedData_v4',
            ],
            type: 'eip155:eoa',
            scopes: ['eip155:1'],
          },
        },
        selectedAccount: '4d7a5e0b-b261-4aed-8126-43972b0fa0a1', // Default to Ethereum account
      },
    };
    // this.fixture.state.engine.backgroundState.PreferencesController.identities = {
    //   '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6': {
    //     address: '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6',
    //     name: 'Account 1',
    //     importTime: 1684232000456,
    //   },
    // };
    // this.fixture.state.engine.backgroundState.PreferencesController.selectedAddress = '0xbacec2e26c5c794de6e82a1a7e21b9c329fa8cf6';

    // Configure for Ethereum mainnet only
    this.fixture.state.engine.backgroundState.MultichainNetworkController = {
      selectedMultichainNetworkChainId: 'eip155:1', // Default to Ethereum mainnet
      multichainNetworkConfigurationsByChainId: {
        'eip155:1': {
          chainId: 'eip155:1',
          name: 'Ethereum Mainnet',
          nativeCurrency: 'ETH',
          isEvm: true,
        },
      },
      isEvmSelected: true, // Default to EVM mode
      networksWithTransactionActivity: {},
    };

    return this;
  }

  /**
   * Enables profile syncing in the fixture.
   * @returns {this} The current instance for method chaining.
   */
  withProfileSyncingEnabled() {
    // Enable AuthenticationController - user must be signed in for profile syncing
    merge(this.fixture.state.engine.backgroundState.AuthenticationController, {
      isSignedIn: true,
    });

    // Enable UserStorageController with all profile syncing features
    merge(this.fixture.state.engine.backgroundState.UserStorageController, {
      isBackupAndSyncEnabled: true,
      isBackupAndSyncUpdateLoading: false,
      isAccountSyncingEnabled: true,
      isContactSyncingEnabled: true,
      isContactSyncingInProgress: false,
    });

    // Enable basic functionality in settings (required for profile syncing)
    merge(this.fixture.state.settings, {
      basicFunctionalityEnabled: true,
    });

    return this;
  }

  /**
   * Disables profile syncing in the fixture.
   * @returns {this} The current instance for method chaining.
   */
  withProfileSyncingDisabled() {
    merge(this.fixture.state.engine.backgroundState.UserStorageController, {
      isBackupAndSyncEnabled: false,
      isAccountSyncingEnabled: false,
      isContactSyncingEnabled: false,
      basicFunctionalityEnabled: false,
    });

    return this;
  }

  // Mirrors the vault contents from the extension fixture.
  withMultiSRPKeyringController() {
    merge(this.fixture.state.engine.backgroundState.KeyringController, {
      vault:
        '{"keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"original","cipher":"LOubqgWR4O7Hv/RcdHPZ0Xi0GmCPD6whWLbO/jtnv44cAbBDumnAKX1NK1vgDNORSPVlUTkjyZwaHaStzuTIoJDurCBJN4TtsNUe5qIoJgttZ4Yv4hHxlg04V4nq/DXqAQaXedILMXnhbqZ+DP+tMc7JBXcVi12GIOiqV+ycLj8xFcasS/cdxtU6Os3pItdEZS89Rp7U58YOJBRQ2dlhBg0tCo2JnCrRhQmPGcTBuQVpn7SdkDx5PPC2slz3TRCjaHXWGCMPmx6jCDqI2sJL9ljpFB0/Jvlp18/9PE/cZ53GxybdtQiJ9andNHlfPf5WK+qI+QgySR8CMSRDWaP3hfEGHF1H0oqO7y/v6/pkShitdx7i5bC8Wt++heUOT8qpHTo1gDgUmNuZJsF4sG0Y18Hw8vLu+LfkoZgundb+cFjPFD1teTEnl2mmkpBvQCciynsCHPnHgnhKNHj6KMLhlSXWEItuYL/FY7dRpttfXzWfVQt56dQLLEYEYmO/f7C1uzAv6jbHBHqg16QtX3hCEnX0qzi1h3DQ8J5v44ckkQ/UGVvy6bOUC83b8DMLNPiSoMJDSsMaDzMmQ4J4xHzoHdD7/wBcXcbtUwccMGRHXv3jFLtHjuV+HQo0//I9xnjjAxfxX9SgyBQE8WCvUOxgCdwF8W7aBKcFEsoksLAWIQFxerWc3OxdvKSzvinI/j/MvyFMvVP5pm/BLWNj639GpFmIJVMprxkDL4H45CsgUcMe1Kiim/PFvo0D449vO1XL31ZIl9TxRVLaIr2cE3a95MFbzru9stqNkXz0EHrhSltFyoANMCim1HFxK/1yRl5Tt4u9Vjjyvj6a4Wtzy7SyLHhx0PfrlARq2euwGQal46cZYYKuMsnwvQf3ba/uJF3hF3FyAl9fn28HKRurImsiKNDvT+kaoUMFYoX6i+qR0LHoA7OfeqXpsKYyMx8LnUq7zKP4ZVc8sysI95YYYwdzhq2xzHDQfOplYRFkQllxqtkoTxMPHz/J1W1kjBTpCI7M8n8qLv53ryNq4y+hQx0RQNtvGPE9OcQTDUpkCM5dv7p8Ja8uLTDehKeKzs315IRBVJN8mdGy18EK5sjDoileDQ==","iv":"e88d2415e223bb8cc67c74ce47de1a6b","salt":"BX+ED3hq9K3tDBdnobBphA=="}',
    });

    return this;
  }

  withTokens(
    tokens: Record<string, unknown>[],
    chainId: string = CHAIN_IDS.MAINNET,
    account: string = DEFAULT_FIXTURE_ACCOUNT,
  ) {
    merge(this.fixture.state.engine.backgroundState.TokensController, {
      allTokens: {
        [chainId]: {
          [account]: tokens,
        },
      },
    });
    return this;
  }

  withDetectedTokens(tokens: Record<string, unknown>[]) {
    merge(this.fixture.state.engine.backgroundState.TokensController, {
      allDetectedTokens: {
        [CHAIN_IDS.MAINNET]: {
          [DEFAULT_FIXTURE_ACCOUNT]: tokens,
        },
      },
    });
    return this;
  }

  withIncomingTransactionPreferences(incomingTransactionPreferences: boolean) {
    merge(this.fixture.state.engine.backgroundState.PreferencesController, {
      showIncomingTransactions: incomingTransactionPreferences,
    });
    return this;
  }

  withTransactions(transactions: Record<string, unknown>[]) {
    merge(this.fixture.state.engine.backgroundState.TransactionController, {
      transactions,
    });
    return this;
  }

  /**
   * Sets the MetaMetrics opt-in state to 'agreed' in the fixture's asyncState
   * and enables the AnalyticsController.
   * This indicates that the user has agreed to MetaMetrics data collection.
   *
   * @returns {this} The current instance for method chaining.
   */
  withMetaMetricsOptIn() {
    if (!this.fixture.asyncState) {
      this.fixture.asyncState = {};
    }
    this.fixture.asyncState['@MetaMask:metricsOptIn'] = 'agreed';

    // Also set up AnalyticsController state so analytics.isEnabled() returns true
    this.fixture.state.engine.backgroundState.AnalyticsController = {
      optedIn: true,
      analyticsId: TEST_ANALYTICS_ID,
    };
    return this;
  }

  /**
   * Adds multiple test dapp tabs to the browser state.
   * This is intended to be used for testing multiple dapps concurrently.
   * The dapps are opened in the order they are added.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   * @param {number} extraTabs - The amount of extra tabs to open.
   */
  withExtraTabs(extraTabs = 1) {
    if (!this.fixture.state.browser.tabs) {
      this.fixture.state.browser.tabs = [];
    }

    // We start at 1 to easily identify the tab across all tests
    for (let i = 1; i <= extraTabs; i++) {
      this.fixture.state.browser.tabs.push({
        url: getDappUrl(i),
        id: DEFAULT_TAB_ID + i,
        isArchived: false,
      });
    }

    return this;
  }

  /**
   * Sets ETH as the primary currency for both currency rate controller and settings.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withETHAsPrimaryCurrency() {
    this.fixture.state.engine.backgroundState.CurrencyRateController.currentCurrency =
      'ETH';
    this.fixture.state.settings.primaryCurrency = 'ETH';
    return this;
  }

  withBackupAndSyncSettings(
    options: BackupAndSyncSettings = {
      isBackupAndSyncEnabled: true,
      isAccountSyncingEnabled: true,
      isContactSyncingEnabled: true,
    },
  ) {
    const {
      isBackupAndSyncEnabled = true,
      isAccountSyncingEnabled = true,
      isContactSyncingEnabled = true,
    } = options;

    // Backup and Sync Settings
    this.fixture.state.engine.backgroundState.UserStorageController = {
      isBackupAndSyncEnabled,
      isAccountSyncingEnabled,
      isContactSyncingEnabled,
      isBackupAndSyncUpdateLoading: false,
      isContactSyncingInProgress: false,
    };
    return this;
  }

  /**
   * Disables the seedphraseBackedUp flag in the user state.
   * This is useful for testing scenarios where the user hasn't backed up their seedphrase.
   *
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining
   */
  withSeedphraseBackedUpDisabled() {
    this.fixture.state.user.seedphraseBackedUp = false;
    return this;
  }

  /**
   * Merges provided data into the background state of the AccountTreeController.
   * If no data is provided, sets up a comprehensive default state following @metamask/account-tree-controller specs
   * with pre-defined grouping rules. Uses existing entropy sources (MOCK_ENTROPY_SOURCE),
   * real keyring types (KeyringTypes.hd, .qr, .simple), and actual Snap IDs from the codebase.
   * If custom wallets are provided, they completely replace the defaults.
   * @param {object} data - Data to merge into the AccountTreeController's state. Optional.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withAccountTreeController(data: Record<string, unknown> = {}) {
    // Define a comprehensive default state following @metamask/account-tree-controller specs
    // Leverages existing keyring types, entropy sources (MOCK_ENTROPY_SOURCE*), and real Snap IDs from the codebase
    const defaultAccountTreeState = {
      accountTree: {
        wallets: {
          // Entropy-based Multichain Wallet (Primary SRP)
          [ENTROPY_WALLET_1_ID]: {
            id: ENTROPY_WALLET_1_ID,
            type: 'Entropy',
            metadata: {
              name: 'Secret Recovery Phrase 1',
              entropySource: MOCK_ENTROPY_SOURCE,
            },
            groups: {
              [`${ENTROPY_WALLET_1_ID}/account-1`]: {
                id: `${ENTROPY_WALLET_1_ID}/account-1`,
                type: 'MultipleAccount',
                accounts: [
                  '4d7a5e0b-b261-4aed-8126-43972b0fa0a1', // Account 1 - EVM address
                  'a1b2c3d4-e5f6-7890-abcd-ef1234567890', // Account 1 - Solana address
                ],
                metadata: {
                  name: 'Account 1',
                },
              },
              [`${ENTROPY_WALLET_1_ID}/account-2`]: {
                id: `${ENTROPY_WALLET_1_ID}/account-2`,
                type: 'MultipleAccount',
                accounts: [
                  '5e8c6f1a-c372-5bed-9237-1f03c3d4e5b2', // Account 2 - EVM address
                  'b2c3d4e5-f6g7-8901-bcde-f23456789012', // Account 2 - Solana address
                ],
                metadata: {
                  name: 'Account 2',
                },
              },
            },
          },
          // Secondary Entropy Wallet (Secondary SRP)
          [ENTROPY_WALLET_2_ID]: {
            id: ENTROPY_WALLET_2_ID,
            type: 'Entropy',
            metadata: {
              name: 'Secret Recovery Phrase 2',
              entropySource: MOCK_ENTROPY_SOURCE_2,
            },
            groups: {
              [`${ENTROPY_WALLET_2_ID}/account-1`]: {
                id: `${ENTROPY_WALLET_2_ID}/account-1`,
                type: 'MultipleAccount',
                accounts: [
                  'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Secondary wallet Account 1
                ],
                metadata: {
                  name: 'Account 1',
                },
              },
            },
          },
          // Third Entropy-based Multichain Wallet (HD Keyring)
          [ENTROPY_WALLET_3_ID]: {
            id: ENTROPY_WALLET_3_ID,
            type: 'Entropy',
            metadata: {
              name: 'Secret Recovery Phrase 3',
              entropySource: MOCK_ENTROPY_SOURCE_3,
            },
            groups: {
              [`${ENTROPY_WALLET_3_ID}/account-1`]: {
                id: `${ENTROPY_WALLET_3_ID}/account-1`,
                type: 'MultipleAccount',
                accounts: [
                  '6f9d7e2b-d483-6cfe-a348-2g14d4e5f6c3', // HD Account 1
                  '7a0e8c3c-e594-7dg0-b459-3h25e5f6d7d4', // HD Account 2
                ],
                metadata: {
                  name: 'Account 1',
                },
              },
            },
          },
          // QR Hardware Wallet (KeyringTypes.qr)
          [QR_HARDWARE_WALLET_ID]: {
            id: QR_HARDWARE_WALLET_ID,
            type: 'Keyring',
            metadata: {
              name: 'QR Hardware Device',
              keyringType: 'QR Hardware Wallet Device', // KeyringTypes.qr
            },
            groups: {
              [`${QR_HARDWARE_WALLET_ID}/ethereum`]: {
                id: `${QR_HARDWARE_WALLET_ID}/ethereum`,
                type: 'MultipleAccount',
                accounts: [
                  'b374ca01-3934-e498-e5ba-d3409147f34e', // Hardware Account
                ],
                metadata: {
                  name: 'Hardware Accounts',
                },
              },
            },
          },
          // Simple Key Pair (KeyringTypes.simple)
          [SIMPLE_KEYRING_WALLET_ID]: {
            id: SIMPLE_KEYRING_WALLET_ID,
            type: 'Keyring',
            metadata: {
              name: 'Imported Accounts',
              keyringType: 'Simple Key Pair', // KeyringTypes.simple
            },
            groups: {
              [`${SIMPLE_KEYRING_WALLET_ID}/ethereum`]: {
                id: `${SIMPLE_KEYRING_WALLET_ID}/ethereum`,
                type: 'MultipleAccount',
                accounts: [
                  '43e1c289-177e-cfbe-6ef3-4b5fb2b66ebc', // Imported Account
                ],
                metadata: {
                  name: 'Private Key Accounts',
                },
              },
            },
          },
          // Snap Keyring - Simple Keyring Snap
          [SIMPLE_KEYRING_SNAP_ID]: {
            id: SIMPLE_KEYRING_SNAP_ID,
            type: 'Snap',
            metadata: {
              name: 'Simple Keyring Snap',
              snapId: 'npm:@metamask/snap-simple-keyring-snap',
            },
            groups: {
              [`${SIMPLE_KEYRING_SNAP_ID}/ethereum`]: {
                id: `${SIMPLE_KEYRING_SNAP_ID}/ethereum`,
                type: 'MultipleAccount',
                accounts: [
                  'e697fe4b-399h-899i-fgh0-h567890124de', // Snap Account 1
                ],
                metadata: {
                  name: 'Snap Ethereum Accounts',
                },
              },
            },
          },
          // Snap Keyring - Bitcoin Wallet Snap
          [GENERIC_SNAP_WALLET_1_ID]: {
            id: GENERIC_SNAP_WALLET_1_ID,
            type: 'Snap',
            metadata: {
              name: 'Bitcoin Wallet Snap',
              snapId: 'npm:@metamask/bitcoin-wallet-snap',
            },
            groups: {
              [`${GENERIC_SNAP_WALLET_1_ID}/bitcoin`]: {
                id: `${GENERIC_SNAP_WALLET_1_ID}/bitcoin`,
                type: 'MultipleAccount',
                accounts: [
                  'f798gf5c-4a0i-9a0j-ghi1-i678901235ef', // Bitcoin Account 1
                ],
                metadata: {
                  name: 'Bitcoin Accounts',
                },
              },
            },
          },
          // Snap Keyring - Solana Wallet Snap
          [GENERIC_SNAP_WALLET_2_ID]: {
            id: GENERIC_SNAP_WALLET_2_ID,
            type: 'Snap',
            metadata: {
              name: 'Solana Wallet Snap',
              snapId: 'npm:@metamask/solana-wallet-snap',
            },
            groups: {
              [`${GENERIC_SNAP_WALLET_2_ID}/solana`]: {
                id: `${GENERIC_SNAP_WALLET_2_ID}/solana`,
                type: 'MultipleAccount',
                accounts: [
                  'g899hg6d-5b1j-0b1k-hij2-j789012346fg', // Solana Account 1
                ],
                metadata: {
                  name: 'Solana Accounts',
                },
              },
            },
          },
        },
        selectedAccountGroup: `${ENTROPY_WALLET_1_ID}/account-1`,
      },
    };

    // Check if user provided their own wallets - if so, use those instead of defaults
    const providedAccountTree = data.accountTree as {
      wallets?: Record<string, unknown>;
    };
    const hasCustomWallets = providedAccountTree?.wallets;

    let stateToMerge;
    if (hasCustomWallets) {
      // User provided custom wallets, so skip defaults and use their data directly
      stateToMerge = data;
    } else {
      // No custom wallets provided, merge with comprehensive defaults
      stateToMerge = merge({}, defaultAccountTreeState, data);
    }

    merge(
      this.fixture.state.engine.backgroundState.AccountTreeController,
      stateToMerge,
    );

    // Also update KeyringController to ensure compatibility with legacy UI
    // This creates the accounts that the legacy account selection UI expects when multichain accounts are disabled
    merge(this.fixture.state.engine.backgroundState.KeyringController, {
      keyrings: [
        {
          type: 'HD Key Tree',
          accounts: [DEFAULT_FIXTURE_ACCOUNT],
        },
        {
          type: 'Simple Key Pair',
          accounts: ['0xDDFFa077069E1d4d478c5967809f31294E24E674'], // Imported account
        },
      ],
      vault:
        '{"cipher":"vxFqPMlClX2xjUidoCTiwazr43W59dKIBp6ihT2lX66q8qPTeBRwv7xgBaGDIwDfk4DpJ3r5FBety1kFpS9ni3HtcoNQsDN60Pa80L94gta0Fp4b1jVeP8EJ7Ho71mJ360aDFyIgxPBSCcHWs+l27L3WqF2VpEuaQonK1UTF7c3WQ4pyio4jMAH9x2WQtB11uzyOYiXWmiD3FMmWizqYZY4tHuRlzJZTWrgE7njJLaGMlMmw86+ZVkMf55jryaDtrBVAoqVzPsK0bvo1cSsonxpTa6B15A5N2ANyEjDAP1YVl17roouuVGVWZk0FgDpP82i0YqkSI9tMtOTwthi7/+muDPl7Oc7ppj9LU91JYH6uHGomU/pYj9ufrjWBfnEH/+ZDvPoXl00H1SmX8FWs9NvOg7DZDB6ULs4vAi2/5KGs7b+Td2PLmDf75NKqt03YS2XeRGbajZQ/jjmRt4AhnWgnwRzsSavzyjySWTWiAgn9Vp/kWpd70IgXWdCOakVf2TtKQ6cFQcAf4JzP+vqC0EzgkfbOPRetrovD8FHEFXQ+crNUJ7s41qRw2sketk7FtYUDCz/Junpy5YnYgkfcOTRBHAoOy6BfDFSncuY+08E6eiRHzXsXtbmVXenor15pfbEp/wtfV9/vZVN7ngMpkho3eGQjiTJbwIeA9apIZ+BtC5b7TXWLtGuxSZPhomVkKvNx/GNntjD7ieLHvzCWYmDt6BA9hdfOt1T3UKTN4yLWG0v+IsnngRnhB6G3BGjJHUvdR6Zp5SzZraRse8B3z5ixgVl2hBxOS8+Uvr6LlfImaUcZLMMzkRdKeowS/htAACLowVJe3pU544IJ2CGTsnjwk9y3b5bUJKO3jXukWjDYtrLNKfdNuQjg+kqvIHaCQW40t+vfXGhC5IDBWC5kuev4DJAIFEcvJfJgRrm8ua6LrzEfH0GuhjLwYb+pnQ/eg8dmcXwzzggJF7xK56kxgnA4qLtOqKV4NgjVR0QsCqOBKb3l5LQMlSktdfgp9hlW","iv":"b09c32a79ed33844285c0f1b1b4d1feb","keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"original","salt":"GYNFQCSCigu8wNp8cS8C3w=="}',
    });
    return this;
  }

  withNetworkEnabledMap(
    data: NetworkEnablementControllerState['enabledNetworkMap'],
  ) {
    const stateToMerge: NetworkEnablementControllerState = {
      enabledNetworkMap: data,
      nativeAssetIdentifiers: {},
    };

    merge(
      this.fixture.state.engine.backgroundState.NetworkEnablementController,
      stateToMerge,
    );

    return this;
  }

  withCleanBannerState() {
    merge(this.fixture.state, {
      banners: {
        dismissedBanners: [],
      },
    });

    return this;
  }

  withSnapController(data: Record<string, unknown> = {}) {
    merge(this.fixture.state.engine.backgroundState.SnapController, data);
    return this;
  }

  /**
   * Stores data in the StorageService (FilesystemStorage) as part of the fixture.
   * This is needed for snaps that read large data (e.g. source code) via StorageService
   * rather than from SnapController state (since migration 119 moved snap source code there).
   *
   * @param namespace - The controller namespace (e.g. 'SnapController').
   * @param key - The storage key (e.g. the snap ID).
   * @param value - The JSON value to store.
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withStorageService(namespace: string, key: string, value: unknown) {
    if (!this.fixture.filesystemStorage) {
      this.fixture.filesystemStorage = {};
    }
    const fullKey = `storageService:${namespace}:${key}`;
    this.fixture.filesystemStorage[fullKey] = JSON.stringify(value);
    return this;
  }

  withSnapControllerOnStartLifecycleSnap() {
    const snapId = 'npm:@metamask/lifecycle-hooks-example-snap';
    // eslint-disable-next-line no-template-curly-in-string
    const sourceCode =
      '(()=>{var e={d:(n,t)=>{for(var a in t)e.o(t,a)&&!e.o(n,a)&&Object.defineProperty(n,a,{enumerable:!0,get:t[a]})},o:(e,n)=>Object.prototype.hasOwnProperty.call(e,n),r:e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}},n={};(()=>{"use strict";function t(e,n,t){if("string"==typeof e)throw new Error(`An HTML element ("${String(e)}") was used in a Snap component, which is not supported by Snaps UI. Please use one of the supported Snap components.`);if(!e)throw new Error("A JSX fragment was used in a Snap component, which is not supported by Snaps UI. Please use one of the supported Snap components.");return e({...n,key:t})}function a(e){return Object.fromEntries(Object.entries(e).filter((([,e])=>void 0!==e)))}function r(e){return n=>{const{key:t=null,...r}=n;return{type:e,props:a(r),key:t}}}e.r(n),e.d(n,{onInstall:()=>p,onStart:()=>l,onUpdate:()=>d});const o=r("Box"),s=r("Text"),l=async()=>await snap.request({method:"snap_dialog",params:{type:"alert",content:t(o,{children:t(s,{children:\'The client was started successfully, and the "onStart" handler was called.\'})})}}),p=async()=>await snap.request({method:"snap_dialog",params:{type:"alert",content:t(o,{children:t(s,{children:\'The Snap was installed successfully, and the "onInstall" handler was called.\'})})}}),d=async()=>await snap.request({method:"snap_dialog",params:{type:"alert",content:t(o,{children:t(s,{children:\'The Snap was updated successfully, and the "onUpdate" handler was called.\'})})}})})(),module.exports=n})();';

    return this.withPermissionController({
      subjects: {
        [snapId]: {
          origin: snapId,
          permissions: {
            'endowment:lifecycle-hooks': {
              caveats: null,
              date: 1750244440562,
              id: '0eKn8SjGEH6o_6Mhcq3Lw',
              invoker: snapId,
              parentCapability: 'endowment:lifecycle-hooks',
            },
            snap_dialog: {
              caveats: null,
              date: 1750244440562,
              id: 'Fbme_UWcuSK92JqfrT4G2',
              invoker: snapId,
              parentCapability: 'snap_dialog',
            },
          },
        },
      },
    })
      .withSnapController({
        snaps: {
          [snapId]: {
            auxiliaryFiles: [],
            blocked: false,
            enabled: true,
            id: snapId,
            initialPermissions: {
              'endowment:lifecycle-hooks': {},
              snap_dialog: {},
            },
            localizationFiles: [],
            manifest: {
              description:
                'MetaMask example snap demonstrating the use of the `onStart`, `onInstall`, and `onUpdate` lifecycle hooks.',
              initialPermissions: {
                'endowment:lifecycle-hooks': {},
                snap_dialog: {},
              },
              manifestVersion: '0.1',
              platformVersion: '8.1.0',
              proposedName: 'Lifecycle Hooks Example Snap',
              repository: {
                type: 'git',
                url: 'https://github.com/MetaMask/snaps.git',
              },
              source: {
                location: {
                  npm: {
                    filePath: 'dist/bundle.js',
                    packageName: '@metamask/lifecycle-hooks-example-snap',
                    registry: 'https://registry.npmjs.org',
                  },
                },
                shasum: '5tlM5E71Fbeid7I3F0oQURWL7/+0620wplybtklBCHQ=',
              },
              version: '2.2.0',
            },
            status: 'stopped',
            version: '2.2.0',
            versionHistory: [
              {
                date: 1750244439310,
                origin: 'https://metamask.github.io',
                version: '2.2.0',
              },
            ],
          },
        },
      })
      .withStorageService('SnapController', snapId, { sourceCode });
  }

  withTokenRates(chainId: string, tokenAddress: string, price: number) {
    merge(this.fixture.state.engine.backgroundState.TokenRatesController, {
      marketData: {
        [chainId]: {
          [tokenAddress]: {
            tokenAddress,
            price,
          },
        },
      },
    });

    return this;
  }

  /**
   * Sets mUSD conversion fixture state: user flags, fiat orders, currency rates,
   * and Mainnet token balances (USDC, optional MUSD) and native ETH for the default account.
   * Call after withNetworkController, withTokensForAllPopularNetworks([ETH, USDC, MUSD?]), and withTokenRates.
   *
   * @param options - mUSD conversion options (education seen, USDC/MUSD balances).
   * @returns {FixtureBuilder} - The FixtureBuilder instance for method chaining.
   */
  withMusdConversion(options: MusdFixtureOptions) {
    const USDC_DECIMALS = 6;
    const MUSD_DECIMALS = 6;
    const ETH_BALANCE_WEI = '0x' + (BigInt(10) * BigInt(10 ** 18)).toString(16);

    merge(this.fixture.state.user, {
      musdConversionEducationSeen: options.musdConversionEducationSeen,
    });

    this.fixture.state.fiatOrders = this.fixture.state.fiatOrders ?? {};
    merge(this.fixture.state.fiatOrders, {
      detectedGeolocation: 'US',
      rampRoutingDecision: 'AGGREGATOR',
    });

    if (!this.fixture.state.engine.backgroundState.CurrencyRateController) {
      merge(this.fixture.state.engine.backgroundState, {
        CurrencyRateController: { currentCurrency: 'usd', currencyRates: {} },
      });
    }
    merge(this.fixture.state.engine.backgroundState.CurrencyRateController, {
      currentCurrency: 'usd',
      currencyRates: {
        ETH: {
          conversionDate: Date.now() / 1000,
          conversionRate: 3000.0,
          usdConversionRate: 3000.0,
        },
      },
    });

    const ac = this.fixture.state.engine.backgroundState.AccountsController;
    const accountId = ac?.internalAccounts?.selectedAccount;
    const accountAddress = ac?.internalAccounts?.accounts?.[accountId]?.address;
    if (!accountAddress) return this;

    const engine = this.fixture.state.engine.backgroundState;
    if (!engine.AccountTrackerController) {
      merge(engine, {
        AccountTrackerController: { accounts: {}, accountsByChainId: {} },
      });
    }
    const atc = engine.AccountTrackerController;
    atc.accounts = atc.accounts ?? {};
    atc.accountsByChainId = atc.accountsByChainId ?? {};
    atc.accounts[accountAddress] = { balance: ETH_BALANCE_WEI };
    atc.accountsByChainId[CHAIN_IDS.MAINNET] = {
      ...atc.accountsByChainId[CHAIN_IDS.MAINNET],
      [accountAddress]: { balance: ETH_BALANCE_WEI },
    };

    if (!engine.TokenBalancesController) {
      merge(engine, { TokenBalancesController: { tokenBalances: {} } });
    }
    engine.TokenBalancesController.tokenBalances =
      engine.TokenBalancesController.tokenBalances ?? {};
    const tb = engine.TokenBalancesController.tokenBalances;
    if (!tb[accountAddress]) tb[accountAddress] = {};
    if (!tb[accountAddress][CHAIN_IDS.MAINNET])
      tb[accountAddress][CHAIN_IDS.MAINNET] = {};
    const mainnetBalances = tb[accountAddress][CHAIN_IDS.MAINNET] as Record<
      string,
      string
    >;

    if (options.hasUsdcBalance !== false) {
      mainnetBalances[toChecksumHexAddress(USDC_MAINNET.toLowerCase())] =
        '0x' +
        Math.floor((options.usdcBalance ?? 100) * 10 ** USDC_DECIMALS).toString(
          16,
        );
    }
    if (options.hasMusdBalance) {
      mainnetBalances[toChecksumHexAddress(MUSD_MAINNET.toLowerCase())] =
        '0x' +
        Math.floor((options.musdBalance ?? 10) * 10 ** MUSD_DECIMALS).toString(
          16,
        );
    }

    return this;
  }

  /**
   * Build and return the fixture object.
   * @returns {Object} - The built fixture object.
   */
  build() {
    return this.fixture;
  }
}

export default FixtureBuilder;
