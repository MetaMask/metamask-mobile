/**
 * Declarative venue request templates and their renderer (ADR-0004).
 *
 * This file is self-contained and has an identical twin in predict-api
 * (`apps/api/src/venue-signing/venue-templates.ts`). Both render from the same
 * profile document, and the shared fixture `venue-signing-v2.json` pins the
 * rendered bytes, so the two copies cannot drift apart unnoticed.
 */

export type Scalar = string | number | boolean;

/** What the user typed or confirmed, or what the phone itself generated. */
export type TemplateInputs = Readonly<
  Record<string, Scalar | readonly string[]>
>;

/** Named values only the server knows. Every one is shape-checked. */
export type TemplateValues = Readonly<
  Record<string, Scalar | readonly Scalar[]>
>;

export type Shape =
  | { readonly kind: 'uuid-v4' }
  | { readonly kind: 'int'; readonly min?: number; readonly max?: number }
  /** A decimal string with at most `scale` fractional digits. */
  | {
      readonly kind: 'decimal';
      readonly scale: number;
      readonly min?: string;
      readonly max?: string;
    }
  | { readonly kind: 'opaque'; readonly maxLength: number }
  | { readonly kind: 'oneOf'; readonly values: readonly (string | number)[] }
  | { readonly kind: 'array'; readonly of: Shape; readonly maxItems: number }
  /** An integer Unix time, bounded around the phone clock. */
  | {
      readonly kind: 'time';
      readonly unit: 's' | 'ms';
      readonly maxAgeSec?: number;
      readonly maxAheadSec?: number;
    };

export type Transform = 'trim' | 'decimal-fixed-2' | 'decimal-fixed-4';

export type Source =
  | { readonly const: Scalar }
  | {
      readonly input: string;
      readonly shape?: Shape;
      readonly transform?: Transform;
    }
  | {
      readonly map: {
        readonly inputs: readonly string[];
        readonly table: Readonly<Record<string, Scalar>>;
      };
    }
  | { readonly value: string; readonly shape: Shape };

export interface Condition {
  readonly input: string;
  readonly equals: string;
}

export interface StepRequest {
  /** A key of the profile's `requests`. */
  readonly request: string;
  readonly when?: Condition;
  /**
   * Render this request once per element of an array server value. The
   * element is bound as the value named by `as` for that one render. An
   * empty array renders no copy of the request.
   */
  readonly each?: {
    readonly value: string;
    readonly as: string;
    readonly shape: Extract<Shape, { kind: 'array' }>;
  };
}

export interface RequestTemplate {
  readonly class: 'read' | 'mutation';
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** May hold `{name}` placeholders, each filled by `pathParams`. */
  readonly path: string;
  readonly pathParams?: Readonly<Record<string, Source>>;
  /** Rendered in this order. An optional key with no value is left out. */
  readonly query?: readonly {
    readonly key: string;
    readonly value: Source;
    readonly optional?: true;
  }[];
  readonly body?:
    | 'empty'
    | {
        readonly json: readonly {
          readonly key: string;
          readonly value: Source;
        }[];
        readonly maxBytes: number;
      };
  /** Required for every mutation. */
  readonly idempotencyKey?: Source;
  /** Allowlisted cross-field checks. Each names a bundled implementation. */
  readonly invariants?: readonly {
    readonly implementation: string;
    readonly params?: Readonly<Record<string, Scalar>>;
  }[];
}

/** A confirmation the user gives on screen before the first signature. */
export interface ConfirmationRule {
  readonly kind: 'per-intent';
  /** Signatures of one confirmed body. The first confirmation is sign 1. */
  readonly signLimit: number;
  /**
   * Server values that are Unix-second times. Each must fall at or before the
   * pin and at most `maxBeforePinSec` seconds before it.
   */
  readonly pinnedTimes?: readonly {
    readonly value: string;
    readonly maxBeforePinSec: number;
  }[];
}

export interface OperationRule {
  readonly class: 'read' | 'mutation';
  /** Single-step operations have one step, `default`. A multi-step operation
   * starts at the first step declared here. */
  readonly steps: Readonly<Record<string, readonly StepRequest[]>>;
  /** The user must confirm on screen before the first signature. */
  readonly confirmation?: ConfirmationRule;
}

/** The parts of a signing profile that describe venue requests. */
export interface TemplateProfile {
  readonly operations: Readonly<Record<string, OperationRule>>;
  readonly requests: Readonly<Record<string, RequestTemplate>>;
}

/** One venue request, rendered to the exact bytes that get signed and sent. */
export interface RenderedRequest {
  /** The template's key in the profile. */
  readonly name: string;
  readonly class: 'read' | 'mutation';
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string;
  /** Raw query, no leading `?`. */
  readonly query: string;
  /** Exact body bytes. Empty for reads and empty mutations. */
  readonly body: string;
  readonly idempotencyKey?: string;
  /** Worst-case figures from an invariant, for the confirmation sheet. */
  readonly display?: InvariantDisplay;
}

/** What `binary-limit-order-v1` shows on the confirmation sheet. */
export interface InvariantDisplay {
  /** Worst buy cost, in dollars, rounded up to the cent. */
  readonly maxCost: string;
  /** Contract count from the rendered body. */
  readonly contracts: string;
  /** Worst sell proceeds, in dollars, rounded down to the cent. */
  readonly minProceeds: string;
}

export type TemplateRule =
  | 'operation'
  | 'step'
  | 'class'
  | 'template'
  | 'input'
  | 'value'
  | 'shape'
  | 'transform'
  | 'map'
  | 'path'
  | 'query'
  | 'body'
  | 'max_bytes'
  | 'idempotency_key'
  | 'invariant'
  | 'confirmation';

/** A request cannot be rendered. Nothing is signed or relayed. */
export class TemplateError extends Error {
  readonly rule: TemplateRule;

  constructor(rule: TemplateRule, detail?: string) {
    super(
      `Venue request was not rendered: ${rule}${detail ? ` (${detail})` : ''}.`,
    );
    this.name = 'TemplateError';
    this.rule = rule;
  }
}

const has = (record: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DECIMAL = /^(0|[1-9][0-9]*)(\.[0-9]+)?$/u;

/** A decimal string as an integer count of 10^-scale, or undefined. */
const scaled = (text: string, scale: number): bigint | undefined => {
  const match = DECIMAL.exec(text);
  if (!match) {
    return undefined;
  }
  const [whole = '', fraction = ''] = text.split('.');
  if (fraction.length > scale) {
    return undefined;
  }
  return BigInt(whole + fraction.padEnd(scale, '0'));
};

const checkShape = (
  shape: Shape,
  value: unknown,
  rule: 'input' | 'value',
  nowMs: number,
): void => {
  const fail = (detail: string): never => {
    throw new TemplateError('shape', `${rule} ${detail}`);
  };
  switch (shape.kind) {
    case 'uuid-v4':
      if (typeof value !== 'string' || !UUID_V4.test(value)) {
        fail('is not a UUID v4');
      }
      return;
    case 'int':
      if (
        typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        (shape.min !== undefined && value < shape.min) ||
        (shape.max !== undefined && value > shape.max)
      ) {
        fail('is not an allowed integer');
      }
      return;
    case 'decimal': {
      const parsed =
        typeof value === 'string' ? scaled(value, shape.scale) : undefined;
      if (parsed === undefined) {
        fail('is not an allowed decimal');
        return;
      }
      const min =
        shape.min === undefined ? undefined : scaled(shape.min, shape.scale);
      const max =
        shape.max === undefined ? undefined : scaled(shape.max, shape.scale);
      if (
        (min !== undefined && parsed < min) ||
        (max !== undefined && parsed > max)
      ) {
        fail('is outside the allowed range');
      }
      return;
    }
    case 'opaque':
      if (
        typeof value !== 'string' ||
        value.length === 0 ||
        value.length > shape.maxLength
      ) {
        fail('is not an allowed opaque string');
      }
      return;
    case 'oneOf':
      if (!shape.values.some((allowed) => allowed === value)) {
        fail('is not one of the allowed values');
      }
      return;
    case 'array':
      if (!Array.isArray(value) || value.length > shape.maxItems) {
        fail('is not an allowed array');
        return;
      }
      value.forEach((item) => checkShape(shape.of, item, rule, nowMs));
      return;
    case 'time': {
      if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
        fail('is not an integer time');
        return;
      }
      const seconds = shape.unit === 'ms' ? value / 1000 : value;
      const nowSec = nowMs / 1000;
      if (
        (shape.maxAgeSec !== undefined && seconds < nowSec - shape.maxAgeSec) ||
        (shape.maxAheadSec !== undefined &&
          seconds > nowSec + shape.maxAheadSec)
      ) {
        fail('is outside the allowed time window');
      }
      return;
    }
    default:
      throw new TemplateError('shape', 'unknown shape');
  }
};

const transformValue = (transform: Transform, value: unknown): string => {
  if (transform === 'trim') {
    if (typeof value !== 'string') {
      throw new TemplateError('transform', transform);
    }
    return value.trim();
  }
  const scale = transform === 'decimal-fixed-2' ? 2 : 4;
  const parsed = typeof value === 'string' ? scaled(value, scale) : undefined;
  if (parsed === undefined) {
    throw new TemplateError('transform', transform);
  }
  const digits = parsed.toString().padStart(scale + 1, '0');
  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
};

interface RenderContext {
  readonly inputs: TemplateInputs;
  readonly values: TemplateValues;
  readonly nowMs: number;
}

const resolve = (source: Source, context: RenderContext): unknown => {
  if ('const' in source) {
    return source.const;
  }
  if ('input' in source) {
    if (!has(context.inputs, source.input)) {
      throw new TemplateError('input', `missing ${source.input}`);
    }
    const given = context.inputs[source.input];
    // The shape describes the value that is rendered, after the transform.
    const value = source.transform
      ? transformValue(source.transform, given)
      : given;
    if (source.shape) {
      checkShape(source.shape, value, 'input', context.nowMs);
    }
    return value;
  }
  if ('map' in source) {
    const key = source.map.inputs
      .map((name) => {
        const value = has(context.inputs, name)
          ? context.inputs[name]
          : undefined;
        if (typeof value !== 'string') {
          throw new TemplateError('map', `input ${name} is not a string`);
        }
        return value;
      })
      .join(':');
    if (!has(source.map.table, key)) {
      throw new TemplateError('map', 'no table entry');
    }
    return source.map.table[key];
  }
  if (!has(context.values, source.value)) {
    throw new TemplateError('value', `missing ${source.value}`);
  }
  const value = context.values[source.value];
  checkShape(source.shape, value, 'value', context.nowMs);
  return value;
};

const isScalar = (value: unknown): value is Scalar =>
  typeof value === 'string' ||
  typeof value === 'number' ||
  typeof value === 'boolean';

/** RFC 3986 unreserved characters stay as they are. */
const encode = (text: string): string =>
  encodeURIComponent(text).replace(
    /[!'()*]/gu,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const renderPath = (
  template: RequestTemplate,
  context: RenderContext,
): string => {
  const params = template.pathParams ?? {};
  const used = new Set<string>();
  const path = template.path.replace(
    /\{([a-z_]+)\}/gu,
    (_match, name: string) => {
      if (!has(params, name)) {
        throw new TemplateError('path', `no source for ${name}`);
      }
      used.add(name);
      const value = resolve(params[name] as Source, context);
      if (!isScalar(value)) {
        throw new TemplateError('path', `${name} is not a scalar`);
      }
      return encode(String(value));
    },
  );
  if (used.size !== Object.keys(params).length) {
    throw new TemplateError('path', 'unused path parameter');
  }
  return path;
};

const renderQuery = (
  template: RequestTemplate,
  context: RenderContext,
): string => {
  const pairs: string[] = [];
  for (const entry of template.query ?? []) {
    let value: unknown;
    try {
      value = resolve(entry.value, context);
    } catch (error) {
      // Only an absent input or value leaves an optional key out. A value
      // that is present but refused is always an error.
      if (
        entry.optional &&
        error instanceof TemplateError &&
        (error.rule === 'input' || error.rule === 'value')
      ) {
        continue;
      }
      throw error;
    }
    if (!isScalar(value)) {
      throw new TemplateError('query', `${entry.key} is not a scalar`);
    }
    pairs.push(`${encode(entry.key)}=${encode(String(value))}`);
  }
  return pairs.join('&');
};

const renderBody = (
  template: RequestTemplate,
  context: RenderContext,
): string => {
  if (template.body === undefined || template.body === 'empty') {
    return '';
  }
  const object: Record<string, unknown> = {};
  for (const field of template.body.json) {
    if (has(object, field.key)) {
      throw new TemplateError('body', `duplicate key ${field.key}`);
    }
    object[field.key] = resolve(field.value, context);
  }
  const text = JSON.stringify(object);
  if (new TextEncoder().encode(text).length > template.body.maxBytes) {
    throw new TemplateError('max_bytes');
  }
  return text;
};

const dollarsFromCents = (cents: bigint): string => {
  const whole = cents / 100n;
  const fraction = (cents % 100n).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
};

const bodyField = (
  body: string,
  key: string,
  implementation: string,
): string => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new TemplateError('invariant', implementation);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TemplateError('invariant', implementation);
  }
  const value = (parsed as Record<string, unknown>)[key];
  if (typeof value !== 'string') {
    throw new TemplateError('invariant', implementation);
  }
  return value;
};

const inputString = (
  context: RenderContext,
  name: string,
): string | undefined => {
  if (!has(context.inputs, name)) {
    return undefined;
  }
  const value = context.inputs[name];
  return typeof value === 'string' ? value : undefined;
};

/**
 * `binary-limit-order-v1`. Prices are yes-leg: a NO outcome price is
 * `1 − body price`. The comparison is exact, in millionths of a dollar
 * (`count` hundredths times price ten-thousandths). The displayed dollars
 * round the buy cap up and the sell floor down, so the sheet never shows
 * a better number than the check allowed.
 */
const checkBinaryLimitOrder = (
  implementation: string,
  params: Readonly<Record<string, Scalar>> | undefined,
  body: string,
  context: RenderContext,
): InvariantDisplay => {
  // Copy index-signature fields out before the checks. TypeScript does not
  // narrow `params[key]`, so a later read would still be `string | number | boolean`.
  const amountInput = params?.amountInput;
  const contractsInput = params?.contractsInput;
  const priceField = params?.priceField;
  const countField = params?.countField;
  const actionInput = params?.actionInput;
  const outcomeInput = params?.outcomeInput;
  const feeCeilingCentsPerContract = params?.feeCeilingCentsPerContract;
  if (
    !params ||
    params.pricing !== 'yes-leg' ||
    typeof feeCeilingCentsPerContract !== 'number' ||
    !Number.isSafeInteger(feeCeilingCentsPerContract) ||
    feeCeilingCentsPerContract < 0 ||
    typeof amountInput !== 'string' ||
    typeof contractsInput !== 'string' ||
    typeof priceField !== 'string' ||
    typeof countField !== 'string' ||
    typeof actionInput !== 'string' ||
    typeof outcomeInput !== 'string'
  ) {
    throw new TemplateError('invariant', implementation);
  }
  const price = scaled(bodyField(body, priceField, implementation), 4);
  const count = scaled(bodyField(body, countField, implementation), 2);
  const outcome = inputString(context, outcomeInput);
  const action = inputString(context, actionInput);
  if (price === undefined || count === undefined || !outcome || !action) {
    throw new TemplateError('invariant', implementation);
  }
  const outcomeLimit =
    outcome === 'no' ? 10_000n - price : outcome === 'yes' ? price : undefined;
  if (outcomeLimit === undefined || outcomeLimit <= 0n) {
    throw new TemplateError('invariant', implementation);
  }
  const floorName = params.minOutcomePriceInput;
  if (typeof floorName === 'string' && has(context.inputs, floorName)) {
    const floorText = inputString(context, floorName);
    const floor = floorText === undefined ? undefined : scaled(floorText, 4);
    if (floor === undefined || outcomeLimit < floor) {
      throw new TemplateError('invariant', implementation);
    }
  }
  const fee = BigInt(feeCeilingCentsPerContract) * 100n;
  const proceeds = count * outcomeLimit;
  const cost = count * (outcomeLimit + fee);
  if (action === 'buy') {
    const amount = context.inputs[amountInput];
    if (
      typeof amount !== 'number' ||
      !Number.isSafeInteger(amount) ||
      amount < 0
    ) {
      throw new TemplateError('invariant', implementation);
    }
    // `amount` is cents. One cent is 10_000 units of `cost`.
    if (cost > BigInt(amount) * 10_000n) {
      throw new TemplateError('invariant', implementation);
    }
  } else if (action === 'sell') {
    const contracts = inputString(context, contractsInput);
    const offered = contracts === undefined ? undefined : scaled(contracts, 2);
    if (offered === undefined || offered !== count) {
      throw new TemplateError('invariant', implementation);
    }
  } else {
    throw new TemplateError('invariant', implementation);
  }
  return {
    maxCost: dollarsFromCents((cost + 9_999n) / 10_000n),
    contracts: bodyField(body, countField, implementation),
    minProceeds: dollarsFromCents(proceeds / 10_000n),
  };
};

const checkInvariants = (
  template: RequestTemplate,
  body: string,
  context: RenderContext,
): InvariantDisplay | undefined => {
  let display: InvariantDisplay | undefined;
  for (const invariant of template.invariants ?? []) {
    if (invariant.implementation === 'binary-limit-order-v1') {
      display = checkBinaryLimitOrder(
        invariant.implementation,
        invariant.params,
        body,
        context,
      );
      continue;
    }
    throw new TemplateError('invariant', invariant.implementation);
  }
  return display;
};

const renderRequest = (
  name: string,
  template: RequestTemplate,
  context: RenderContext,
): RenderedRequest => {
  const base = {
    name,
    class: template.class,
    method: template.method,
    path: renderPath(template, context),
    query: renderQuery(template, context),
  };
  if (template.class === 'read') {
    if (template.body !== undefined || template.idempotencyKey !== undefined) {
      throw new TemplateError('template', `${name} is a read with a body`);
    }
    if (template.method !== 'GET') {
      throw new TemplateError('template', `${name} is a read that is not GET`);
    }
    return { ...base, body: '' };
  }
  if (template.method === 'GET') {
    throw new TemplateError('template', `${name} is a GET mutation`);
  }
  if (template.idempotencyKey === undefined) {
    throw new TemplateError('idempotency_key', name);
  }
  const key = resolve(template.idempotencyKey, context);
  if (typeof key !== 'string' || key.length === 0 || key.length > 128) {
    throw new TemplateError('idempotency_key', name);
  }
  const body = renderBody(template, context);
  return {
    ...base,
    body,
    idempotencyKey: key,
    display: checkInvariants(template, body, context),
  };
};

const conditionHolds = (
  condition: Condition,
  context: RenderContext,
): boolean =>
  has(context.inputs, condition.input) &&
  context.inputs[condition.input] === condition.equals;

/** One render context per array element, or the parent context when the
 * request is not repeated. */
const contextsFor = (
  entry: StepRequest,
  context: RenderContext,
): RenderContext[] => {
  const each = entry.each;
  if (!each) {
    return [context];
  }
  if (each.shape.kind !== 'array') {
    throw new TemplateError('template', `${entry.request} repeats a non-array`);
  }
  if (!has(context.values, each.value)) {
    throw new TemplateError('value', `missing ${each.value}`);
  }
  const raw = context.values[each.value];
  checkShape(each.shape, raw, 'value', context.nowMs);
  if (!Array.isArray(raw)) {
    throw new TemplateError('shape', each.value);
  }
  return raw.map((item) => ({
    inputs: context.inputs,
    nowMs: context.nowMs,
    values: { ...context.values, [each.as]: item as Scalar },
  }));
};

/**
 * The step a call starts at when it names none: `default` for a single-step
 * operation, otherwise the first step the profile declares. Which step comes
 * first is profile data, so callers do not name venue steps.
 */
export const defaultStep = (
  profile: TemplateProfile,
  operation: string,
): string => {
  if (!has(profile.operations, operation)) {
    throw new TemplateError('operation', operation);
  }
  const { steps } = profile.operations[operation] as OperationRule;
  if (has(steps, 'default')) {
    return 'default';
  }
  const [first] = Object.keys(steps);
  if (first === undefined) {
    throw new TemplateError('step', 'none declared');
  }
  return first;
};

/**
 * Renders the requests of one step of one operation. Pure: the same profile,
 * inputs, values and clock always give the same bytes. Throws `TemplateError`
 * for anything the profile does not allow.
 */
export const renderStep = (
  profile: TemplateProfile,
  operation: string,
  step: string,
  given: {
    inputs?: TemplateInputs;
    values?: TemplateValues;
    nowMs: number;
  },
): RenderedRequest[] => {
  if (!has(profile.operations, operation)) {
    throw new TemplateError('operation', operation);
  }
  const rule = profile.operations[operation] as OperationRule;
  if (!has(rule.steps, step)) {
    throw new TemplateError('step', step);
  }
  const context: RenderContext = {
    inputs: given.inputs ?? {},
    values: given.values ?? {},
    nowMs: given.nowMs,
  };
  const entries = rule.steps[step] as readonly StepRequest[];
  // An empty step, such as `orders.commit` `none`, signs nothing.
  if (entries.length === 0) {
    return [];
  }
  const rendered: RenderedRequest[] = [];
  for (const entry of entries) {
    if (entry.when && !conditionHolds(entry.when, context)) {
      continue;
    }
    if (!has(profile.requests, entry.request)) {
      throw new TemplateError('template', entry.request);
    }
    const template = profile.requests[entry.request] as RequestTemplate;
    if (rule.class === 'read' && template.class !== 'read') {
      throw new TemplateError('class', `${operation} renders ${entry.request}`);
    }
    for (const child of contextsFor(entry, context)) {
      rendered.push(renderRequest(entry.request, template, child));
    }
  }
  if (rendered.length === 0) {
    throw new TemplateError('step', `${step} rendered no requests`);
  }
  return rendered;
};
