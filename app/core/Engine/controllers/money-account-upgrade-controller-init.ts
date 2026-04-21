import {
  MoneyAccountUpgradeController,
  type MoneyAccountUpgradeControllerMessenger,
} from '@metamask/money-account-upgrade-controller';
import { type Hex, hexToNumber } from '@metamask/utils';
import type { MessengerClientInitFunction } from '../types';
import { getDeleGatorEnvironment } from '../../Delegation/environment';

const ZERO_ADDRESS: Hex = '0x0000000000000000000000000000000000000000';
const DEFAULT_CHAIN_ID: Hex = '0xa4b1';

/**
 * Initialize the MoneyAccountUpgradeController.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const moneyAccountUpgradeControllerInit: MessengerClientInitFunction<
  MoneyAccountUpgradeController,
  MoneyAccountUpgradeControllerMessenger
> = ({ controllerMessenger }) => {
  const controller = new MoneyAccountUpgradeController({
    messenger: controllerMessenger,
  });

  (async () => {
    const serviceDetails = await controllerMessenger.call(
      'ChompApiService:getServiceDetails',
      [DEFAULT_CHAIN_ID],
    );
    const chain = serviceDetails.chains[DEFAULT_CHAIN_ID];
    const musdTokenAddress =
      chain?.protocol.vedaProtocol?.supportedTokens[0]?.tokenAddress ??
      ZERO_ADDRESS;

    const environment = getDeleGatorEnvironment(hexToNumber(DEFAULT_CHAIN_ID));

    await controller.init(DEFAULT_CHAIN_ID, {
      musdTokenAddress,
      delegatorImplAddress: environment.EIP7702StatelessDeleGatorImpl,
      redeemerEnforcer: environment.caveatEnforcers.RedeemerEnforcer,
      valueLteEnforcer: environment.caveatEnforcers.ValueLteEnforcer,
    });
  })();

  return { controller };
};
