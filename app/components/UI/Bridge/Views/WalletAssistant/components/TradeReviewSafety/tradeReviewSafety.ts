export enum TradeReviewSafetySeverity {
  Info = 'info',
  Warning = 'warning',
  Danger = 'danger',
}

export enum TradeReviewSecurityStatus {
  Safe = 'safe',
  Warning = 'warning',
  Blocked = 'blocked',
  Unavailable = 'unavailable',
  Unchecked = 'unchecked',
}

export enum TradeReviewMode {
  Real = 'real',
}

export interface EstimatedNetworkFee {
  /**
   * A display-ready fee produced by the quote formatter, for example "$1.24".
   */
  formatted: string;
  /**
   * The quote provider or wallet determines whether the fee is unusually high.
   */
  isHigh?: boolean;
}

export interface TradeReviewSafetyMetadata {
  /**
   * Absolute price impact expressed in percentage points. Pass 6 for 6%.
   */
  priceImpactPercent?: number;
  estimatedNetworkFee?: EstimatedNetworkFee;
  quoteExpiresAt?: number;
  isQuoteStale?: boolean;
  securityStatus?: TradeReviewSecurityStatus;
  mode: TradeReviewMode;
  /**
   * Injectable clock for deterministic consumers and tests.
   */
  now?: number;
}

export interface TradeReviewSafetyNotice {
  severity: TradeReviewSafetySeverity;
  title: string;
  description: string;
  requiresFreshQuote: boolean;
  securityCheckRequired: boolean;
}

const PRICE_IMPACT_WARNING_PERCENT = 5;
const PRICE_IMPACT_DANGER_PERCENT = 25;
const EXPIRING_SOON_MS = 15_000;

const METAMASK_REVIEW_COPY =
  'Review the final amounts, fees, and security details in MetaMask before you confirm.';

const isFiniteNumber = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value);

/**
 * Produces one concise, highest-priority notice for a wallet-assistant quote.
 *
 * This does not decide whether a transaction can be submitted. The existing
 * MetaMask review and confirmation flow remains the authority for real trades.
 */
export const getTradeReviewSafetyNotice = ({
  priceImpactPercent,
  estimatedNetworkFee,
  quoteExpiresAt,
  isQuoteStale = false,
  securityStatus = TradeReviewSecurityStatus.Unchecked,
  mode,
  now = Date.now(),
}: TradeReviewSafetyMetadata): TradeReviewSafetyNotice => {
  if (securityStatus === TradeReviewSecurityStatus.Blocked) {
    return {
      severity: TradeReviewSafetySeverity.Danger,
      title: 'Security warning',
      description: `This trade was flagged by security checks. ${METAMASK_REVIEW_COPY}`,
      requiresFreshQuote: false,
      securityCheckRequired: true,
    };
  }

  const isExpired =
    isFiniteNumber(quoteExpiresAt) && quoteExpiresAt <= Math.max(0, now);

  if (isQuoteStale || isExpired) {
    return {
      severity: TradeReviewSafetySeverity.Danger,
      title: 'Quote expired',
      description:
        'Refresh this quote before continuing. MetaMask will ask you to review and confirm the new quote.',
      requiresFreshQuote: true,
      securityCheckRequired: false,
    };
  }

  if (
    isFiniteNumber(priceImpactPercent) &&
    Math.abs(priceImpactPercent) >= PRICE_IMPACT_DANGER_PERCENT
  ) {
    return {
      severity: TradeReviewSafetySeverity.Danger,
      title: 'Very high price impact',
      description: `${Math.abs(priceImpactPercent).toFixed(
        1,
      )}% price impact may result in a much worse rate. ${METAMASK_REVIEW_COPY}`,
      requiresFreshQuote: false,
      securityCheckRequired: false,
    };
  }

  if (
    securityStatus === TradeReviewSecurityStatus.Warning ||
    securityStatus === TradeReviewSecurityStatus.Unavailable ||
    securityStatus === TradeReviewSecurityStatus.Unchecked
  ) {
    const description =
      securityStatus === TradeReviewSecurityStatus.Warning
        ? `Security checks found a potential risk. ${METAMASK_REVIEW_COPY}`
        : `Security checks are not available for this quote. ${METAMASK_REVIEW_COPY}`;

    return {
      severity: TradeReviewSafetySeverity.Warning,
      title:
        securityStatus === TradeReviewSecurityStatus.Warning
          ? 'Review security warning'
          : 'Security check unavailable',
      description,
      requiresFreshQuote: false,
      securityCheckRequired: true,
    };
  }

  if (
    isFiniteNumber(priceImpactPercent) &&
    Math.abs(priceImpactPercent) >= PRICE_IMPACT_WARNING_PERCENT
  ) {
    return {
      severity: TradeReviewSafetySeverity.Warning,
      title: 'High price impact',
      description: `${Math.abs(priceImpactPercent).toFixed(
        1,
      )}% price impact may affect how much you receive. ${METAMASK_REVIEW_COPY}`,
      requiresFreshQuote: false,
      securityCheckRequired: false,
    };
  }

  const expiresSoon =
    isFiniteNumber(quoteExpiresAt) &&
    quoteExpiresAt > now &&
    quoteExpiresAt - now <= EXPIRING_SOON_MS;

  if (expiresSoon) {
    return {
      severity: TradeReviewSafetySeverity.Warning,
      title: 'Quote expiring soon',
      description:
        'The rate may refresh before you finish. Review the latest quote in MetaMask before you confirm.',
      requiresFreshQuote: false,
      securityCheckRequired: false,
    };
  }

  if (estimatedNetworkFee?.isHigh) {
    return {
      severity: TradeReviewSafetySeverity.Warning,
      title: 'High network fee',
      description: `The estimated network fee is ${estimatedNetworkFee.formatted}. ${METAMASK_REVIEW_COPY}`,
      requiresFreshQuote: false,
      securityCheckRequired: false,
    };
  }

  const feeCopy = estimatedNetworkFee?.formatted
    ? ` The current network fee estimate is ${estimatedNetworkFee.formatted}.`
    : '';

  return {
    severity: TradeReviewSafetySeverity.Info,
    title: 'Review in MetaMask',
    description: `The assistant prepared this quote.${feeCopy} ${METAMASK_REVIEW_COPY}`,
    requiresFreshQuote: false,
    securityCheckRequired: false,
  };
};
