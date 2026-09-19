import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  type ActionConstraint,
  type EventConstraint,
} from '@metamask/messenger';
import type { AuthenticationController } from '@metamask/profile-sync-controller';

import {
  RewardsMoneyDataServiceGetReferralMeAction,
  RewardsMoneyDataServiceGetReferralFunnelAction,
  RewardsMoneyDataServiceGetReferralCodesAction,
  RewardsMoneyDataServiceValidateReferralCodeAction,
  RewardsMoneyDataServiceRegisterRefereeAction,
  RewardsMoneyDataServiceGetEarningsSummaryAction,
  RewardsMoneyDataServiceGetEarningsLedgerAction,
  RewardsMoneyDataServiceGetClaimHistoryAction,
  RewardsMoneyDataServiceGetCommissionsAction,
  RewardsMoneyDataServiceGetClaimByIdAction,
  RewardsMoneyDataServiceGetRewardsMoneyEnvUrlAction,
  RewardsMoneyDataServiceCanChangeRewardsMoneyEnvUrlAction,
  RewardsMoneyDataServiceSetRewardsMoneyEnvUrlAction,
  RewardsMoneyDataServiceGetDefaultRewardsMoneyEnvUrlAction,
} from '../../controllers/rewards-money-controller/services';
import {
  RewardsMoneyControllerActions,
  RewardsMoneyControllerEvents,
} from '../../controllers/rewards-money-controller/types';
import { RootMessenger } from '../../types';

const name = 'RewardsMoneyController' as const;

// Don't reexport as per guidelines
type AllowedActions =
  | RewardsMoneyDataServiceGetReferralMeAction
  | RewardsMoneyDataServiceGetReferralFunnelAction
  | RewardsMoneyDataServiceGetReferralCodesAction
  | RewardsMoneyDataServiceValidateReferralCodeAction
  | RewardsMoneyDataServiceRegisterRefereeAction
  | RewardsMoneyDataServiceGetEarningsSummaryAction
  | RewardsMoneyDataServiceGetEarningsLedgerAction
  | RewardsMoneyDataServiceGetClaimHistoryAction
  | RewardsMoneyDataServiceGetCommissionsAction
  | RewardsMoneyDataServiceGetClaimByIdAction
  | RewardsMoneyDataServiceGetRewardsMoneyEnvUrlAction
  | RewardsMoneyDataServiceCanChangeRewardsMoneyEnvUrlAction
  | RewardsMoneyDataServiceSetRewardsMoneyEnvUrlAction
  | RewardsMoneyDataServiceGetDefaultRewardsMoneyEnvUrlAction
  | AuthenticationController.AuthenticationControllerGetSessionProfileAction;

export type RewardsMoneyControllerMessenger = Messenger<
  typeof name,
  RewardsMoneyControllerActions | AllowedActions,
  RewardsMoneyControllerEvents
>;

export function getRewardsMoneyControllerMessenger(
  rootMessenger: RootMessenger,
): RewardsMoneyControllerMessenger {
  const messenger = new Messenger<
    typeof name,
    MessengerActions<RewardsMoneyControllerMessenger>,
    MessengerEvents<RewardsMoneyControllerMessenger>,
    RootMessenger
  >({
    namespace: name,
    parent: rootMessenger,
  });

  // Widen `messenger` for the delegate call only — same TS2590 workaround as
  // RewardsController. `delegate` only inspects action name strings at runtime.
  rootMessenger.delegate({
    messenger: messenger as Messenger<
      typeof name,
      ActionConstraint,
      EventConstraint,
      RootMessenger
    >,
    actions: [
      'RewardsMoneyDataService:getReferralMe',
      'RewardsMoneyDataService:getReferralFunnel',
      'RewardsMoneyDataService:getReferralCodes',
      'RewardsMoneyDataService:validateReferralCode',
      'RewardsMoneyDataService:registerReferee',
      'RewardsMoneyDataService:getEarningsSummary',
      'RewardsMoneyDataService:getEarningsLedger',
      'RewardsMoneyDataService:getClaimHistory',
      'RewardsMoneyDataService:getCommissions',
      'RewardsMoneyDataService:getClaimById',
      'RewardsMoneyDataService:getRewardsMoneyEnvUrl',
      'RewardsMoneyDataService:canChangeRewardsMoneyEnvUrl',
      'RewardsMoneyDataService:setRewardsMoneyEnvUrl',
      'RewardsMoneyDataService:getDefaultRewardsMoneyEnvUrl',
      'AuthenticationController:getSessionProfile',
    ],
    events: [],
  } as Parameters<RootMessenger['delegate']>[0]);

  return messenger;
}
