import type {
  MfaRequirement,
  MoneyAccountSignatureRequest,
} from '@metamask/money-account-mfa-whitelist';
import { MetaMetricsEvents } from '../../core/Analytics/MetaMetrics.events';
import { analytics } from './analytics';
import { AnalyticsEventBuilder } from './AnalyticsEventBuilder';
import Logger from '../Logger';

export type MoneyMfaSetupTrigger = 'turn_on' | 'retry' | 'resume' | 'qa';

export type MoneyMfaSetupStatus = 'started' | 'completed' | 'failed';

export type MoneyMfaSetupFailedStep =
  | 'associate_address'
  | 'eip_7702_authorization'
  | 'build_delegation'
  | 'register_intents'
  | 'register_migration_intents'
  | 'start_migration'
  | 'funds_transfer_status'
  | 'funds_transfer_timeout';

export interface MoneyMfaSetupStatusProperties {
  status: MoneyMfaSetupStatus;
  trigger: MoneyMfaSetupTrigger;
  attempt: number;
  duration_ms?: number;
  failed_step?: MoneyMfaSetupFailedStep;
  error_name?: string;
  is_terminal?: boolean;
}

const UPGRADE_STEPS: Record<string, MoneyMfaSetupFailedStep> = {
  'associate-address': 'associate_address',
  'eip-7702-authorization': 'eip_7702_authorization',
  'build-delegation': 'build_delegation',
  'register-intents': 'register_intents',
  'register-migration-intents': 'register_migration_intents',
};

interface UpgradeStepErrorShape {
  step?: unknown;
  terminal?: unknown;
  cause?: unknown;
}

/**
 * Reads the failed Money Account upgrade step from a `MoneyAccountUpgradeStepError`,
 * checked structurally so a duplicated module realm still matches.
 *
 * @param error - The error the migration threw.
 * @returns The step, its terminal flag and the underlying error, when the error names a known step.
 */
export const getMoneyUpgradeStepFailure = (
  error: unknown,
):
  | { step: MoneyMfaSetupFailedStep; isTerminal: boolean; cause: unknown }
  | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const { step, terminal, cause } = error as UpgradeStepErrorShape;
  const mapped = typeof step === 'string' ? UPGRADE_STEPS[step] : undefined;
  if (!mapped) {
    return undefined;
  }
  return { step: mapped, isTerminal: terminal === true, cause };
};

export const getErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : typeof error;

export const trackMoneyMfaSetupStatus = (
  properties: MoneyMfaSetupStatusProperties,
): void => {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.MONEY_MFA_SETUP_STATUS_UPDATED,
      )
        .addProperties({ ...properties })
        .build(),
    );
  } catch (error) {
    Logger.error(error as Error, 'Money MFA setup status not tracked');
  }
};

export const trackMoneyMpcSigningRequested = (
  request: MoneyAccountSignatureRequest,
  requirement: MfaRequirement,
): void => {
  try {
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.MONEY_MPC_SIGNING_REQUESTED,
      )
        .addProperties({
          signing_method: request.method,
          mfa_required: requirement.mfaRequired,
          ...(requirement.mfaRequired
            ? {}
            : { whitelist_rule: requirement.rule }),
        })
        .build(),
    );
  } catch (error) {
    Logger.error(error as Error, 'Money MPC signing request not tracked');
  }
};
