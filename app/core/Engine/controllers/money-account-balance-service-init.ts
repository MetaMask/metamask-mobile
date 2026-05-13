import { MessengerClientInitFunction } from '../types';
import {
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceMessenger,
} from '@metamask/money-account-balance-service';
import { type Hex } from '@metamask/utils';
import { DEV_VAULT_CONFIG } from '../../../selectors/featureFlagController/moneyAccount';

// TODO(#29932): These should be sourced from remote feature flags (same pattern
// as selectMoneyAccountVaultConfig) or from ChompApiService post-unlock (same
// pattern as money-account-upgrade-controller-init.ts). The service currently
// requires all addresses at construction time; revisit once it supports deferred
// initialisation or once remote-config is plumbed into the Engine init path.
//
// The mUSD token address is the same on all supported chains per the Earn
// constants (`MUSD_TOKEN_ADDRESS`). It is inlined here to avoid importing from
// the UI component layer into the Engine controller layer.
const MUSD_TOKEN_ADDRESS: Hex = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const MUSD_TOKEN_DECIMALS = 6;

/**
 * Initialize the money account balance service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const moneyAccountBalanceServiceInit: MessengerClientInitFunction<
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new MoneyAccountBalanceService({
    messenger: controllerMessenger,
    vaultAddress: DEV_VAULT_CONFIG.boringVault as Hex,
    vaultChainId: DEV_VAULT_CONFIG.chainId as Hex,
    accountantAddress: DEV_VAULT_CONFIG.accountantAddress as Hex,
    underlyingTokenAddress: MUSD_TOKEN_ADDRESS,
    underlyingTokenDecimals: MUSD_TOKEN_DECIMALS,
  });

  return { controller };
};
