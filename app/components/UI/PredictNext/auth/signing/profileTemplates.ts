/**
 * Venue request templates and their renderer (ADR-0004).
 *
 * One payload kind of the signed profile document — `http-rfc9421` — is
 * rendered here into the exact bytes the phone signs and sends. The rules
 * are self-contained: a `RequestTemplate` names its method, path, query,
 * body fields and idempotency key as `Source` selectors over the user's
 * inputs and locally computed values, and `renderRequest` produces the
 * rendered request or refuses with a `TemplateError`. Nothing here talks to
 * the network; callers find the payload in the verified profile document and
 * adapt it to a `RequestTemplate`.
 *
 * The phone checks invariants on the rendered body text before it signs and
 * returns the figures for its confirmation sheet. predict-api renders
 * nothing: it field-checks the signed bytes against its stored quote. The
 * phone also enforces the envelope bound (`max_signatures`) itself, and
 * predict-api enforces it when it verifies the envelope.
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
  /** What the contracts pay if the outcome wins, in dollars. */
  readonly payout: string;
  /** Worst sell proceeds after the fee ceiling, in dollars, rounded down to
   * the cent. */
  readonly minProceeds: string;
}

export type TemplateRule =
  | 'intent'
  | 'payload'
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
  | 'confirmation'
  | 'max_signatures';

/** A request cannot be rendered. Nothing is signed or relayed. */
export class TemplateError extends Error {
  readonly rule: TemplateRule;

  constructor(rule: TemplateRule, detail?: string) {
    const suffix = detail === undefined ? '' : ` (${detail})`;
    super(`Venue request was not rendered: ${rule}${suffix}.`);
    this.name = 'TemplateError';
    this.rule = rule;
  }
}

const has = (record: object, key: string): boolean =>
  Object.hasOwn(record, key);

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const DECIMAL = /^(0|[1-9]\d*)(\.\d+)?$/u;

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
  // `\d` under the `u` flag also matches non-ASCII digits, which `BigInt`
  // refuses. Those are not an allowed decimal.
  try {
    return BigInt(whole + fraction.padEnd(scale, '0'));
  } catch {
    return undefined;
  }
};

/** Refuses a shape rule: every refusal reads `<rule> <detail>`. */
const refuseShape: (rule: 'input' | 'value', detail: string) => never = (
  rule,
  detail,
) => {
  throw new TemplateError('shape', `${rule} ${detail}`);
};

const checkDecimalShape = (
  shape: Extract<Shape, { kind: 'decimal' }>,
  value: unknown,
  rule: 'input' | 'value',
): void => {
  const parsed =
    typeof value === 'string' ? scaled(value, shape.scale) : undefined;
  if (parsed === undefined) {
    refuseShape(rule, 'is not an allowed decimal');
  }
  const bound = (text: string | undefined): bigint | undefined => {
    if (text === undefined) {
      return undefined;
    }
    const parsedBound = scaled(text, shape.scale);
    if (parsedBound === undefined) {
      throw new TemplateError('shape', `${rule} has a malformed bound`);
    }
    return parsedBound;
  };
  const min = bound(shape.min);
  const max = bound(shape.max);
  if (
    (min !== undefined && parsed < min) ||
    (max !== undefined && parsed > max)
  ) {
    refuseShape(rule, 'is outside the allowed range');
  }
};

const checkTimeShape = (
  shape: Extract<Shape, { kind: 'time' }>,
  value: unknown,
  rule: 'input' | 'value',
  nowMs: number,
): void => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    refuseShape(rule, 'is not an integer time');
  }
  const seconds = shape.unit === 'ms' ? value / 1000 : value;
  const nowSec = nowMs / 1000;
  if (
    (shape.maxAgeSec !== undefined && seconds < nowSec - shape.maxAgeSec) ||
    (shape.maxAheadSec !== undefined && seconds > nowSec + shape.maxAheadSec)
  ) {
    refuseShape(rule, 'is outside the allowed time window');
  }
};

const checkShape = (
  shape: Shape,
  value: unknown,
  rule: 'input' | 'value',
  nowMs: number,
): void => {
  switch (shape.kind) {
    case 'uuid-v4':
      if (typeof value !== 'string' || !UUID_V4.test(value)) {
        refuseShape(rule, 'is not a UUID v4');
      }
      return;
    case 'int':
      if (
        typeof value !== 'number' ||
        !Number.isSafeInteger(value) ||
        (shape.min !== undefined && value < shape.min) ||
        (shape.max !== undefined && value > shape.max)
      ) {
        refuseShape(rule, 'is not an allowed integer');
      }
      return;
    case 'decimal':
      checkDecimalShape(shape, value, rule);
      return;
    case 'opaque':
      if (
        typeof value !== 'string' ||
        value.length === 0 ||
        value.length > shape.maxLength
      ) {
        refuseShape(rule, 'is not an allowed opaque string');
      }
      return;
    case 'oneOf':
      if (
        (typeof value !== 'string' && typeof value !== 'number') ||
        !shape.values.includes(value)
      ) {
        refuseShape(rule, 'is not one of the allowed values');
      }
      return;
    case 'array':
      if (!Array.isArray(value) || value.length > shape.maxItems) {
        refuseShape(rule, 'is not an allowed array');
        return;
      }
      value.forEach((item) => checkShape(shape.of, item, rule, nowMs));
      return;
    case 'time':
      checkTimeShape(shape, value, rule, nowMs);
      return;
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

/** RFC 3986 unreserved characters stay as they are. A lone surrogate has no
 * UTF-8 encoding and is refused. */
const encode = (text: string, rule: 'path' | 'query'): string => {
  let encoded: string;
  try {
    encoded = encodeURIComponent(text);
  } catch {
    throw new TemplateError(rule, 'not encodable');
  }
  return encoded.replace(
    /[!'()*]/gu,
    (char) => `%${(char.codePointAt(0) as number).toString(16).toUpperCase()}`,
  );
};

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
      const text = String(value);
      // Dot segments would move the request to another path once resolved.
      if (text === '' || text === '.' || text === '..') {
        throw new TemplateError('path', `${name} is not a path segment`);
      }
      return encode(text, 'path');
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
    pairs.push(
      `${encode(entry.key, 'query')}=${encode(String(value), 'query')}`,
    );
  }
  return pairs.join('&');
};

const INTEGER_LIKE_KEY = /^(0|[1-9]\d*)$/u;

const renderBody = (
  template: RequestTemplate,
  context: RenderContext,
): string => {
  if (template.body === undefined || template.body === 'empty') {
    return '';
  }
  const object: Record<string, unknown> = Object.create(null);
  for (const field of template.body.json) {
    // JSON.stringify writes integer-like keys first, whatever their order in
    // the template, which would break the template's key order.
    if (INTEGER_LIKE_KEY.test(field.key)) {
      throw new TemplateError('body', `integer-like key ${field.key}`);
    }
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

/** The `binary-limit-order-v1` params this build signs under, narrowed once. */
interface BinaryLimitOrderParams {
  readonly amountInput: string;
  readonly contractsInput: string;
  readonly priceField: string;
  readonly countField: string;
  readonly reduceOnlyField: string;
  readonly actionInput: string;
  readonly outcomeInput: string;
  readonly feeCeilingCentsPerContract: number;
  readonly minOutcomePriceInput?: string;
}

/** Copies the index-signature fields out before the checks: TypeScript does
 * not narrow `params[key]`, so a later read would still be the union. */
const readBinaryLimitOrderParams = (
  implementation: string,
  params: Readonly<Record<string, Scalar>> | undefined,
): BinaryLimitOrderParams => {
  const amountInput = params?.amountInput;
  const contractsInput = params?.contractsInput;
  const priceField = params?.priceField;
  const countField = params?.countField;
  const reduceOnlyField = params?.reduceOnlyField;
  const actionInput = params?.actionInput;
  const outcomeInput = params?.outcomeInput;
  const feeCeilingCentsPerContract = params?.feeCeilingCentsPerContract;
  if (
    params?.pricing !== 'yes-leg' ||
    typeof feeCeilingCentsPerContract !== 'number' ||
    !Number.isSafeInteger(feeCeilingCentsPerContract) ||
    feeCeilingCentsPerContract < 0 ||
    typeof amountInput !== 'string' ||
    typeof contractsInput !== 'string' ||
    typeof priceField !== 'string' ||
    typeof countField !== 'string' ||
    typeof reduceOnlyField !== 'string' ||
    typeof actionInput !== 'string' ||
    typeof outcomeInput !== 'string'
  ) {
    throw new TemplateError('invariant', implementation);
  }
  return {
    amountInput,
    contractsInput,
    priceField,
    countField,
    reduceOnlyField,
    actionInput,
    outcomeInput,
    feeCeilingCentsPerContract,
    minOutcomePriceInput:
      typeof params.minOutcomePriceInput === 'string'
        ? params.minOutcomePriceInput
        : undefined,
  };
};

/** The yes-leg limit price a NO action trades against. */
const outcomeLimitPrice = (
  outcome: string,
  price: bigint,
): bigint | undefined => {
  if (outcome === 'no') {
    return 10_000n - price;
  }
  return outcome === 'yes' ? price : undefined;
};

/** The amount the phone is allowed to commit. A buy must cover the worst-case
 * cost within the amount the person typed; a sell must offer exactly the
 * contracts in the body. */
const checkAffordability = (
  implementation: string,
  params: BinaryLimitOrderParams,
  context: RenderContext,
  action: string,
  count: bigint,
  cost: bigint,
): void => {
  if (action === 'buy') {
    const amount = context.inputs[params.amountInput];
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
    return;
  }
  if (action !== 'sell') {
    throw new TemplateError('invariant', implementation);
  }
  const contracts = inputString(context, params.contractsInput);
  const offered = contracts === undefined ? undefined : scaled(contracts, 2);
  if (offered === undefined || offered !== count) {
    throw new TemplateError('invariant', implementation);
  }
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
  const limitParams = readBinaryLimitOrderParams(implementation, params);
  const { priceField, countField, reduceOnlyField } = limitParams;
  const price = scaled(bodyField(body, priceField, implementation), 4);
  const count = scaled(bodyField(body, countField, implementation), 2);
  const outcome = inputString(context, limitParams.outcomeInput);
  const action = inputString(context, limitParams.actionInput);
  if (price === undefined || count === undefined || !outcome || !action) {
    throw new TemplateError('invariant', implementation);
  }
  // A YES-leg ask alone can open NO (and a bid can open YES). Only the
  // venue's IOC reduce_only constraint makes a sell closing-only, even if
  // holdings changed since Preview. Its boolean is part of the signed body.
  const reduceOnly: unknown = (JSON.parse(body) as Record<string, unknown>)[
    reduceOnlyField
  ];
  if (reduceOnly !== (action === 'sell')) {
    throw new TemplateError('invariant', implementation);
  }
  const outcomeLimit = outcomeLimitPrice(outcome, price);
  // A binary contract trades between 1 and 99 cents. A zero or negative count
  // would pass the cost check trivially.
  if (
    outcomeLimit === undefined ||
    outcomeLimit < 100n ||
    outcomeLimit > 9_900n ||
    count <= 0n
  ) {
    throw new TemplateError('invariant', implementation);
  }
  const floorName = limitParams.minOutcomePriceInput;
  if (floorName !== undefined && has(context.inputs, floorName)) {
    const floorText = inputString(context, floorName);
    const floor = floorText === undefined ? undefined : scaled(floorText, 4);
    if (floor === undefined || outcomeLimit < floor) {
      throw new TemplateError('invariant', implementation);
    }
  }
  const fee = BigInt(limitParams.feeCeilingCentsPerContract) * 100n;
  const proceeds = outcomeLimit > fee ? count * (outcomeLimit - fee) : 0n;
  const cost = count * (outcomeLimit + fee);
  checkAffordability(implementation, limitParams, context, action, count, cost);
  return {
    maxCost: dollarsFromCents((cost + 9_999n) / 10_000n),
    contracts: bodyField(body, countField, implementation),
    // `count` is in hundredths of a contract, and a contract pays one dollar.
    payout: dollarsFromCents(count),
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

/**
 * Renders one request. Pure: the same template, inputs, values and clock
 * always give the same bytes. Throws `TemplateError` for anything the
 * template does not allow.
 */
export const renderRequest = (
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
  let key: unknown;
  try {
    key = resolve(template.idempotencyKey, context);
  } catch (error) {
    if (error instanceof TemplateError && error.rule === 'shape') {
      throw new TemplateError('idempotency_key', name);
    }
    throw error;
  }
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
