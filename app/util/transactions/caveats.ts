import { toHex } from '@metamask/controller-utils';
import { Messenger } from '@metamask/messenger';
import { RemoteFeatureFlagControllerGetStateAction } from '@metamask/remote-feature-flag-controller';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import {
  Caveat,
  DeleGatorEnvironment,
  ExecutionStruct,
  createCaveatBuilder,
} from '../../core/Delegation';
import { exactExecutionBatch } from '../../core/Delegation/caveatBuilder/exactExecutionBatchBuilder';
import { exactExecution } from '../../core/Delegation/caveatBuilder/exactExecutionBuilder';
import { limitedCalls } from '../../core/Delegation/caveatBuilder/limitedCallsBuilder';
import { redeemer } from '../../core/Delegation/caveatBuilder/redeemerBuilder';
import { timestamp } from '../../core/Delegation/caveatBuilder/timestampBuilder';
import { getSubsidizedCaveats } from './subsidized-caveats';

export const CONFIRMATIONS_DELEGATIONS_FEATURE_FLAG_NAME =
  'confirmations_delegations' as const;

const DEFAULT_DEADLINE_SECONDS = 30 * 60;

type DelegationCaveatsMessenger = Messenger<
  string,
  RemoteFeatureFlagControllerGetStateAction,
  never
>;

interface ConfirmationsDelegationsFeatureFlag {
  deadlineSeconds?: number;
}

export interface GetDelegationCaveatsRequest {
  /** Caveats to use as is, skipping all generated caveats. */
  caveats?: Caveat[];

  /** Delegation environment with caveat enforcer addresses. */
  environment: DeleGatorEnvironment;

  /** Executions the delegation will be redeemed with. */
  executions: ExecutionStruct[];

  /** Whether to build subsidized caveats instead of exact execution caveats. */
  isSubsidized?: boolean;

  /** Messenger used to read remote feature flags. */
  messenger: DelegationCaveatsMessenger;

  /** Addresses allowed to redeem the delegation. */
  redeemers?: Hex[];

  /** Transaction being delegated. */
  transactionMeta: TransactionMeta;
}

/**
 * Builds the caveats for an EIP-7702 delegation.
 *
 * Provided caveats are returned unchanged. Otherwise the base caveats
 * (single call, deadline and optional redeemers) are combined with either the
 * subsidized caveats or an exact execution caveat.
 *
 * @param request - Request options.
 * @returns The delegation caveats.
 */
export function getDelegationCaveats(
  request: GetDelegationCaveatsRequest,
): Caveat[] {
  const { caveats, environment, executions, isSubsidized, transactionMeta } =
    request;

  if (caveats) {
    return caveats;
  }

  const baseCaveats = getBaseCaveats(request);

  if (isSubsidized) {
    return [
      ...baseCaveats,
      ...getSubsidizedCaveats(
        environment,
        executions[0],
        transactionMeta.nestedTransactions,
      ),
    ];
  }

  return [...baseCaveats, getExactExecutionCaveat(environment, executions)];
}

function getBaseCaveats({
  environment,
  messenger,
  redeemers,
}: GetDelegationCaveatsRequest): Caveat[] {
  const caveatBuilder = createCaveatBuilder(environment)
    .addCaveat(limitedCalls, 1)
    .addCaveat(timestamp, 0, getDeadline(messenger));

  if (!redeemers?.length) {
    return caveatBuilder.build();
  }

  return caveatBuilder.addCaveat(redeemer, redeemers).build();
}

function getExactExecutionCaveat(
  environment: DeleGatorEnvironment,
  executions: ExecutionStruct[],
): Caveat {
  const caveatExecutions = executions.map(({ callData, target, value }) => ({
    data: callData,
    to: target,
    value: toHex(value),
  }));

  const caveatBuilder = createCaveatBuilder(environment);

  if (caveatExecutions.length > 1) {
    return caveatBuilder
      .addCaveat(exactExecutionBatch, caveatExecutions)
      .build()[0];
  }

  const [{ data, to, value }] = caveatExecutions;

  return caveatBuilder.addCaveat(exactExecution, to, value, data).build()[0];
}

function getDeadline(messenger: DelegationCaveatsMessenger): number {
  const nowSeconds = Math.floor(Date.now() / 1000);

  return nowSeconds + getDeadlineSeconds(messenger);
}

function getDeadlineSeconds(messenger: DelegationCaveatsMessenger): number {
  const { remoteFeatureFlags } = messenger.call(
    'RemoteFeatureFlagController:getState',
  );

  const { deadlineSeconds } =
    (remoteFeatureFlags?.[CONFIRMATIONS_DELEGATIONS_FEATURE_FLAG_NAME] as
      | ConfirmationsDelegationsFeatureFlag
      | undefined) ?? {};

  if (
    typeof deadlineSeconds !== 'number' ||
    !Number.isFinite(deadlineSeconds) ||
    deadlineSeconds <= 0
  ) {
    return DEFAULT_DEADLINE_SECONDS;
  }

  return Math.floor(deadlineSeconds);
}
