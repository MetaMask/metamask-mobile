import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { MessengerClientInitFunction } from '../types';
import {
  MoneyAccountBalanceService,
  type MoneyAccountBalanceServiceMessenger,
} from '@metamask/money-account-controller';
import { Hex } from '@metamask/utils';

/**
 * TODO: Replace with actual values when the mUSD and Veda Vault are deployed on selected network.
 * We'll likely want to retrieve values from build or remote flags.
 * */

const TEST_VAULT_ADDRESS = '0xB5F07d769dD60fE54c97dd53101181073DDf21b2' as Hex;
const TEST_ACCOUNTANT_ADDRESS =
  '0x800ebc3B74F67EaC27C9CCE4E4FF28b17CdCA173' as Hex;
const ARBITRUM_USDC_ADDRESS =
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as Hex;
const ARBITRUM_USDC_DECIMALS = 6;

const TEMP_CONFIG = {
  vaultAddress: TEST_VAULT_ADDRESS,
  vaultChainId: CHAIN_IDS.ARBITRUM,
  accountantAddress: TEST_ACCOUNTANT_ADDRESS,
  underlyingTokenAddress: ARBITRUM_USDC_ADDRESS,
  underlyingTokenDecimals: ARBITRUM_USDC_DECIMALS,
};

/**
 * Initialize the MoneyAccountBalanceService.
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
    config: {
      ...TEMP_CONFIG,
    },
  });

  return { controller };
};
