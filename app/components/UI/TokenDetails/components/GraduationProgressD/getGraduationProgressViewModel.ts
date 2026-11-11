import type { TokenAssetLaunchpadData } from '../../queries/tokenAssetQuery';
import { formatCompactFiat } from '../../utils/statBarFormat';
import {
  ALMOST_GRADUATED_PERCENT,
  DEFAULT_GRADUATION_TARGET_USD,
  GRADUATION_TARGET_USD_BY_LAUNCHPAD,
} from './graduationProgress.constants';

export type GraduationProgressStage = 'created' | 'bonding';

export interface GraduationProgressViewModel {
  stage: GraduationProgressStage;
  percent: number;
  displayPercent: number;
  raisedLabel: string | null;
  remainingLabel: string;
  isAlmostGraduated: boolean;
}

const clampPercent = (value: number): number =>
  Math.min(100, Math.max(0, value));

const parsePercent = (raw: unknown): number | null => {
  if (raw == null) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return clampPercent(parsed);
};

export const getGraduationTargetUsd = (
  launchpad: string | null | undefined,
): number =>
  (launchpad != null && GRADUATION_TARGET_USD_BY_LAUNCHPAD[launchpad]) ||
  DEFAULT_GRADUATION_TARGET_USD;

export const getGraduationProgressViewModel = (
  launchpadData: TokenAssetLaunchpadData | null | undefined,
  launchpad: string | null | undefined,
): GraduationProgressViewModel | null => {
  if (launchpadData == null) {
    return null;
  }
  const percent = parsePercent(launchpadData.graduationPercent);
  if (percent == null) {
    return null;
  }
  const rawStage = launchpadData.graduationStage;
  if (rawStage !== 'created' && rawStage !== 'new' && rawStage !== 'bonding') {
    return null;
  }
  const stage: GraduationProgressStage =
    rawStage === 'bonding' ? 'bonding' : 'created';
  if (stage === 'bonding' && percent >= 100) {
    return null;
  }

  const targetUsd = getGraduationTargetUsd(launchpad);
  const raisedUsd = (percent / 100) * targetUsd;
  const remainingUsd = ((100 - percent) / 100) * targetUsd;

  return {
    stage,
    percent,
    displayPercent: Math.floor(percent),
    raisedLabel:
      stage === 'bonding' ? formatCompactFiat(raisedUsd, 'usd') : null,
    remainingLabel: formatCompactFiat(remainingUsd, 'usd') ?? '',
    isAlmostGraduated: percent >= ALMOST_GRADUATED_PERCENT,
  };
};
