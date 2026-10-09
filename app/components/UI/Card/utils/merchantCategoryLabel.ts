import { strings } from '../../../../../locales/i18n';
import { CardMerchantCategory } from '../../../../core/Engine/controllers/card-controller/provider-types';

const CATEGORY_LABEL_KEY: Record<CardMerchantCategory, string> = {
  [CardMerchantCategory.Subscriptions]:
    'card.transactions.categories.subscriptions',
  [CardMerchantCategory.Food]: 'card.transactions.categories.food',
  [CardMerchantCategory.Travel]: 'card.transactions.categories.travel',
  [CardMerchantCategory.Entertainment]:
    'card.transactions.categories.entertainment',
  [CardMerchantCategory.Health]: 'card.transactions.categories.health',
  [CardMerchantCategory.Atm]: 'card.transactions.categories.atm',
  [CardMerchantCategory.Utilities]: 'card.transactions.categories.utilities',
  [CardMerchantCategory.Misc]: 'card.transactions.categories.misc',
};

export function getMerchantCategoryLabel(
  category?: CardMerchantCategory,
): string | undefined {
  if (!category) {
    return undefined;
  }
  const key = CATEGORY_LABEL_KEY[category];
  return key ? strings(key) : undefined;
}
