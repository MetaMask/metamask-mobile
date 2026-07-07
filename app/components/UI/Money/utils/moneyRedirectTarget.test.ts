import {
  SCREEN_NAMES,
  BOTTOM_SHEET_NAMES,
  MONEY_URLS,
  REDIRECT_TARGETS_TYPES,
} from '../constants/moneyEvents';
import { resolveRedirectTargetType } from './moneyRedirectTarget';
import Logger from '../../../../util/Logger';

jest.mock('../../../../core/AppConstants', () => ({
  __esModule: true,
  default: {
    URLS: {
      MONEY_LANDING: 'https://mock.money.landing',
      MUSD_PRICE: 'https://mock.musd.price',
    },
    CARD: {
      CARD_FEES_URL: 'https://mock.card.fees',
    },
  },
}));

jest.mock('../../../../constants/urls', () => ({
  METAMASK_SUPPORT_URL: 'https://mock.metamask.support',
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

describe('resolveRedirectTargetType', () => {
  it.each(Object.values(SCREEN_NAMES))(
    'returns SCREEN for SCREEN_NAMES value "%s"',
    (target) => {
      const result = resolveRedirectTargetType(target);

      expect(result).toBe(REDIRECT_TARGETS_TYPES.SCREEN);
    },
  );

  it.each(Object.values(BOTTOM_SHEET_NAMES))(
    'returns BOTTOM_SHEET for BOTTOM_SHEET_NAMES value "%s"',
    (target) => {
      const result = resolveRedirectTargetType(target);

      expect(result).toBe(REDIRECT_TARGETS_TYPES.BOTTOM_SHEET);
    },
  );

  it.each(Object.values(MONEY_URLS))(
    'returns EXTERNAL_BROWSER for MONEY_URLS value "%s"',
    (target) => {
      const result = resolveRedirectTargetType(target);

      expect(result).toBe(REDIRECT_TARGETS_TYPES.EXTERNAL_BROWSER);
    },
  );

  it('returns undefined and logs an error for an unknown target', () => {
    const unknownTarget = 'completely_unknown_target' as SCREEN_NAMES;

    const result = resolveRedirectTargetType(unknownTarget);

    expect(result).toBeUndefined();
    expect(Logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          '[moneyAnalytics] No redirect_target_type for target: completely_unknown_target',
      }),
    );
  });
});
