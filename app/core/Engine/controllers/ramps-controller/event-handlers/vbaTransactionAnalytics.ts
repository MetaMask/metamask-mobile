import type { AutorampTransactionSummary } from '@metamask/ramps-controller';
import { MetaMetricsEvents } from '../../../../Analytics';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../../util/analytics/analytics';
import type { JsonMap } from '../../../../../util/analytics/analytics.types';
import {
  ANALYTICS_REGION_UNKNOWN,
  toAnalyticsRegion,
} from '../../../../../util/analytics/analyticsRegion';
import Logger from '../../../../../util/Logger';
import ReduxService from '../../../../redux';

/**
 * Payload of `trackAutorampTransactionStatusChanged`. Declared here until
 * `@metamask/ramps-controller` exports `AutorampTransactionStatusChangedPayload`.
 */
export interface AutorampTransactionStatusChangedPayload {
  autorampId: string;
  transaction: AutorampTransactionSummary;
  previousStatus?: string;
}

const PENDING_TRANSACTION_STATUSES = new Set([
  'FundsReviewInProgress',
  'ConversionInProgress',
  'PayoutInProgress',
]);

/**
 * Terminal vendor statuses that mean the transaction failed. The raw value is
 * `transaction_status`. `failure_reason` is the onboarding failure enum and is
 * not sent on this event.
 */
const FAILED_TRANSACTION_STATUSES = new Set([
  'Failed',
  'RejectedAml',
  'RejectedFraud',
  'RejectedMinAmount',
]);
const TRANSACTION_STATUSES = new Set([
  ...PENDING_TRANSACTION_STATUSES,
  'Completed',
  ...FAILED_TRANSACTION_STATUSES,
]);

/** Entry point of the VBA funnel (`metamask-money-vba-base`). */
const VBA_ENTRY_POINT = 'add_funds_bank_account';
/** Vendor allowed by the schema; the KYC controller itself reports `iron`. */
const VBA_ANALYTICS_VENDOR = 'moonpay';
/**
 * A transaction only exists for an approved autoramp, so the autoramp is
 * `ready` whenever this event fires.
 */
const VBA_AUTORAMP_STATUS = 'ready';
/** Every VBA autoramp delivers mUSD on Monad (CAIP-2 `eip155:143`). */
const VBA_DESTINATION = {
  currency_destination_symbol: 'mUSD',
  token_chain_id: 'eip155:143',
} as const;

type AnalyticsStatus = 'pending' | 'completed' | 'failed';

interface KycSessionShape {
  finalStatus?: string;
}

interface BackgroundControllers {
  RampsController?: {
    autoramps?: {
      id?: string;
      depositRailsSummary?: { currency?: string };
    }[];
  };
  KycController?: {
    vendor?: string | null;
    providerFlowStatus?: string;
    sessionStatus?: KycSessionShape | null;
  };
  GeolocationController?: {
    location?: string;
  };
}

export interface MoneyVbaTransactionUpdatedProperties extends JsonMap {
  status: AnalyticsStatus;
  transaction_status: string;
  previous_status?: string;
  transaction_id: string;
  autoramp_id: string;
  source_amount?: number;
  destination_amount?: number;
  seconds_since_created?: number;
  entry_point: string;
  kyc_status: string;
  autoramp_status: string;
  provider_flow_status: string;
  vendor: string;
  region: string;
  currency_source?: string;
  currency_destination_symbol: string;
  token_chain_id: string;
}

const mapAnalyticsStatus = (rawStatus: string): AnalyticsStatus | undefined => {
  if (PENDING_TRANSACTION_STATUSES.has(rawStatus)) {
    return 'pending';
  }
  if (rawStatus === 'Completed') {
    return 'completed';
  }
  if (FAILED_TRANSACTION_STATUSES.has(rawStatus)) {
    return 'failed';
  }
  return undefined;
};

/**
 * Parses a vendor amount string. Returns undefined for a missing or
 * non-numeric amount so the property is omitted instead of sent as NaN.
 *
 * @param amount - Amount string from the transaction summary.
 * @returns The amount as a number, or undefined.
 */
const parseAmount = (amount: string | undefined): number | undefined => {
  if (amount === undefined || amount.trim() === '') {
    return undefined;
  }
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const secondsSinceCreated = (
  createdAt: string | undefined,
  now: number,
): number | undefined => {
  if (!createdAt) {
    return undefined;
  }
  const created = Date.parse(createdAt);
  if (Number.isNaN(created)) {
    return undefined;
  }
  return Math.max(0, Math.round((now - created) / 1000));
};

const KYC_STATUSES = new Set([
  'new',
  'pending',
  'approved',
  'rejected',
  'retry',
]);

/**
 * KYC status for analytics: the session's `finalStatus`, or `none` when there
 * is no session or the value is unknown. Mirrors `getKycAnalyticsStatus` from
 * `@metamask/kyc-controller`; use that once the package is installed.
 */
const resolveKycStatus = (
  session: KycSessionShape | null | undefined,
): string =>
  session?.finalStatus && KYC_STATUSES.has(session.finalStatus)
    ? session.finalStatus
    : 'none';

const readBackgroundControllers = (): BackgroundControllers | undefined => {
  try {
    const state = ReduxService.store.getState() as {
      engine?: { backgroundState?: BackgroundControllers };
    };
    return state.engine?.backgroundState;
  } catch {
    return undefined;
  }
};

/**
 * VBA properties read from state when the transaction event is emitted.
 * Screen name is omitted: this fires from the controller fetch, not from a
 * screen. Constant properties (entry point, vendor, autoramp status and the
 * mUSD destination) are added by {@link buildMoneyVbaTransactionUpdatedProperties}.
 *
 * @param autorampId - Autoramp whose transaction changed.
 * @param backgroundState - Engine background state, when the store is up.
 * @returns Properties to spread onto the analytics event.
 */
export function readVbaTransactionBaseProperties(
  autorampId: string,
  backgroundState: BackgroundControllers | undefined,
): Partial<
  Pick<
    MoneyVbaTransactionUpdatedProperties,
    'kyc_status' | 'provider_flow_status' | 'region' | 'currency_source'
  >
> {
  if (!backgroundState) {
    return {};
  }

  const autoramp = backgroundState.RampsController?.autoramps?.find(
    (candidate) => candidate.id === autorampId,
  );
  const fiatCode = autoramp?.depositRailsSummary?.currency;
  const kyc = backgroundState.KycController;
  const region = toAnalyticsRegion(
    backgroundState.GeolocationController?.location,
  );

  return {
    ...(kyc
      ? {
          kyc_status: resolveKycStatus(kyc.sessionStatus),
          ...(kyc.providerFlowStatus
            ? { provider_flow_status: kyc.providerFlowStatus }
            : {}),
        }
      : {}),
    region,
    ...(fiatCode ? { currency_source: fiatCode } : {}),
  };
}

/**
 * Maps one autoramp transaction change onto Money VBA Transaction Updated.
 *
 * @param payload - Controller event payload.
 * @param base - VBA properties already known at emission time.
 * @param now - Epoch ms used for `seconds_since_created`.
 * @returns Event properties, or null when the vendor status is outside the
 * schema. `previous_status` is absent for a new transaction and for a previous
 * status outside the schema.
 */
export function buildMoneyVbaTransactionUpdatedProperties(
  payload: AutorampTransactionStatusChangedPayload,
  base: ReturnType<typeof readVbaTransactionBaseProperties>,
  now: number,
): MoneyVbaTransactionUpdatedProperties | null {
  const { transaction, previousStatus, autorampId } = payload;
  const status = mapAnalyticsStatus(transaction.status);
  if (!status) {
    return null;
  }
  const seconds = secondsSinceCreated(transaction.createdAt, now);
  const sourceAmount = parseAmount(transaction.sourceAmount);
  const destinationAmount = parseAmount(transaction.destinationAmount);

  return {
    entry_point: VBA_ENTRY_POINT,
    vendor: VBA_ANALYTICS_VENDOR,
    autoramp_status: VBA_AUTORAMP_STATUS,
    kyc_status: base.kyc_status ?? 'none',
    provider_flow_status: base.provider_flow_status ?? 'not_started',
    ...VBA_DESTINATION,
    region: base.region ?? ANALYTICS_REGION_UNKNOWN,
    ...(base.currency_source ? { currency_source: base.currency_source } : {}),
    status,
    transaction_status: transaction.status,
    ...(previousStatus !== undefined && TRANSACTION_STATUSES.has(previousStatus)
      ? { previous_status: previousStatus }
      : {}),
    transaction_id: transaction.id,
    autoramp_id: autorampId,
    ...(sourceAmount === undefined ? {} : { source_amount: sourceAmount }),
    ...(destinationAmount === undefined
      ? {}
      : { destination_amount: destinationAmount }),
    ...(seconds === undefined ? {} : { seconds_since_created: seconds }),
  };
}

/**
 * Tracks Money VBA Transaction Updated for one controller status change.
 *
 * @param payload - Autoramp transaction change from the controller.
 */
export function handleAutorampTransactionStatusChangedForMetrics(
  payload: AutorampTransactionStatusChangedPayload,
): void {
  try {
    const properties = buildMoneyVbaTransactionUpdatedProperties(
      payload,
      readVbaTransactionBaseProperties(
        payload.autorampId,
        readBackgroundControllers(),
      ),
      Date.now(),
    );
    if (!properties) {
      return;
    }
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.MONEY_VBA_TRANSACTION_UPDATED,
      )
        .addProperties(properties)
        .build(),
    );
  } catch (error) {
    Logger.error(error as Error, {
      message: 'RampsController: Failed to track Money VBA Transaction Updated',
    });
  }
}
