import type { FungibleAssetPrice } from '@metamask/assets-controller';

import { strings } from '../../../../../../locales/i18n';
import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';
import { formatCompactFiat } from '../../utils/statBarFormat';

export const NEAR_GRADUATION_THRESHOLD = 90;

export const PRIMARY_FILL_MAX_PERCENT = 25;

const USD_CURRENCY_CODE = 'usd';

const GRADUATION_TARGET_USD_BY_LAUNCHPAD: Record<string, number> = {
  pumpfun: 69000,
  fourmeme: 48000,
  bonk: 30000,
};

const DEFAULT_GRADUATION_TARGET_USD = 69000;

export type GraduationStage = 'created' | 'bonding';

export type GraduationFillColorKey = 'primary' | 'success' | 'warning';

export type GraduationPercentSource = number | string | null | undefined;

export interface GraduationProgressViewModel {
  stage: GraduationStage;
  percent: number;
  percentLabel: string;
  isNearGraduation: boolean;
  fillColorKey: GraduationFillColorKey;
  stageLabel: string;
  detailLabel: string;
  accessibilityLabel: string;
}

export interface GraduationProgressInput {
  launchpadData: TokenAssetLaunchpadData | null;
  launchpad: string | null;
  marketData: FungibleAssetPrice | null;
  currentCurrency: string | undefined;
}

export const parseGraduationPercent = (
  source: GraduationPercentSource,
): number | null => {
  if (source === null || source === undefined) {
    return null;
  }
  const raw = typeof source === 'string' ? source.trim() : source;
  if (raw === '') {
    return null;
  }
  const parsed = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(100, Math.max(0, parsed));
};

export const formatGraduationPercentLabel = (percent: number): string => {
  'worklet';
  if (percent !== Math.floor(percent)) {
    return `${percent.toFixed(1)}%`;
  }
  return `${Math.floor(percent)}%`;
};

const isFreshLaunchStage = (stage: string | null): boolean =>
  stage === 'created' || stage === 'new';

export const isGraduationProgressVisible = (
  launchpadData: TokenAssetLaunchpadData | null,
): boolean => {
  if (launchpadData === null || launchpadData === undefined) {
    return false;
  }
  const percent = parseGraduationPercent(
    launchpadData.graduationPercent as GraduationPercentSource,
  );
  if (percent === null) {
    return false;
  }
  const stage = launchpadData.graduationStage;
  return isFreshLaunchStage(stage) || (stage === 'bonding' && percent < 100);
};

const getUsdToSelectedCurrencyRate = (
  marketData: FungibleAssetPrice | null,
): number | null => {
  if (marketData === null || marketData === undefined) {
    return null;
  }
  const { price, usdPrice } = marketData;
  if (!Number.isFinite(price) || !Number.isFinite(usdPrice) || usdPrice <= 0) {
    return null;
  }
  return price / usdPrice;
};

const resolveGraduationTargetUsd = (launchpad: string | null): number =>
  GRADUATION_TARGET_USD_BY_LAUNCHPAD[launchpad?.toLowerCase() as string] ??
  DEFAULT_GRADUATION_TARGET_USD;

const buildDetailLabel = ({
  stage,
  percent,
  percentLabel,
  launchpad,
  marketData,
  currentCurrency,
}: {
  stage: GraduationStage;
  percent: number;
  percentLabel: string;
  launchpad: string | null;
  marketData: FungibleAssetPrice | null;
  currentCurrency: string | undefined;
}): string => {
  const isUsdCurrency = currentCurrency?.toLowerCase() === USD_CURRENCY_CODE;
  const rate =
    getUsdToSelectedCurrencyRate(marketData) ?? (isUsdCurrency ? 1 : null);
  const toGraduationPercentLabel = strings(
    'token_details_v1.graduation.to_graduation',
    { amount: percentLabel },
  );
  if (stage !== 'bonding' || rate === null) {
    return toGraduationPercentLabel;
  }
  const targetInCurrency = resolveGraduationTargetUsd(launchpad) * rate;
  const currencyCode = currentCurrency ?? USD_CURRENCY_CODE;
  const raised = formatCompactFiat(
    (targetInCurrency * percent) / 100,
    currencyCode,
  );
  const toGraduation = formatCompactFiat(
    (targetInCurrency * (100 - percent)) / 100,
    currencyCode,
  );
  if (raised === null || toGraduation === null) {
    return toGraduationPercentLabel;
  }
  return `${strings('token_details_v1.graduation.raised', {
    amount: raised,
  })} · ${strings('token_details_v1.graduation.to_graduation', {
    amount: toGraduation,
  })}`;
};

const getFillColorKey = (percent: number): GraduationFillColorKey => {
  if (percent < PRIMARY_FILL_MAX_PERCENT) {
    return 'primary';
  }
  if (percent < NEAR_GRADUATION_THRESHOLD) {
    return 'success';
  }
  return 'warning';
};

export const getGraduationProgressViewModel = ({
  launchpadData,
  launchpad,
  marketData,
  currentCurrency,
}: GraduationProgressInput): GraduationProgressViewModel | null => {
  if (!isGraduationProgressVisible(launchpadData)) {
    return null;
  }
  const percent =
    parseGraduationPercent(
      launchpadData?.graduationPercent as GraduationPercentSource,
    ) ?? 0;
  const stage: GraduationStage =
    launchpadData?.graduationStage === 'bonding' ? 'bonding' : 'created';
  const percentLabel = formatGraduationPercentLabel(percent);
  const stageLabel = strings(
    stage === 'bonding'
      ? 'token_details_v1.graduation.stage.bonding'
      : 'token_details_v1.graduation.stage.new',
  );
  const detailLabel = buildDetailLabel({
    stage,
    percent,
    percentLabel,
    launchpad,
    marketData,
    currentCurrency,
  });
  const isNearGraduation = percent >= NEAR_GRADUATION_THRESHOLD;
  const accessibilityLabel = [
    strings('token_details_v1.graduation.progress'),
    stageLabel,
    detailLabel,
  ].join('. ');
  return {
    stage,
    percent,
    percentLabel,
    isNearGraduation,
    fillColorKey: getFillColorKey(percent),
    stageLabel,
    detailLabel,
    accessibilityLabel,
  };
};
