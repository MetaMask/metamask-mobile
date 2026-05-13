import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MessengerClientInitFunction } from '../types';
import {
  MoneyAccountBalanceService,
  MoneyAccountBalanceServiceMessenger,
} from '@metamask/money-account-balance-service';

const VEDA_TEST_VAULT = '0xB5F07d769dD60fE54c97dd53101181073DDf21b2';
const VEDA_TEST_ACCOUNTANT = '0x800ebc3B74F67EaC27C9CCE4E4FF28b17CdCA173';
const ARB_USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const ARB_USDC_DECIMALS = 6;

const TEST_VAULT_CONFIG = {
  vaultAddress: VEDA_TEST_VAULT,
  vaultChainId: CHAIN_IDS.ARBITRUM,
  accountantAddress: VEDA_TEST_ACCOUNTANT,
  underlyingTokenAddress: ARB_USDC_ADDRESS,
  underlyingTokenDecimals: ARB_USDC_DECIMALS,
} as const;

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
    ...TEST_VAULT_CONFIG,
  });

  return { controller };
};
