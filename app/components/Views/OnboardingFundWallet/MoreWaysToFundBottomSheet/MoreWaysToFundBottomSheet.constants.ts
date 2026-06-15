import { IconName } from '@metamask/design-system-react-native';
import type {
  MoreWaysToFundOptionId,
  MoreWaysToFundSectionId,
} from './MoreWaysToFundBottomSheet.types';

export interface MoreWaysToFundOption {
  id: MoreWaysToFundOptionId;
  labelKey: string;
  descriptionKey: string;
  iconName: IconName;
  section: MoreWaysToFundSectionId;
}

export const MORE_WAYS_TO_FUND_OPTIONS: MoreWaysToFundOption[] = [
  {
    id: 'paypal',
    labelKey: 'onboarding_fund_wallet.more_ways_option_paypal',
    descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
    iconName: IconName.Coin,
    section: 'digital_wallets',
  },
  {
    id: 'revolut_pay',
    labelKey: 'onboarding_fund_wallet.more_ways_option_revolut_pay',
    descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
    iconName: IconName.Card,
    section: 'digital_wallets',
  },
  {
    id: 'google_pay',
    labelKey: 'onboarding_fund_wallet.more_ways_option_google_pay',
    descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
    iconName: IconName.AddCard,
    section: 'digital_wallets',
  },
  {
    id: 'venmo',
    labelKey: 'onboarding_fund_wallet.more_ways_option_venmo',
    descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
    iconName: IconName.Coin,
    section: 'digital_wallets',
  },
  {
    id: 'upi',
    labelKey: 'onboarding_fund_wallet.more_ways_option_upi',
    descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
    iconName: IconName.Bank,
    section: 'regional',
  },
  {
    id: 'pix',
    labelKey: 'onboarding_fund_wallet.more_ways_option_pix',
    descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
    iconName: IconName.Coin,
    section: 'regional',
  },
  {
    id: 'ideal',
    labelKey: 'onboarding_fund_wallet.more_ways_option_ideal',
    descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
    iconName: IconName.BankAssured,
    section: 'regional',
  },
];

export const MORE_WAYS_TO_FUND_SECTIONS: {
  id: MoreWaysToFundSectionId;
  titleKey: string;
}[] = [
  {
    id: 'digital_wallets',
    titleKey: 'onboarding_fund_wallet.more_ways_section_digital_wallets',
  },
  {
    id: 'regional',
    titleKey: 'onboarding_fund_wallet.more_ways_section_regional',
  },
];

export const getMoreWaysToFundOptionById = (
  id: MoreWaysToFundOptionId,
): MoreWaysToFundOption =>
  MORE_WAYS_TO_FUND_OPTIONS.find((option) => option.id === id) ??
  MORE_WAYS_TO_FUND_OPTIONS[0];
