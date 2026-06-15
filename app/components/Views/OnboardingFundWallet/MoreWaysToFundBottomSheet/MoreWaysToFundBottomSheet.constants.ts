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
}

export interface MoreWaysToFundSection {
  id: MoreWaysToFundSectionId;
  titleKey: string;
  options: MoreWaysToFundOption[];
}

/** PayPal is selected from the main fund-wallet row; kept for label lookup only. */
export const MORE_WAYS_TO_FUND_PAYPAL_OPTION: MoreWaysToFundOption = {
  id: 'paypal',
  labelKey: 'onboarding_fund_wallet.more_ways_option_paypal',
  descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
  iconName: IconName.Coin,
};

export const MORE_WAYS_TO_FUND_DIGITAL_WALLET_OPTIONS: MoreWaysToFundOption[] =
  [
    {
      id: 'revolut_pay',
      labelKey: 'onboarding_fund_wallet.more_ways_option_revolut_pay',
      descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
      iconName: IconName.Card,
    },
    {
      id: 'google_pay',
      labelKey: 'onboarding_fund_wallet.more_ways_option_google_pay',
      descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
      iconName: IconName.AddCard,
    },
    {
      id: 'venmo',
      labelKey: 'onboarding_fund_wallet.more_ways_option_venmo',
      descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
      iconName: IconName.Coin,
    },
  ];

export const MORE_WAYS_TO_FUND_REGIONAL_OPTIONS: MoreWaysToFundOption[] = [
  {
    id: 'upi',
    labelKey: 'onboarding_fund_wallet.more_ways_option_upi',
    descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
    iconName: IconName.Bank,
  },
  {
    id: 'pix',
    labelKey: 'onboarding_fund_wallet.more_ways_option_pix',
    descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
    iconName: IconName.Coin,
  },
  {
    id: 'ideal',
    labelKey: 'onboarding_fund_wallet.more_ways_option_ideal',
    descriptionKey: 'onboarding_fund_wallet.more_ways_option_instant_limit',
    iconName: IconName.BankAssured,
  },
];

export const MORE_WAYS_TO_FUND_SECTIONS: MoreWaysToFundSection[] = [
  {
    id: 'digital_wallets',
    titleKey: 'onboarding_fund_wallet.more_ways_section_digital_wallets',
    options: MORE_WAYS_TO_FUND_DIGITAL_WALLET_OPTIONS,
  },
  {
    id: 'regional',
    titleKey: 'onboarding_fund_wallet.more_ways_section_regional',
    options: MORE_WAYS_TO_FUND_REGIONAL_OPTIONS,
  },
];

export const MORE_WAYS_TO_FUND_OPTIONS: MoreWaysToFundOption[] = [
  MORE_WAYS_TO_FUND_PAYPAL_OPTION,
  ...MORE_WAYS_TO_FUND_DIGITAL_WALLET_OPTIONS,
  ...MORE_WAYS_TO_FUND_REGIONAL_OPTIONS,
];

export const getMoreWaysToFundOptionById = (
  id: MoreWaysToFundOptionId,
): MoreWaysToFundOption =>
  MORE_WAYS_TO_FUND_OPTIONS.find((option) => option.id === id) ??
  MORE_WAYS_TO_FUND_OPTIONS[0];
