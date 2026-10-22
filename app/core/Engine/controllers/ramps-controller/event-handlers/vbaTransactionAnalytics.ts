import type { AutorampTransactionSummary } from '@metamask/ramps-controller';
import { MetaMetricsEvents } from '../../../../Analytics';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';
import { analytics } from '../../../../../util/analytics/analytics';
import Logger from '../../../../../util/Logger';
import ReduxService from '../../../../redux';

/**
 * Payload of `RampsController:autorampTransactionStatusChanged`.
 * Declared here until `@metamask/ramps-controller` exports
 * `RampsControllerAutorampTransactionStatusChangedEvent`.
 */
export interface AutorampTransactionStatusChangedPayload {
  autorampId: string;
  transaction: AutorampTransactionSummary;
  previousStatus?: string;
}

export interface RampsControllerAutorampTransactionStatusChangedEvent {
  type: 'RampsController:autorampTransactionStatusChanged';
  payload: [AutorampTransactionStatusChangedPayload];
}

const PENDING_TRANSACTION_STATUSES = new Set([
  'FundsReviewInProgress',
  'ConversionInProgress',
  'PayoutInProgress',
]);

const FAILURE_REASONS: { [status: string]: string } = {
  Failed: 'failed',
  RejectedAml: 'rejected_aml',
  RejectedFraud: 'rejected_fraud',
  RejectedMinAmount: 'rejected_min_amount',
};

type AnalyticsStatus = 'pending' | 'completed' | 'failed';

interface KycSessionShape {
  finalStatus?: string;
  kycStatus?: string;
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

export interface MoneyVbaTransactionUpdatedProperties {
  status?: AnalyticsStatus;
  transaction_status: string;
  previous_status?: string;
  transaction_id: string;
  autoramp_id: string;
  source_amount?: string;
  destination_amount?: string;
  seconds_since_created?: number;
  failure_reason?: string;
  screen_name?: string;
  entry_point?: string;
  kyc_status?: string;
  autoramp_status?: string;
  provider_flow_status?: string;
  vendor?: string;
  region?: string;
  fiat_code?: string;
  currency_destination_symbol?: string;
  token_chain_id?: string;
}

const mapAnalyticsStatus = (rawStatus: string): AnalyticsStatus | undefined => {
  if (PENDING_TRANSACTION_STATUSES.has(rawStatus)) {
    return 'pending';
  }
  if (rawStatus === 'Completed') {
    return 'completed';
  }
  if (Object.hasOwn(FAILURE_REASONS, rawStatus)) {
    return 'failed';
  }
  return undefined;
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

const resolveKycStatus = (
  session: KycSessionShape | null | undefined,
  providerFlowStatus: string | undefined,
): string => {
  if (!session) {
    return 'none';
  }
  if (session.finalStatus === 'approved' || session.kycStatus === 'approved') {
    return 'approved';
  }
  if (session.finalStatus === 'rejected' || session.finalStatus === 'retry') {
    return session.finalStatus;
  }
  if (
    session.finalStatus === 'pending' ||
    session.kycStatus === 'pending' ||
    providerFlowStatus === 'submitted'
  ) {
    return 'pending';
  }
  if (session.finalStatus === 'new') {
    return 'new';
  }
  return 'none';
};

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
 * VBA properties already known when the transaction event is emitted.
 * Screen and entry point are omitted: this fires from the controller fetch,
 * not from a screen. Destination symbol and chain id are omitted unless a
 * future autoramp record carries them; today's cursor does not.
 *
 * @param autorampId - Autoramp whose transaction changed.
 * @param backgroundState - Engine background state, when the store is up.
 * @returns Properties to spread onto the analytics event.
 */
export function readVbaTransactionBaseProperties(
  autorampId: string,
  backgroundState: BackgroundControllers | undefined,
): Pick<
  MoneyVbaTransactionUpdatedProperties,
  | 'kyc_status'
  | 'provider_flow_status'
  | 'vendor'
  | 'region'
  | 'fiat_code'
  | 'currency_destination_symbol'
  | 'token_chain_id'
> {
  if (!backgroundState) {
    return {};
  }

  const autoramp = backgroundState.RampsController?.autoramps?.find(
    (candidate) => candidate.id === autorampId,
  );
  const fiatCode = autoramp?.depositRailsSummary?.currency;
  const kyc = backgroundState.KycController;
  const location = backgroundState.GeolocationController?.location;
  const region =
    typeof location === 'string' &&
    location.length > 0 &&
    location.toUpperCase() !== 'UNKNOWN'
      ? location
      : undefined;

  return {
    ...(kyc
      ? {
          kyc_status: resolveKycStatus(
            kyc.sessionStatus,
            kyc.providerFlowStatus,
          ),
          ...(kyc.providerFlowStatus
            ? { provider_flow_status: kyc.providerFlowStatus }
            : {}),
          ...(typeof kyc.vendor === 'string' && kyc.vendor.length > 0
            ? { vendor: kyc.vendor }
            : {}),
        }
      : {}),
    ...(region ? { region } : {}),
    ...(fiatCode ? { fiat_code: fiatCode } : {}),
  };
}

/**
 * Maps one autoramp transaction change onto Money VBA Transaction Updated.
 *
 * @param payload - Controller event payload.
 * @param base - VBA properties already known at emission time.
 * @param now - Epoch ms used for `seconds_since_created`.
 * @returns Event properties. `previous_status` is absent for a new transaction.
 */
export function buildMoneyVbaTransactionUpdatedProperties(
  payload: AutorampTransactionStatusChangedPayload,
  base: ReturnType<typeof readVbaTransactionBaseProperties>,
  now: number,
): MoneyVbaTransactionUpdatedProperties {
  const { transaction, previousStatus, autorampId } = payload;
  const status = mapAnalyticsStatus(transaction.status);
  const seconds = secondsSinceCreated(transaction.createdAt, now);

  return {
    ...base,
    ...(status ? { status } : {}),
    transaction_status: transaction.status,
    ...(previousStatus === undefined
      ? {}
      : { previous_status: previousStatus }),
    transaction_id: transaction.id,
    autoramp_id: autorampId,
    ...(transaction.sourceAmount === undefined
      ? {}
      : { source_amount: transaction.sourceAmount }),
    ...(transaction.destinationAmount === undefined
      ? {}
      : { destination_amount: transaction.destinationAmount }),
    ...(seconds === undefined ? {} : { seconds_since_created: seconds }),
    ...(status === 'failed'
      ? { failure_reason: FAILURE_REASONS[transaction.status] }
      : {}),
  };
}

/**
 * Tracks Money VBA Transaction Updated for one controller status change.
 *
 * @param payload - Published autoramp transaction change.
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
    analytics.trackEvent(
      AnalyticsEventBuilder.createEventBuilder(
        MetaMetricsEvents.MONEY_VBA_TRANSACTION_UPDATED,
      )
        .addProperties(properties)
        .build(),
    );
  } catch (error) {
    Logger.error(error as Error, {
      message:
        'RampsController: Failed to track Money VBA Transaction Updated',
    });
  }
}
