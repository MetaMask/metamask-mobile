import type { SubscriptionBenefitsState } from '@metamask/subscription-controller';
import Routes from '../../../../../constants/navigation/Routes';
import {
  MICRO_USD_PER_USD,
  mapPlusBenefitsToTradeAllowances,
} from './mapPlusBenefitsToTradeAllowances';
import type { TradeAllowanceKind } from '../../ProHub.constants';

export type PlusBenefitDetailId =
  | 'swaps'
  | 'perps'
  | 'predict'
  | 'earn'
  | 'card'
  | 'transaction_protection'
  | 'priority_support';

export enum PlusBenefitDetailStatus {
  Available = 'available',
  Exhausted = 'exhausted',
  Unavailable = 'unavailable',
  NotIncluded = 'not_included',
}

export interface PlusEntitlementFlags {
  swapFeeWaiver: boolean;
  perpsFeeWaiver: boolean;
  predictFreeTx: boolean;
  premiumApy: boolean;
}

export interface ShieldEntitlementFlags {
  shieldClaim: boolean;
  prioritySupport: boolean;
}

export interface PlusBenefitDetail {
  id: PlusBenefitDetailId;
  titleKey: string;
  status: PlusBenefitDetailStatus;
  kind?: TradeAllowanceKind;
  used?: number;
  remaining?: number;
  allowance?: number;
  feePercent?: string;
  apyPercentFormatted?: string;
  resetsOn?: string;
  ctaRoute?: PlusBenefitCtaRoute;
  ctaLabelKey?: string;
  learnMoreUrl?: string;
  showRetry: boolean;
}

export interface MapPlusBenefitToDetailInput {
  id: PlusBenefitDetailId;
  benefits: SubscriptionBenefitsState | undefined;
  benefitsFailed: boolean;
  plusEntitlements: PlusEntitlementFlags;
  shieldEntitlements: ShieldEntitlementFlags;
  resetsOn: string | undefined;
  apyPercentFormatted: string | undefined;
}

const TITLE_KEYS: Record<PlusBenefitDetailId, string> = {
  swaps: 'pro_hub.member_pricing.swaps.label',
  perps: 'pro_hub.member_pricing.perps.label',
  predict: 'pro_hub.member_pricing.predict.label',
  earn: 'pro_hub.money_balance',
  card: 'pro_hub.physical_card.title',
  transaction_protection: 'pro_hub.also_included.transaction_protection.title',
  priority_support: 'pro_hub.also_included.priority_support.title',
};

const CTA_ROUTES = {
  swaps: Routes.BRIDGE.ROOT,
  perps: Routes.PERPS.ROOT,
  predict: Routes.PREDICT.ROOT,
  earn: Routes.PRO_HUB.EARNED,
  card: Routes.CARD.ROOT,
} as const;

export type PlusBenefitCtaRoute = (typeof CTA_ROUTES)[keyof typeof CTA_ROUTES];

const CTA_LABEL_KEYS = {
  swaps: 'pro_hub.benefit_detail.cta.swaps',
  perps: 'pro_hub.benefit_detail.cta.perps',
  predict: 'pro_hub.benefit_detail.cta.predict',
  earn: 'pro_hub.benefit_detail.cta.earn',
  card: 'pro_hub.benefit_detail.cta.card',
} as const;

type PlusBenefitCtaId = keyof typeof CTA_ROUTES;

const PROTECTION_LEARN_MORE_URL = 'https://metamask.io';

const toUsd = (microUsd: number): number =>
  Math.round(microUsd / MICRO_USD_PER_USD);

const formatFeeBips = (feeBips: string | null): string | undefined => {
  if (feeBips === null || feeBips === '') {
    return undefined;
  }

  const bips = Number(feeBips);
  if (Number.isNaN(bips)) {
    return undefined;
  }

  return `${bips / 100}%`;
};

const notIncluded = (id: PlusBenefitDetailId): PlusBenefitDetail => ({
  id,
  titleKey: TITLE_KEYS[id],
  status: PlusBenefitDetailStatus.NotIncluded,
  showRetry: false,
});

const unavailable = (
  id: PlusBenefitCtaId,
  showRetry: boolean,
): PlusBenefitDetail => ({
  id,
  titleKey: TITLE_KEYS[id],
  status: PlusBenefitDetailStatus.Unavailable,
  showRetry,
  ctaRoute: CTA_ROUTES[id],
  ctaLabelKey: CTA_LABEL_KEYS[id],
});

const withCta = (
  detail: PlusBenefitDetail,
  id: PlusBenefitCtaId,
): PlusBenefitDetail => ({
  ...detail,
  ctaRoute: CTA_ROUTES[id],
  ctaLabelKey: CTA_LABEL_KEYS[id],
});

const mapMeteredBenefit = ({
  id,
  entitled,
  benefits,
  benefitsFailed,
  resetsOn,
}: {
  id: 'swaps' | 'perps' | 'predict';
  entitled: boolean;
  benefits: SubscriptionBenefitsState | undefined;
  benefitsFailed: boolean;
  resetsOn: string | undefined;
}): PlusBenefitDetail => {
  if (!entitled) {
    return notIncluded(id);
  }

  if (!benefits) {
    return unavailable(id, benefitsFailed);
  }

  const item = mapPlusBenefitsToTradeAllowances(benefits).find(
    (row) => row.id === id,
  );
  if (!item) {
    return unavailable(id, false);
  }

  const remainingRaw =
    id === 'predict'
      ? benefits.predict.remainingTxCount
      : id === 'swaps'
        ? benefits.swaps.remainingMicroUsd
        : benefits.perps.remainingMicroUsd;

  const remaining =
    remainingRaw === null
      ? Math.max(0, item.allowance - item.used)
      : id === 'predict'
        ? remainingRaw
        : toUsd(remainingRaw);

  const feePercent =
    id === 'swaps'
      ? formatFeeBips(benefits.swaps.feeBips)
      : id === 'perps'
        ? formatFeeBips(benefits.perps.builderFeeBips)
        : undefined;

  const remainingIsZero = remaining <= 0;
  const status =
    item.exhausted || remainingIsZero
      ? PlusBenefitDetailStatus.Exhausted
      : PlusBenefitDetailStatus.Available;

  return withCta(
    {
      id,
      titleKey: TITLE_KEYS[id],
      status,
      kind: item.kind,
      used: item.used,
      remaining,
      allowance: item.allowance,
      feePercent,
      resetsOn,
      showRetry: false,
    },
    id,
  );
};

/**
 * Builds the Pro Hub benefit-detail sheet model from controller entitlements
 * and persisted current-period usage.
 *
 * @param input - Entitlements, benefits snapshot, and display extras.
 * @returns A presentational detail model for the selected benefit.
 */
export const mapPlusBenefitToDetail = (
  input: MapPlusBenefitToDetailInput,
): PlusBenefitDetail => {
  const {
    id,
    benefits,
    benefitsFailed,
    plusEntitlements,
    shieldEntitlements,
    resetsOn,
    apyPercentFormatted,
  } = input;

  if (id === 'swaps' || id === 'perps' || id === 'predict') {
    const entitled =
      id === 'swaps'
        ? plusEntitlements.swapFeeWaiver
        : id === 'perps'
          ? plusEntitlements.perpsFeeWaiver
          : plusEntitlements.predictFreeTx;

    return mapMeteredBenefit({
      id,
      entitled,
      benefits,
      benefitsFailed,
      resetsOn,
    });
  }

  if (id === 'earn') {
    if (!plusEntitlements.premiumApy) {
      return notIncluded(id);
    }

    if (!apyPercentFormatted) {
      return unavailable(id, false);
    }

    return withCta(
      {
        id,
        titleKey: TITLE_KEYS[id],
        status: PlusBenefitDetailStatus.Available,
        apyPercentFormatted,
        showRetry: false,
      },
      id,
    );
  }

  if (id === 'card') {
    return withCta(
      {
        id,
        titleKey: TITLE_KEYS[id],
        status: PlusBenefitDetailStatus.Available,
        showRetry: false,
      },
      id,
    );
  }

  if (id === 'transaction_protection') {
    if (!shieldEntitlements.shieldClaim) {
      return notIncluded(id);
    }

    return {
      id,
      titleKey: TITLE_KEYS[id],
      status: PlusBenefitDetailStatus.Available,
      learnMoreUrl: PROTECTION_LEARN_MORE_URL,
      showRetry: false,
    };
  }

  if (!shieldEntitlements.prioritySupport) {
    return notIncluded(id);
  }

  return {
    id,
    titleKey: TITLE_KEYS[id],
    status: PlusBenefitDetailStatus.Available,
    showRetry: false,
  };
};
