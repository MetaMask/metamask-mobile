import type {
  MoneyAccountDepositExperience,
  NonMoneyAccountExperience,
} from '../components/EarnStrategyCard/EarnStrategyCard.types';
import type { EarnExperience } from '../types/earnAssets';

export const isMoneyAccountDepositExperience = (
  experience: EarnExperience,
): experience is MoneyAccountDepositExperience =>
  experience.type === 'MONEY_ACCOUNT_DEPOSIT';

export const isNonMoneyAccountExperience = (
  experience: EarnExperience,
): experience is NonMoneyAccountExperience =>
  experience.type !== 'MONEY_ACCOUNT_DEPOSIT';
