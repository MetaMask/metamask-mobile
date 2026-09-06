import {
  Messenger,
  type ActionConstraint,
  type EventConstraint,
  type MessengerActions,
  type MessengerEvents,
} from '@metamask/messenger';
import type {
  RewardsMoneyControllerActions,
  RewardsMoneyControllerEvents,
} from '../../controllers/rewards-money-controller/types';
import type {
  RewardsMoneyDataServiceGetEarningsLedgerAction,
  RewardsMoneyDataServiceGetEarningsSummaryAction,
  RewardsMoneyDataServiceGetReferralMeAction,
  RewardsMoneyDataServiceInitiateClaimAction,
} from '../../controllers/rewards-money-controller/services';
import type { RootMessenger } from '../../types';

const name = 'RewardsMoneyController' as const;

// Don't reexport as per guidelines
type AllowedActions =
  | RewardsMoneyDataServiceGetReferralMeAction
  | RewardsMoneyDataServiceGetEarningsSummaryAction
  | RewardsMoneyDataServiceGetEarningsLedgerAction
  | RewardsMoneyDataServiceInitiateClaimAction;

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

  // Widen `messenger` to a generic `Messenger<...>` for the delegate call only.
  // `delegate`'s constraint intersects the delegatee's action union with the
  // root messenger's, which hits TypeScript's union-complexity ceiling
  // (TS2590) at the root messenger's size. Erasing the delegatee's specific
  // union to the open `ActionConstraint` short-circuits the intersection
  // without affecting runtime behavior — `delegate` only inspects the
  // action/event name strings.
  rootMessenger.delegate({
    messenger: messenger as Messenger<
      typeof name,
      ActionConstraint,
      EventConstraint,
      RootMessenger
    >,
    actions: [
      'RewardsMoneyDataService:getReferralMe',
      'RewardsMoneyDataService:getEarningsSummary',
      'RewardsMoneyDataService:getEarningsLedger',
      'RewardsMoneyDataService:initiateClaim',
    ],
    events: [],
  } as Parameters<RootMessenger['delegate']>[0]);

  return messenger;
}
