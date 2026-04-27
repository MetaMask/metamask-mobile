import {
  MoneyAccountUpgradeController,
  type MoneyAccountUpgradeControllerMessenger,
} from '@metamask/money-account-upgrade-controller';
import { type Hex, hexToNumber } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { MessengerClientInitFunction } from '../types';
import type { MoneyAccountUpgradeControllerInitMessenger } from '../messengers/money-account-upgrade-controller-messenger';
import { getDeleGatorEnvironment } from '../../Delegation/environment';
import Logger from '../../../util/Logger';

const LOG_PREFIX = '[MoneyAccountUpgradeControllerInit]';

// TODO: source this from a feature flag (parallel to ChompApiConfig.baseUrl)
// so we can add/swap MUSD chains without a code deploy.
const MUSD_CHAIN_ID: Hex = CHAIN_IDS.ARBITRUM;

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
      [MUSD_CHAIN_ID],
    );

    if (!serviceDetails) {
      throw new Error(
        `Missing CHOMP service details for chain ${MUSD_CHAIN_ID}`,
      );
    }

    const chain = serviceDetails.chains[MUSD_CHAIN_ID];
    const musdTokenAddress =
      chain?.protocol.vedaProtocol?.supportedTokens[0]?.tokenAddress;
    if (!musdTokenAddress) {
      throw new Error(
        `Missing MUSD token address for chain ${MUSD_CHAIN_ID} in CHOMP service details`,
      );
    }

    const environment = getDeleGatorEnvironment(hexToNumber(MUSD_CHAIN_ID));

    await controller.init(MUSD_CHAIN_ID, {
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
