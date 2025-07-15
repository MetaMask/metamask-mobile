import { hasProperty, isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { BtcScope, SolScope } from '@metamask/keyring-api';
import { ensureValidState } from './util';

// Native asset constants for migration
const BTC_NATIVE_ASSET = `${BtcScope.Mainnet}/slip44:0`;
const BTC_TESTNET_NATIVE_ASSET = `${BtcScope.Testnet}/slip44:0`;
const BTC_TESTNET4_NATIVE_ASSET = `${BtcScope.Testnet4}/slip44:0`;
const BTC_SIGNET_NATIVE_ASSET = `${BtcScope.Signet}/slip44:0`;
const BTC_REGTEST_NATIVE_ASSET = `${BtcScope.Regtest}/slip44:0`;
const SOL_NATIVE_ASSET = `${SolScope.Mainnet}/slip44:501`;
const SOL_TESTNET_NATIVE_ASSET = `${SolScope.Testnet}/slip44:501`;
const SOL_DEVNET_NATIVE_ASSET = `${SolScope.Devnet}/slip44:501`;

const AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS = {
  [BtcScope.Mainnet]: {
    chainId: BtcScope.Mainnet,
    name: 'Bitcoin',
    nativeCurrency: BTC_NATIVE_ASSET,
    isEvm: false,
  },
  [BtcScope.Testnet]: {
    chainId: BtcScope.Testnet,
    name: 'Bitcoin Testnet',
    nativeCurrency: BTC_TESTNET_NATIVE_ASSET,
    isEvm: false,
  },
  [BtcScope.Testnet4]: {
    chainId: BtcScope.Testnet4,
    name: 'Bitcoin Testnet4',
    nativeCurrency: BTC_TESTNET4_NATIVE_ASSET,
    isEvm: false,
  },
  [BtcScope.Signet]: {
    chainId: BtcScope.Signet,
    name: 'Bitcoin Mutinynet',
    nativeCurrency: BTC_SIGNET_NATIVE_ASSET,
    isEvm: false,
  },
  [BtcScope.Regtest]: {
    chainId: BtcScope.Regtest,
    name: 'Bitcoin Regtest',
    nativeCurrency: BTC_REGTEST_NATIVE_ASSET,
    isEvm: false,
  },
  [SolScope.Mainnet]: {
    chainId: SolScope.Mainnet,
    name: 'Solana',
    nativeCurrency: SOL_NATIVE_ASSET,
    isEvm: false,
  },
  [SolScope.Testnet]: {
    chainId: SolScope.Testnet,
    name: 'Solana Testnet',
    nativeCurrency: SOL_TESTNET_NATIVE_ASSET,
    isEvm: false,
  },
  [SolScope.Devnet]: {
    chainId: SolScope.Devnet,
    name: 'Solana Devnet',
    nativeCurrency: SOL_DEVNET_NATIVE_ASSET,
    isEvm: false,
  },
};

const getDefaultMultichainNetworkControllerState = () => ({
  multichainNetworkConfigurationsByChainId:
    AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
  selectedMultichainNetworkChainId: SolScope.Mainnet,
  isEvmSelected: true,
  networksWithTransactionActivity: {},
});

/**
 * Migration 87: Populate MultichainNetworkController with default state if undefined
 *
 * This migration ensures that the MultichainNetworkController state is populated
 * with the default network configurations if it's undefined.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 87;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(
        state.engine.backgroundState,
        'MultichainNetworkController',
      ) ||
      !isObject(state.engine.backgroundState.MultichainNetworkController)
    ) {
      state.engine.backgroundState.MultichainNetworkController =
        getDefaultMultichainNetworkControllerState();
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: populating MultichainNetworkController failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
