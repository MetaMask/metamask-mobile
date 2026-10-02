import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';
import { v4 as uuidv4 } from 'uuid';
import type {
  OrderParams,
  OrderResult,
  PerpsActiveProviderMode,
  PerpsScalePriceLadder,
  ScaleOrderGroup,
} from '@metamask/perps-controller';
import { PERPS_UI_OBSERVATION_LIMIT } from '../constants/perpsConfig';

export interface PerpsUiScope {
  account: string | null;
  provider: PerpsActiveProviderMode | null;
  network: 'testnet' | 'mainnet' | null;
  market: string;
}
export type PerpsUiUnsignedOrder = Omit<OrderParams, 'trackingData'>;
export type PerpsUiOrderResult = OrderResult & Partial<ScaleOrderGroup>;
export interface PerpsUiSubmission {
  requestId: string;
  sequence: number;
  issuedAt: number;
  scope: PerpsUiScope;
  request: PerpsUiUnsignedOrder;
  requestDigest: string;
  state: 'pending' | 'settled' | 'unknown';
  settledAt?: number;
  result?: PerpsUiOrderResult;
}
export interface PerpsUiScaleForm {
  formId: string;
  mounted: boolean;
  scope: PerpsUiScope;
  input: {
    minPrice: string;
    maxPrice: string;
    count: string;
    skew: string;
    size?: string;
    usdAmount: string;
    isBuy: boolean;
    reduceOnly: boolean;
    leverage: number;
  };
  inputDigest: string;
  previewGeneration: string | null;
  previewSequence: number | null;
  loading: boolean;
  stale: boolean;
  source: 'venue' | 'estimate';
  displayedLeverage: number;
  preview: PerpsScalePriceLadder | null;
  ladder: { price: string; size: string }[] | null;
  expectedRequest?: PerpsUiUnsignedOrder | null;
  expectedRequestDigest?: string | null;
}
export interface PerpsUiObservationSnapshot {
  version: 1;
  enabled: boolean;
  sessionId: string;
  submissionSequence: number;
  evictedSubmissionThrough: number;
  droppedSettlements: number;
  captureFailures: number;
  submissions: PerpsUiSubmission[];
  scaleForms: PerpsUiScaleForm[];
}

const REQUEST_FIELDS = [
  'symbol',
  'isBuy',
  'size',
  'orderType',
  'price',
  'reduceOnly',
  'isFullClose',
  'timeInForce',
  'usdAmount',
  'priceAtCalculation',
  'maxSlippageBps',
  'slippage',
  'triggerPrice',
  'twapDuration',
  'twapRandomize',
  'scaleMinPrice',
  'scaleMaxPrice',
  'scaleNumOrders',
  'scaleSkew',
  'chaseIntervalMs',
  'chaseMaxDurationMs',
  'chaseMaxRepricings',
  'chaseMaxDistanceBps',
  'takeProfitPrice',
  'stopLossPrice',
  'takeProfitSize',
  'stopLossSize',
  'clientOrderId',
  'tpslLinkage',
  'grouping',
  'currentPrice',
  'leverage',
  'marginMode',
  'existingPositionLeverage',
  'providerId',
] as const satisfies readonly (keyof PerpsUiUnsignedOrder)[];
const RESULT_FIELDS = [
  'success',
  'orderId',
  'error',
  'filledSize',
  'submittedSize',
  'acceptedSize',
  'averagePrice',
  'weightedAverageLimitPrice',
  'providerId',
  'groupId',
  'symbol',
  'accountIndex',
  'apiKeyIndex',
  'state',
  'walletAddress',
  'network',
] as const satisfies readonly (keyof PerpsUiOrderResult)[];

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function primitives<T extends object>(value: T, keys: readonly (keyof T)[]) {
  const result: Partial<T> = {};
  for (const key of keys) {
    const field = value[key];
    if (field === undefined) continue;
    if (!['string', 'number', 'boolean'].includes(typeof field))
      throw new Error('Non-public observation field');
    result[key] = field;
  }
  return result;
}
function strings(value: readonly string[]): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
    throw new Error('Non-public observation array');
  return [...value];
}
function unsignedOrder(value: OrderParams): PerpsUiUnsignedOrder {
  const result = primitives(value, REQUEST_FIELDS) as PerpsUiUnsignedOrder;
  const ladder = value.expectedScaleLadder;
  if (ladder) {
    result.expectedScaleLadder = {
      ...primitives(ladder, [
        'totalSize',
        'totalNotional',
        'minimumBaseSize',
        'minimumQuoteAmount',
        'sizeDecimals',
      ]),
      prices: strings(ladder.prices),
      sizes: strings(ladder.sizes),
    } as NonNullable<OrderParams['expectedScaleLadder']>;
  }
  return result;
}
function publicResult(value: OrderResult): PerpsUiOrderResult {
  const result = primitives(value as PerpsUiOrderResult, RESULT_FIELDS);
  if (value.childOrderIds) result.childOrderIds = strings(value.childOrderIds);
  if (value.acceptedChildren)
    result.acceptedChildren = value.acceptedChildren.map(
      (child) => primitives(child, ['state', 'orderId']) as typeof child,
    );
  if (value.partialState)
    result.partialState = primitives(value.partialState, ['leverageUpdated']);
  return result;
}
function publicPreview(
  value: PerpsScalePriceLadder | null,
): PerpsScalePriceLadder | null {
  if (!value) return null;
  if (value.status === 'unavailable')
    return primitives(value, [
      'status',
      'providerId',
      'reason',
    ]) as PerpsScalePriceLadder;
  return {
    status: value.status,
    providerId: value.providerId,
    prices: strings(value.prices),
    ...(value.sizingPreview
      ? {
          sizingPreview: {
            ...primitives(value.sizingPreview, [
              'totalSize',
              'totalNotional',
              'minimumBaseSize',
              'minimumQuoteAmount',
              'sizeDecimals',
            ]),
            sizes: strings(value.sizingPreview.sizes),
          } as NonNullable<
            Extract<PerpsScalePriceLadder, { status: 'ready' }>['sizingPreview']
          >,
        }
      : {}),
  };
}
const publicScope = (value: PerpsUiScope): PerpsUiScope => ({
  account: value.account,
  provider: value.provider,
  network: value.network,
  market: value.market,
});
function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return (
      '{' +
      Object.keys(object)
        .filter((key) => object[key] !== undefined)
        .sort()
        .map((key) => JSON.stringify(key) + ':' + canonical(object[key]))
        .join(',') +
      '}'
    );
  }
  return JSON.stringify(value);
}

/** SHA256 of recursively key-sorted JSON of public unsigned inputs. */
export const perpsUiInputDigest = (value: unknown) =>
  bytesToHex(sha256(canonical(value)));

/** Bounded diagnostic state. It neither calls controllers nor owns trading authority. */
export class PerpsUiObservationStore {
  private submissionSequence = 0;
  private evictedSubmissionThrough = 0;
  private droppedSettlements = 0;
  private captureFailures = 0;
  private submissions: PerpsUiSubmission[] = [];
  private scaleForms: PerpsUiScaleForm[] = [];

  private readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  begin(
    scope: PerpsUiScope | (() => PerpsUiScope),
    params: OrderParams,
  ): string | undefined {
    const sequence = ++this.submissionSequence;
    try {
      const request = unsignedOrder(params);
      const requestId = this.sessionId + ':' + sequence;
      this.submissions.push({
        requestId,
        sequence,
        issuedAt: Date.now(),
        scope: copy(publicScope(typeof scope === 'function' ? scope() : scope)),
        request,
        requestDigest: perpsUiInputDigest(request),
        state: 'pending',
      });
      if (this.submissions.length > PERPS_UI_OBSERVATION_LIMIT)
        this.evictedSubmissionThrough =
          this.submissions.shift()?.sequence ?? this.evictedSubmissionThrough;
      return requestId;
    } catch {
      // Diagnostics cannot block a real dispatch. The gap is visible to readers.
      this.captureFailures++;
      return undefined;
    }
  }

  settle(requestId: string | undefined, value?: OrderResult): void {
    if (!requestId) return;
    const record = this.submissions.find(
      (item) => item.requestId === requestId,
    );
    if (!record) {
      this.droppedSettlements++;
      return;
    }
    try {
      record.result = value ? publicResult(value) : undefined;
      record.state = value ? 'settled' : 'unknown';
      record.settledAt = Date.now();
    } catch {
      record.state = 'unknown';
      this.captureFailures++;
    }
  }

  form(
    value: Omit<PerpsUiScaleForm, 'inputDigest' | 'expectedRequestDigest'>,
  ): void {
    try {
      const scope = publicScope(value.scope);
      const input = primitives(value.input, [
        'minPrice',
        'maxPrice',
        'count',
        'skew',
        'size',
        'usdAmount',
        'isBuy',
        'reduceOnly',
        'leverage',
      ]) as PerpsUiScaleForm['input'];
      const expectedRequest =
        value.mounted && !value.loading && !value.stale && value.expectedRequest
          ? unsignedOrder(value.expectedRequest)
          : null;
      const record: PerpsUiScaleForm = copy({
        formId: value.formId,
        mounted: value.mounted,
        scope,
        input,
        inputDigest: perpsUiInputDigest({ scope, input }),
        previewGeneration: value.previewGeneration,
        previewSequence: value.previewSequence,
        loading: value.loading,
        stale: value.stale,
        source: value.source,
        displayedLeverage: value.displayedLeverage,
        expectedRequest,
        expectedRequestDigest: expectedRequest
          ? perpsUiInputDigest(expectedRequest)
          : null,
        preview: publicPreview(value.preview),
        ladder:
          value.ladder?.map(
            (rung) => primitives(rung, ['price', 'size']) as typeof rung,
          ) ?? null,
      });
      this.scaleForms = this.scaleForms.filter(
        (item) => item.formId !== value.formId,
      );
      this.scaleForms.push(record);
      if (this.scaleForms.length > PERPS_UI_OBSERVATION_LIMIT)
        this.scaleForms.shift();
    } catch {
      this.captureFailures++;
    }
  }

  unmount(formId: string): void {
    const record = this.scaleForms.find((item) => item.formId === formId);
    if (record) {
      record.mounted = false;
      record.stale = true;
      record.expectedRequest = null;
      record.expectedRequestDigest = null;
    }
  }

  /** Return detached copies only; reads have no side effects. */
  read(): PerpsUiObservationSnapshot {
    return copy({
      version: 1,
      enabled: true,
      sessionId: this.sessionId,
      submissionSequence: this.submissionSequence,
      evictedSubmissionThrough: this.evictedSubmissionThrough,
      droppedSettlements: this.droppedSettlements,
      captureFailures: this.captureFailures,
      submissions: this.submissions,
      scaleForms: this.scaleForms,
    });
  }
}

const observations = new PerpsUiObservationStore(__DEV__ ? uuidv4() : '');
/** Allocate an opaque preview/form lifetime identity, separate from dispatch cursors. */
export const newPerpsUiObservationId = () => (__DEV__ ? uuidv4() : '');
export const beginPerpsUiSubmission = (
  scope: PerpsUiScope | (() => PerpsUiScope),
  params: OrderParams,
) =>
  __DEV__ && ['scale', 'chase', 'twap'].includes(params.orderType)
    ? observations.begin(scope, params)
    : undefined;
export const settlePerpsUiSubmission = (
  requestId: string | undefined,
  result?: OrderResult,
) => {
  if (__DEV__) observations.settle(requestId, result);
};
export const recordPerpsUiScaleForm = (
  form: Omit<PerpsUiScaleForm, 'inputDigest' | 'expectedRequestDigest'>,
) => {
  if (__DEV__) observations.form(form);
};
export const unmountPerpsUiScaleForm = (formId: string) => {
  if (__DEV__) observations.unmount(formId);
};
/** Supported only through the development bridge; never exposes a write method. */
export const readPerpsUiObservations = (): PerpsUiObservationSnapshot =>
  __DEV__
    ? observations.read()
    : {
        version: 1,
        enabled: false,
        sessionId: '',
        submissionSequence: 0,
        evictedSubmissionThrough: 0,
        droppedSettlements: 0,
        captureFailures: 0,
        submissions: [],
        scaleForms: [],
      };
