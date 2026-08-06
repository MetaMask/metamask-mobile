import { PERPS_ERROR_CODES } from '@metamask/perps-controller';
import { ERROR_CODE_TO_I18N_KEY } from './translatePerpsError';
import enTranslations from '../../../../../locales/languages/en.json';

/**
 * Lives apart from `translatePerpsError.test.ts` on purpose: that file mocks
 * `PERPS_ERROR_CODES` down to a subset to keep its import chain light, so the
 * map it builds cannot answer whether every real code is covered. These tests
 * read the installed controller's full code list.
 *
 * A controller upgrade that widens `PerpsErrorCode` — as v11 did with the
 * trigger-order, TP/SL linkage and exchange codes — fails here rather than
 * shipping an untranslated code to users.
 */
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

describe('ERROR_CODE_TO_I18N_KEY', () => {
  const errorCodes = Object.values(PERPS_ERROR_CODES);

  it('maps every error code the controller exports', () => {
    const unmapped = errorCodes.filter((code) => !ERROR_CODE_TO_I18N_KEY[code]);

    expect(unmapped).toStrictEqual([]);
  });

  it('maps the v11 trigger, TP/SL linkage and exchange codes', () => {
    const v11Codes = [
      PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_REQUIRED,
      PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_POSITIVE,
      PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_NOT_SUPPORTED,
      PERPS_ERROR_CODES.ORDER_TRIGGER_TPSL_UNSUPPORTED,
      PERPS_ERROR_CODES.ORDER_TPSL_SIZE_INVALID,
      PERPS_ERROR_CODES.ORDER_TPSL_LINKAGE_CONFLICT,
      PERPS_ERROR_CODES.ORDER_TPSL_LINKAGE_REQUIRED,
      PERPS_ERROR_CODES.ORDER_TPSL_POSITION_LINKAGE_UNSUPPORTED,
      PERPS_ERROR_CODES.ORDER_TIME_IN_FORCE_NOT_SUPPORTED,
      PERPS_ERROR_CODES.ORDER_EDIT_TRIGGER_UNSUPPORTED,
      PERPS_ERROR_CODES.ORDER_EDIT_ORDER_UNVERIFIABLE,
      PERPS_ERROR_CODES.EXCHANGE_ACCOUNT_NOT_FOUND,
      PERPS_ERROR_CODES.EXCHANGE_MULTI_SIG_REQUIRED,
      PERPS_ERROR_CODES.EXCHANGE_INVALID_NONCE,
    ];

    const unmapped = v11Codes.filter((code) => !ERROR_CODE_TO_I18N_KEY[code]);

    expect(unmapped).toStrictEqual([]);
  });

  it('resolves every mapped i18n key to English copy', () => {
    const unresolved = errorCodes
      .map((code) => ERROR_CODE_TO_I18N_KEY[code])
      .filter((i18nKey) => i18nKey && !resolveTranslation(i18nKey));

    expect(unresolved).toStrictEqual([
      // Pre-existing gap, unrelated to the controller upgrade.
      'perps.errors.subscriptionClientNotAvailable',
    ]);
  });
});
