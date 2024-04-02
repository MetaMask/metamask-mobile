import { NETWORKS_CHAIN_ID } from '../constants/network';
import {
  selectSelectedAddress,
  selectSmartTransactionsOptInStatus,
} from './preferencesController';
import { RootState } from '../reducers';
import { swapsSmartTxFlagEnabled } from '../reducers/swaps';
import { isHardwareAccount } from '../util/address';
import { selectChainId, selectProviderConfig } from './networkController';

export const ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS = [
  NETWORKS_CHAIN_ID.MAINNET,
  NETWORKS_CHAIN_ID.GOERLI,
  NETWORKS_CHAIN_ID.SEPOLIA,
];
export const getSmartTransactionsEnabled = (state: RootState) => {
  const selectedAddress = selectSelectedAddress(state);
  const addrIshardwareAccount = isHardwareAccount(selectedAddress);
  const chainId = selectChainId(state);
  const providerConfigRpcUrl = selectProviderConfig(state).rpcUrl;

  const isAllowedNetwork =
    ALLOWED_SMART_TRANSACTIONS_CHAIN_IDS.includes(chainId);

  // E.g. if a user has a Mainnet Flashbots RPC, we do not want to bypass it
  // Only want to bypass on default mainnet RPC
  const canBypassRpc =
    chainId === NETWORKS_CHAIN_ID.MAINNET
      ? providerConfigRpcUrl === undefined
      : true;

  const smartTransactionsFeatureFlagEnabled = swapsSmartTxFlagEnabled(state);

  const smartTransactionsLiveness =
    state.engine.backgroundState.SmartTransactionsController
      .smartTransactionsState?.liveness;

  return Boolean(
    isAllowedNetwork &&
      canBypassRpc &&
      !addrIshardwareAccount &&
      smartTransactionsFeatureFlagEnabled &&
      smartTransactionsLiveness,
  );
};
export const getIsSmartTransaction = (state: RootState) => {
  const isSmartTransactionsEnabled = getSmartTransactionsEnabled(state);
  const smartTransactionsOptInStatus =
    selectSmartTransactionsOptInStatus(state);

  return isSmartTransactionsEnabled && smartTransactionsOptInStatus;
};
