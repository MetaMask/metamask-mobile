/**
 * Builds the card Intercom support URL with non-PII context query params.
 *
 * NOTE: Base URL and param names (`wallet`, `cardState`, `provider`,
 * `moneyAccount`) are placeholders pending confirmation from support/Intercom.
 * Do not attach PII (email, name, etc.).
 */
export interface CardSupportUrlContext {
  walletAddress?: string;
  cardState?: string;
  provider?: string;
  isMoneyAccount?: boolean;
}

export const buildCardSupportUrl = (
  baseUrl: string,
  {
    walletAddress,
    cardState,
    provider,
    isMoneyAccount,
  }: CardSupportUrlContext = {},
): string => {
  const params = new URLSearchParams();

  if (walletAddress) {
    params.set('wallet', walletAddress);
  }
  if (cardState) {
    params.set('cardState', cardState);
  }
  if (provider) {
    params.set('provider', provider);
  }
  if (isMoneyAccount !== undefined) {
    params.set('moneyAccount', String(isMoneyAccount));
  }

  const query = params.toString();
  if (!query) {
    return baseUrl;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${query}`;
};
