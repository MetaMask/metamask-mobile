import { strings } from '../../../../../../locales/i18n';
import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';
import { formatCompactFiat } from '../../utils/statBarFormat';

export type GraduationProgressStage = 'created' | 'bonding';

export interface GraduationProgressViewModel {
  stage: GraduationProgressStage;
  percent: number;
  percentLabel: string;
  isNearGraduation: boolean;
  isLastBand: boolean;
  moneyRowLeadingLabel: string;
  moneyRowTrailingLabel: string;
  accessibilityLabel: string;
}

const GRADUATION_STAGE_CREATED = 'created';
// The launch API has been observed sending both spellings for a token that has
// not started bonding yet; treat them as the same stage.
const GRADUATION_FRESH_STAGES = ['created', 'new'];
const GRADUATION_STAGE_BONDING = 'bonding';

const FIAT_CURRENCY_CODE = 'usd';

const NEAR_GRADUATION_PERCENT = 90;
const LAST_BAND_START_PERCENT = 75;

const GRADUATION_TARGET_USD_BY_PROTOCOL: Record<string, number> = {
  pumpfun: 69_000,
  letsbonk: 30_000,
  fourmeme: 48_000,
};

const FALLBACK_GRADUATION_TARGET_USD = 69_000;

const parseGraduationPercent = (
  value: number | string | null | undefined,
): number | null => {
  if (value == null) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.min(100, Math.max(0, parsed));
};

export const isGraduationProgressVisible = (
  launchpadData: TokenAssetLaunchpadData | null | undefined,
): boolean => {
  if (launchpadData == null) {
    return false;
  }
  if (
    launchpadData.graduationStage != null &&
    GRADUATION_FRESH_STAGES.includes(launchpadData.graduationStage)
  ) {
    return true;
  }
  if (launchpadData.graduationStage === GRADUATION_STAGE_BONDING) {
    const percent = parseGraduationPercent(launchpadData.graduationPercent);
    return percent != null && percent < 100;
  }
  return false;
};

const normalizeLaunchpadProtocol = (protocol: string): string =>
  protocol.toLowerCase().replace(/[.\s_-]/g, '');

const getGraduationTargetUsd = (
  launchpadData: TokenAssetLaunchpadData,
): number => {
  const protocol = launchpadData.protocol;
  if (protocol == null) {
    return FALLBACK_GRADUATION_TARGET_USD;
  }
  return (
    GRADUATION_TARGET_USD_BY_PROTOCOL[normalizeLaunchpadProtocol(protocol)] ??
    FALLBACK_GRADUATION_TARGET_USD
  );
};

const formatUsd = (value: number): string => {
  const formatted = formatCompactFiat(value, FIAT_CURRENCY_CODE);
  return formatted ?? '$0';
};

export const getGraduationProgressViewModel = (
  launchpadData: TokenAssetLaunchpadData,
): GraduationProgressViewModel => {
  const stageValue = launchpadData.graduationStage;
  const isFreshStage =
    stageValue != null && GRADUATION_FRESH_STAGES.includes(stageValue);
  const stage: GraduationProgressStage = isFreshStage
    ? GRADUATION_STAGE_CREATED
    : GRADUATION_STAGE_BONDING;
  const percent = parseGraduationPercent(launchpadData.graduationPercent) ?? 0;
  const percentLabel = `${Math.round(percent)}`;

  const graduationTargetUsd = getGraduationTargetUsd(launchpadData);
  const raisedUsd = graduationTargetUsd * (percent / 100);
  const toGraduationUsd = graduationTargetUsd * (1 - percent / 100);
  const raisedLabel = formatUsd(raisedUsd);
  const toGraduationLabel = formatUsd(toGraduationUsd);

  if (stage === GRADUATION_STAGE_CREATED) {
    return {
      stage,
      percent,
      percentLabel,
      isNearGraduation: percent >= NEAR_GRADUATION_PERCENT,
      isLastBand: percent >= LAST_BAND_START_PERCENT,
      moneyRowLeadingLabel: `${percentLabel}%`,
      moneyRowTrailingLabel: ` ${strings(
        'token_details_v1.graduation.remaining_phrase',
      )}`,
      accessibilityLabel: strings(
        'token_details_v1.graduation.accessibility_created',
        { percent: percentLabel, remaining: toGraduationLabel },
      ),
    };
  }

  return {
    stage,
    percent,
    percentLabel,
    isNearGraduation: percent >= NEAR_GRADUATION_PERCENT,
    isLastBand: percent >= LAST_BAND_START_PERCENT,
    moneyRowLeadingLabel: strings('token_details_v1.graduation.bonded', {
      percent: percentLabel,
    }),
    moneyRowTrailingLabel: ` · ${strings('token_details_v1.graduation.raised', {
      amount: raisedLabel,
    })} · ${strings('token_details_v1.graduation.to_graduation', {
      amount: toGraduationLabel,
    })}`,
    accessibilityLabel: strings(
      'token_details_v1.graduation.accessibility_bonding',
      {
        percent: percentLabel,
        raised: raisedLabel,
        remaining: toGraduationLabel,
      },
    ),
  };
};
