import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../constants/featureFlags';
import { TOKEN_API_BASE_URL } from '../../../components/UI/Assets/watchlist/utils/getTokens';
import { PRICE_API_BASE_URL } from '../../../constants/urls';
import { TOKEN_DETAILS_V1_TABS } from '../../../components/UI/TokenDetails/constants/constants';
import type { StateWithPartialEngine } from '../types';
import {
  selectAssetsMemecoinTdpV1Enabled,
  selectMemecoinTdpV1PriceApiBaseUrl,
  selectMemecoinTdpV1TabConfigOrder,
  selectMemecoinTdpV1TokenApiBaseUrl,
} from '.';

const stateWithFlag = (value: unknown): StateWithPartialEngine =>
  ({
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            [FeatureFlagNames.assetsMemecoinTdpV1]: value,
          },
        },
      },
    },
  }) as unknown as StateWithPartialEngine;

describe('selectAssetsMemecoinTdpV1Enabled', () => {
  it('returns true when enabled is true', () => {
    expect(
      selectAssetsMemecoinTdpV1Enabled.resultFunc({
        [FeatureFlagNames.assetsMemecoinTdpV1]: { enabled: true },
      }),
    ).toBe(true);
  });

  it('returns false when enabled is false', () => {
    expect(
      selectAssetsMemecoinTdpV1Enabled.resultFunc({
        [FeatureFlagNames.assetsMemecoinTdpV1]: { enabled: false },
      }),
    ).toBe(false);
  });

  it('returns default when remote flag is not set', () => {
    expect(selectAssetsMemecoinTdpV1Enabled.resultFunc({})).toBe(
      Boolean(
        (
          DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.assetsMemecoinTdpV1] as {
            enabled?: boolean;
          }
        )?.enabled,
      ),
    );
  });

  it('returns false when flag has invalid shape', () => {
    expect(
      selectAssetsMemecoinTdpV1Enabled.resultFunc({
        [FeatureFlagNames.assetsMemecoinTdpV1]: { invalid: 'structure' },
      }),
    ).toBe(false);
  });
});

describe('selectMemecoinTdpV1TabConfigOrder', () => {
  it('returns the configured order', () => {
    const result = selectMemecoinTdpV1TabConfigOrder(
      stateWithFlag({
        enabled: true,
        tabConfigOrder: ['overview', 'security', 'feed', 'holders'],
      }),
    );

    expect(result).toStrictEqual(['overview', 'security', 'feed', 'holders']);
  });

  it('keeps a config that names only some of the tabs', () => {
    const result = selectMemecoinTdpV1TabConfigOrder(
      stateWithFlag({
        enabled: true,
        tabConfigOrder: ['overview', 'security'],
      }),
    );

    expect(result).toStrictEqual(['overview', 'security']);
  });

  it('drops tab keys this release does not know', () => {
    const result = selectMemecoinTdpV1TabConfigOrder(
      stateWithFlag({
        enabled: true,
        tabConfigOrder: ['overview', 'liquidity', 42, 'security'],
      }),
    );

    expect(result).toStrictEqual(['overview', 'security']);
  });

  it('de-duplicates repeated tab keys', () => {
    const result = selectMemecoinTdpV1TabConfigOrder(
      stateWithFlag({
        enabled: true,
        tabConfigOrder: ['overview', 'overview', 'security'],
      }),
    );

    expect(result).toStrictEqual(['overview', 'security']);
  });

  it('ignores the config when the feature is off', () => {
    const result = selectMemecoinTdpV1TabConfigOrder(
      stateWithFlag({ enabled: false, tabConfigOrder: ['security'] }),
    );

    expect(result).toStrictEqual(TOKEN_DETAILS_V1_TABS);
  });

  it('falls back to the default order when the entry is absent', () => {
    const result = selectMemecoinTdpV1TabConfigOrder(
      stateWithFlag({ enabled: true }),
    );

    expect(result).toStrictEqual(TOKEN_DETAILS_V1_TABS);
  });

  it('falls back to the default order when the entry is not an array', () => {
    const result = selectMemecoinTdpV1TabConfigOrder(
      stateWithFlag({ enabled: true, tabConfigOrder: 'overview' }),
    );

    expect(result).toStrictEqual(TOKEN_DETAILS_V1_TABS);
  });

  it('falls back to the default order when nothing in the array is usable', () => {
    const emptyResult = selectMemecoinTdpV1TabConfigOrder(
      stateWithFlag({ enabled: true, tabConfigOrder: [] }),
    );
    const unknownResult = selectMemecoinTdpV1TabConfigOrder(
      stateWithFlag({ enabled: true, tabConfigOrder: ['liquidity'] }),
    );

    expect(emptyResult).toStrictEqual(TOKEN_DETAILS_V1_TABS);
    expect(unknownResult).toStrictEqual(TOKEN_DETAILS_V1_TABS);
  });
});

describe('selectMemecoinTdpV1TokenApiBaseUrl', () => {
  const DEV_HOST = 'https://token.dev-api.cx.metamask.io';

  it('returns the configured host', () => {
    const result = selectMemecoinTdpV1TokenApiBaseUrl(
      stateWithFlag({ enabled: true, tokenApiBaseUrl: DEV_HOST }),
    );

    expect(result).toBe(DEV_HOST);
  });

  it('ignores the host when the feature is off', () => {
    const result = selectMemecoinTdpV1TokenApiBaseUrl(
      stateWithFlag({ enabled: false, tokenApiBaseUrl: DEV_HOST }),
    );

    expect(result).toBe(TOKEN_API_BASE_URL);
  });

  it('falls back to prod when the entry is absent', () => {
    const result = selectMemecoinTdpV1TokenApiBaseUrl(
      stateWithFlag({ enabled: true }),
    );

    expect(result).toBe(TOKEN_API_BASE_URL);
  });

  it.each([
    ['plain http', 'http://token.dev-api.cx.metamask.io'],
    ['a relative path', '/v2/assets'],
    ['a bare scheme', 'https://'],
    ['a non-string', 42],
  ])('falls back to prod for %s', (_label, tokenApiBaseUrl) => {
    const result = selectMemecoinTdpV1TokenApiBaseUrl(
      stateWithFlag({ enabled: true, tokenApiBaseUrl }),
    );

    expect(result).toBe(TOKEN_API_BASE_URL);
  });
});

describe('selectMemecoinTdpV1PriceApiBaseUrl', () => {
  const DEV_HOST = 'https://price.dev-api.cx.metamask.io';

  it('returns the configured host', () => {
    const result = selectMemecoinTdpV1PriceApiBaseUrl(
      stateWithFlag({ enabled: true, priceApiBaseUrl: DEV_HOST }),
    );

    expect(result).toBe(DEV_HOST);
  });

  it('ignores the host when the feature is off', () => {
    const result = selectMemecoinTdpV1PriceApiBaseUrl(
      stateWithFlag({ enabled: false, priceApiBaseUrl: DEV_HOST }),
    );

    expect(result).toBe(PRICE_API_BASE_URL);
  });

  it('falls back to prod when the entry is absent', () => {
    const result = selectMemecoinTdpV1PriceApiBaseUrl(
      stateWithFlag({ enabled: true }),
    );

    expect(result).toBe(PRICE_API_BASE_URL);
  });

  it.each([
    ['plain http', 'http://price.dev-api.cx.metamask.io'],
    ['a relative path', '/v3/spot-prices'],
    ['a bare scheme', 'https://'],
    ['a non-string', 42],
  ])('falls back to prod for %s', (_label, priceApiBaseUrl) => {
    const result = selectMemecoinTdpV1PriceApiBaseUrl(
      stateWithFlag({ enabled: true, priceApiBaseUrl }),
    );

    expect(result).toBe(PRICE_API_BASE_URL);
  });

  it('reads the two hosts independently', () => {
    const state = stateWithFlag({
      enabled: true,
      tokenApiBaseUrl: 'https://token.dev-api.cx.metamask.io',
    });

    expect(selectMemecoinTdpV1TokenApiBaseUrl(state)).toBe(
      'https://token.dev-api.cx.metamask.io',
    );
    expect(selectMemecoinTdpV1PriceApiBaseUrl(state)).toBe(PRICE_API_BASE_URL);
  });
});
