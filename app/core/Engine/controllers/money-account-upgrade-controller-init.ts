import {
  MoneyAccountUpgradeController,
  type MoneyAccountUpgradeControllerMessenger,
} from '@metamask/money-account-upgrade-controller';
import { type Hex, hexToNumber } from '@metamask/utils';
import type { MessengerClientInitFunction } from '../types';
import type { MoneyAccountUpgradeControllerInitMessenger } from '../messengers/money-account-upgrade-controller-messenger';
import { getDeleGatorEnvironment } from '../../Delegation/environment';
import Logger from '../../../util/Logger';
const LOG_PREFIX = '[MoneyAccountUpgradeControllerInit]';

const ZERO_ADDRESS: Hex = '0x0000000000000000000000000000000000000000';
const DEFAULT_CHAIN_ID: Hex = '0xa4b1';

/**
 * Initialize the MoneyAccountUpgradeController.
 *
 * The upgrade controller needs a bearer token (via ChompApiService →
 * AuthenticationController) to fetch service details, which is only available
 * once the keyring is unlocked. We therefore defer bootstrapping until the
 * first unlock event (or run it immediately if the keyring is already
 * unlocked).
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.initMessenger - The init messenger for unlock signals.
 * @returns The initialized controller.
 */
export const moneyAccountUpgradeControllerInit: MessengerClientInitFunction<
  MoneyAccountUpgradeController,
  MoneyAccountUpgradeControllerMessenger,
  MoneyAccountUpgradeControllerInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const controller = new MoneyAccountUpgradeController({
    messenger: controllerMessenger,
  });

  const bootstrap = async () => {
    const serviceDetails = await controllerMessenger.call(
      'ChompApiService:getServiceDetails',
      [DEFAULT_CHAIN_ID],
    );

    if (!serviceDetails) {
      // TODO: throw an error here
      return;
    }

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
    Logger.log(LOG_PREFIX, 'MoneyUpgradeController init successfully');
  };

  const runBootstrap = () => {
    bootstrap().catch((error) => {
      Logger.error(error as Error, 'MoneyAccountUpgradeController bootstrap');
    });
  };

  if (initMessenger.call('KeyringController:getState').isUnlocked) {
    runBootstrap();
  } else {
    const onUnlock = () => {
      initMessenger.unsubscribe('KeyringController:unlock', onUnlock);
      runBootstrap();
    };
    initMessenger.subscribe('KeyringController:unlock', onUnlock);
  }

  return { controller };
};
