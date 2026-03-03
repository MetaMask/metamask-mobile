import { HandlerType } from '@metamask/snaps-utils';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { SnapId } from '@metamask/snaps-sdk';
import Engine from '../../../../core/Engine';
import { handleSnapRequest } from '../../../../core/Snaps/utils';
import type {
  TronStakeValidateParams,
  TronStakeConfirmParams,
  TronStakeResult,
  TronUnstakeValidateParams,
  TronUnstakeConfirmParams,
  TronUnstakeResult,
  TronClaimUnstakedTrxParams,
  TronClaimResult,
  TronClaimStakingRewardsParams,
  TronClaimStakingRewardsResult,
  ComputeFeeParams,
  ComputeFeeResult,
  ComputeStakeFeeParams,
  ComputeStakeFeeResult,
} from '../types/tron-staking.types';

// Exporting here just for convenience
export * from '../types/tron-staking.types';

const controllerMessenger = Engine.controllerMessenger;

export async function validateTronStakeAmount(
  fromAccount: InternalAccount,
  params: TronStakeValidateParams,
): Promise<TronStakeResult> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'onStakeAmountInput',
      params,
    },
  })) as TronStakeResult;
}

export async function confirmTronStake(
  fromAccount: InternalAccount,
  params: TronStakeConfirmParams,
): Promise<TronStakeResult> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'confirmStake',
      params,
    },
  })) as TronStakeResult;
}

export async function computeTronFee(
  fromAccount: InternalAccount,
  params: ComputeFeeParams,
): Promise<ComputeFeeResult> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'computeFee',
      params,
    },
  })) as ComputeFeeResult;
}

export async function computeStakeFee(
  fromAccount: InternalAccount,
  params: ComputeStakeFeeParams,
): Promise<ComputeStakeFeeResult> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'computeStakeFee',
      params,
    },
  })) as ComputeStakeFeeResult;
}

export async function validateTronUnstakeAmount(
  fromAccount: InternalAccount,
  params: TronUnstakeValidateParams,
): Promise<TronUnstakeResult> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'onUnstakeAmountInput',
      params,
    },
  })) as TronUnstakeResult;
}

export async function confirmTronUnstake(
  fromAccount: InternalAccount,
  params: TronUnstakeConfirmParams,
): Promise<TronUnstakeResult> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'confirmUnstake',
      params,
    },
  })) as TronUnstakeResult;
}

export async function claimUnstakedTrx(
  fromAccount: InternalAccount,
  params: TronClaimUnstakedTrxParams,
): Promise<TronClaimResult> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'claimUnstakedTrx',
      params,
    },
  })) as TronClaimResult;
}

export async function claimTrxStakingRewards(
  fromAccount: InternalAccount,
  params: TronClaimStakingRewardsParams,
): Promise<TronClaimStakingRewardsResult> {
  return (await handleSnapRequest(controllerMessenger, {
    snapId: fromAccount.metadata?.snap?.id as SnapId,
    origin: 'metamask',
    handler: HandlerType.OnClientRequest,
    request: {
      method: 'claimTrxStakingRewards',
      params,
    },
  })) as TronClaimStakingRewardsResult;
}
