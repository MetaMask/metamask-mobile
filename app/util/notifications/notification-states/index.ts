import { NotificationServicesController } from '@metamask/notification-services-controller';

import ERC20SentReceivedState from './erc20-sent-received/erc20-sent-received';
import ERC721SentReceivedState from './erc721-sent-received/erc721-sent-received';
import ERC1155SentReceivedState from './erc1155-sent-received/erc1155-sent-received';
import EthSentReceivedState from './eth-sent-received/eth-sent-received';
import FeatureAnnouncementState from './feature-announcement/feature-announcement';
import StakeState from './stake/stake';
import SwapCompletedState from './swap-completed/swap-completed';
import LidoWithdrawalRequestedState from './lido-withdrawal-requested/lido-withdrawal-requested';
import LidoStakeReadyToBeWithdrawnState from './lido-stake-ready-to-be-withdrawn/lido-stake-ready-to-be-withdrawn';
import { NotificationState } from './types/NotificationState';

const { TRIGGER_TYPES } = NotificationServicesController.Constants;
type TRIGGER_TYPES = NotificationServicesController.Constants.TRIGGER_TYPES;

/**
 * Each notification component has a specific shape it follows.
 * however for interface consistency (and prevent intersections that cause `never` parameters), we are widening each notification component to a generic notification
 *
 * This does mean that you MUST check the guardFn before using a specific notification
 *
 * @param components - a specific set of notification components
 * @returns a generic set of notification component
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const expandComponentsType = <C extends NotificationState<any>>(
  components: C,
) => components as NotificationState;

export const NotificationComponentState = {
  [TRIGGER_TYPES.ERC20_SENT]: expandComponentsType(ERC20SentReceivedState),
  [TRIGGER_TYPES.ERC20_RECEIVED]: expandComponentsType(ERC20SentReceivedState),
  [TRIGGER_TYPES.ERC721_SENT]: expandComponentsType(ERC721SentReceivedState),
  [TRIGGER_TYPES.ERC721_RECEIVED]: expandComponentsType(
    ERC721SentReceivedState,
  ),
  [TRIGGER_TYPES.ERC1155_SENT]: expandComponentsType(ERC1155SentReceivedState),
  [TRIGGER_TYPES.ERC1155_RECEIVED]: expandComponentsType(
    ERC1155SentReceivedState,
  ),
  [TRIGGER_TYPES.ETH_SENT]: expandComponentsType(EthSentReceivedState),
  [TRIGGER_TYPES.ETH_RECEIVED]: expandComponentsType(EthSentReceivedState),
  [TRIGGER_TYPES.FEATURES_ANNOUNCEMENT]: expandComponentsType(
    FeatureAnnouncementState,
  ),
  [TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED]: expandComponentsType(StakeState),
  [TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED]:
    expandComponentsType(StakeState),
  [TRIGGER_TYPES.LIDO_STAKE_COMPLETED]: expandComponentsType(StakeState),
  [TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED]: expandComponentsType(StakeState),
  [TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED]: expandComponentsType(
    LidoWithdrawalRequestedState,
  ),
  [TRIGGER_TYPES.METAMASK_SWAP_COMPLETED]:
    expandComponentsType(SwapCompletedState),
  [TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN]: expandComponentsType(
    LidoStakeReadyToBeWithdrawnState,
  ),
};

export const hasNotificationComponents = (
  t: TRIGGER_TYPES,
): t is keyof typeof NotificationComponentState =>
  t in NotificationComponentState;

  export const hasNotificationModal = (t: TRIGGER_TYPES) => {
    if (!hasNotificationComponents(t)) {
      return false;
    }
    return !!NotificationComponentState[t]?.createModalDetails;
  };
