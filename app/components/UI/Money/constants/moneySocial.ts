export type MoneySocialProvider = 'google' | 'apple' | 'telegram';

export const MONEY_SOCIAL_PROVIDER_CODES: Record<MoneySocialProvider, number> =
  {
    google: 1,
    apple: 2,
    telegram: 3,
  };

export const getMoneySocialProviderFromCode = (
  code: number,
): MoneySocialProvider => {
  if (code === MONEY_SOCIAL_PROVIDER_CODES.apple) {
    return 'apple';
  }
  if (code === MONEY_SOCIAL_PROVIDER_CODES.telegram) {
    return 'telegram';
  }
  return 'google';
};

export const MONEY_SOCIAL_DEMO_ACCOUNTS: Record<MoneySocialProvider, string> = {
  google: 'money.user@gmail.com',
  apple: 'Apple account',
  telegram: '@money_wallet',
};

export const MONEY_SOCIAL_PROVIDER_LABEL_KEYS: Record<
  MoneySocialProvider,
  string
> = {
  google: 'money.social.provider_google',
  apple: 'money.social.provider_apple',
  telegram: 'money.social.provider_telegram',
};
