import {
  PERPS_ERROR_CODES,
  PERPS_ERROR_COPY,
} from '@metamask/perps-controller';
import enTranslations from '../../../../../locales/languages/en.json';

const resolveTranslation = (i18nKey: string): string | undefined => {
  let node: unknown = enTranslations;

  for (const segment of i18nKey.split('.')) {
    if (typeof node !== 'object' || node === null || !(segment in node)) {
      return undefined;
    }
    node = (node as Record<string, unknown>)[segment];
  }

  return typeof node === 'string' ? node : undefined;
};

describe('Mobile translations for controller errors', () => {
  it('maps IOC cancellation to user-facing slippage copy', () => {
    const key = PERPS_ERROR_COPY[PERPS_ERROR_CODES.IOC_CANCEL].key;

    const message = resolveTranslation(key);

    expect(key).toBe('perps.errors.iocCancel');
    expect(message).not.toContain(PERPS_ERROR_CODES.IOC_CANCEL);
    expect(message).toContain('slippage tolerance');
    expect(message).toContain('limit order');
  });

  const errorCodes = Object.values(PERPS_ERROR_CODES);

  it('maps the v23 and v24 provider-route and TP/SL leg codes', () => {
    const routeKey =
      PERPS_ERROR_COPY[PERPS_ERROR_CODES.PROVIDER_ROUTE_REQUIRED].key;
    const legReplaceCopy = resolveTranslation(
      PERPS_ERROR_COPY[PERPS_ERROR_CODES.TPSL_LEG_REPLACE_UNSUPPORTED].key,
    );

    expect(
      PERPS_ERROR_COPY[PERPS_ERROR_CODES.TPSL_LEG_REPLACE_UNSUPPORTED].key,
    ).toBe('perps.errors.tpslLegReplaceUnsupported');
    expect(legReplaceCopy).toContain('together instead');
    expect(legReplaceCopy).not.toContain('Try again');
    expect(routeKey).toBe('perps.errors.providerRouteRequired');
    expect(resolveTranslation(routeKey)).toBe(
      'No exchange selected. Select one and try again.',
    );
  });

  it('maps the v20 price-moved code to detailed price movement copy', () => {
    expect(PERPS_ERROR_COPY[PERPS_ERROR_CODES.PRICE_MOVED].key).toBe(
      'perps.errors.priceMoved',
    );
  });

  it('maps post-only codes to the existing post-only copy', () => {
    expect(
      PERPS_ERROR_COPY[PERPS_ERROR_CODES.ORDER_POST_ONLY_WOULD_CROSS].key,
    ).toBe('perps.errors.postOnlyWouldCross');
    expect(PERPS_ERROR_COPY[PERPS_ERROR_CODES.ORDER_POST_ONLY_WINDOW].key).toBe(
      'perps.errors.postOnlyWindow',
    );
  });

  it('resolves every mapped i18n key to English copy', () => {
    const unresolved = errorCodes
      .map((code) => PERPS_ERROR_COPY[code].key)
      .filter((i18nKey) => !i18nKey || !resolveTranslation(i18nKey));

    expect(unresolved).toStrictEqual([]);
  });
});
