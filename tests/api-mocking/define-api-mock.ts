import type { Mockttp } from 'mockttp';
import { cloneDeep, mergeWith } from 'lodash';
import type { TestSpecificMock } from '../framework/types.ts';
import { getDecodedProxiedURL } from '../smoke-appium/notifications/utils/helpers.ts';

export type ApiMockMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD';

/**
 * Same priority `setupMockRequest` uses. It beats the `/proxy` passthrough that
 * serves `DEFAULT_MOCKS` (mockttp `DEFAULT` is 1), so a spec mock always wins
 * over the default for the same request.
 */
export const SPEC_MOCK_PRIORITY = 999;

/** Objects merge key by key; arrays and primitives replace. */
export type DeepPartial<TValue> = TValue extends readonly unknown[]
  ? TValue
  : TValue extends object
    ? { [Key in keyof TValue]?: DeepPartial<TValue[Key]> }
    : TValue;

/**
 * What a spec changes in the default body: a partial that is deep-merged over
 * it, or a function that receives a copy of the default and returns the full
 * body. Use the function form to replace a keyed map (spot prices) or to add
 * keys, since a partial entry for a new key would not satisfy the consumer type.
 */
export type ApiMockOverrides<TBody> =
  | DeepPartial<TBody>
  | ((body: TBody) => TBody);

export interface ApiMockOptions {
  /** @default SPEC_MOCK_PRIORITY */
  priority?: number;
  /** @default 200 */
  status?: number;
}

export interface ApiMockDefinition<TBody, TParams> {
  /** Stable name used by the catalog, the guard test and error messages. */
  id: string;
  /** @default 'GET' */
  method?: ApiMockMethod;
  /** Matches the proxied URL for any request to this endpoint. */
  url: RegExp;
  /** Matches one specific request, such as a single chain. */
  urlFor?: (params: TParams) => RegExp | string;
  /** Default body. The generic type is the consumer type from `api-response-types.ts`. */
  body: TBody;
}

export interface ApiMock<TBody, TParams> {
  readonly id: string;
  readonly method: ApiMockMethod;
  /** The matcher for any request to the endpoint. */
  readonly url: RegExp;
  /** The URL matcher: `urlFor(params)` when params are given, else `url`. */
  matcher(params?: TParams): RegExp | string;
  /** The default body with the overrides applied. Never mutates the default. */
  response(overrides?: ApiMockOverrides<TBody>): TBody;
  /**
   * A `testSpecificMock`-compatible entry. The rule is registered with
   * `.always()`: without it mockttp answers the first request from the spec
   * rule and the following ones from any other unused rule that matches (for
   * example the global default), so the override would silently stop applying.
   */
  mock(
    overrides?: ApiMockOverrides<TBody>,
    params?: TParams,
    options?: ApiMockOptions,
  ): TestSpecificMock;
  /** Registers the mock on a server directly, for use inside a custom `testSpecificMock`. */
  register(
    server: Mockttp,
    overrides?: ApiMockOverrides<TBody>,
    params?: TParams,
    options?: ApiMockOptions,
  ): Promise<void>;
}

const isUpdater = <TBody>(
  overrides: ApiMockOverrides<TBody>,
): overrides is (body: TBody) => TBody => typeof overrides === 'function';

const mergeArraysByReplacing = (_target: unknown, source: unknown) =>
  Array.isArray(source) ? source : undefined;

export function defineApiMock<TBody, TParams = undefined>(
  definition: ApiMockDefinition<TBody, TParams>,
): ApiMock<TBody, TParams> {
  const { id, url, urlFor, body } = definition;
  const method = definition.method ?? 'GET';

  const matcher = (params?: TParams): RegExp | string => {
    if (params === undefined) {
      return url;
    }
    if (!urlFor) {
      throw new Error(`API mock "${id}" has no urlFor but was given params`);
    }
    return urlFor(params);
  };

  const response = (overrides?: ApiMockOverrides<TBody>): TBody => {
    const copy = cloneDeep(body);
    if (overrides === undefined) {
      return copy;
    }
    if (isUpdater(overrides)) {
      return overrides(copy);
    }
    return mergeWith(copy, overrides, mergeArraysByReplacing);
  };

  const register = async (
    server: Mockttp,
    overrides?: ApiMockOverrides<TBody>,
    params?: TParams,
    options: ApiMockOptions = {},
  ): Promise<void> => {
    const { priority = SPEC_MOCK_PRIORITY, status = 200 } = options;
    const target = matcher(params);
    const forProxy = {
      GET: () => server.forGet('/proxy'),
      POST: () => server.forPost('/proxy'),
      PUT: () => server.forPut('/proxy'),
      DELETE: () => server.forDelete('/proxy'),
      HEAD: () => server.forHead('/proxy'),
    }[method];

    // thenJson (SimpleHandler) never reads the request body, which avoids the
    // mockttp "Aborted" rejection described in `setupMockRequest`.
    await forProxy()
      .matching((request) => {
        const proxiedUrl = getDecodedProxiedURL(request.url);
        return target instanceof RegExp
          ? target.test(proxiedUrl)
          : proxiedUrl.includes(target);
      })
      .asPriority(priority)
      .always()
      .thenJson(status, response(overrides) as object);
  };

  return {
    id,
    method,
    url,
    matcher,
    response,
    mock: (overrides, params, options) => async (server) => {
      await register(server, overrides, params, options);
    },
    register,
  };
}

/** Runs several `testSpecificMock` entries in order. */
export const combineMocks =
  (...mocks: TestSpecificMock[]): TestSpecificMock =>
  async (server) => {
    for (const mock of mocks) {
      await mock(server);
    }
  };
