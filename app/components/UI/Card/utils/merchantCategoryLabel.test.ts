import { CardMerchantCategory } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { getMerchantCategoryLabel } from './merchantCategoryLabel';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('getMerchantCategoryLabel', () => {
  it('returns undefined when category is missing', () => {
    const result = getMerchantCategoryLabel(undefined);

    expect(result).toBeUndefined();
  });

  it('maps food category to its i18n key', () => {
    const result = getMerchantCategoryLabel(CardMerchantCategory.Food);

    expect(result).toBe('card.transactions.categories.food');
  });

  it('maps misc category to its i18n key', () => {
    const result = getMerchantCategoryLabel(CardMerchantCategory.Misc);

    expect(result).toBe('card.transactions.categories.misc');
  });

  it('maps travel category to its i18n key', () => {
    const result = getMerchantCategoryLabel(CardMerchantCategory.Travel);

    expect(result).toBe('card.transactions.categories.travel');
  });
});
