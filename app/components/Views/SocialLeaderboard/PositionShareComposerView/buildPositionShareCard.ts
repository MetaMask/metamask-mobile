import type { Position } from '@metamask/social-controllers';
import { strings } from '../../../../../locales/i18n';
import type {
  ShareCardAuthor,
  ShareCardModel,
  ShareCardStat,
} from '../../../UI/ShareCard';
import { EM_DASH } from '../../../UI/SocialFeed/utils/formatters';
import {
  deriveAverageEntryPrice,
  deriveExitPrice,
} from '../../../UI/SocialFeed/utils/toSocialV1FeedItem';
import type { PositionSheetData } from '../PositionDetailsSheet/hooks/usePositionSheetData';

const DIRECTION_KEYS = {
  long: 'social_leaderboard.trader_position.long',
  short: 'social_leaderboard.trader_position.short',
} as const;

export type PositionShareCardSheetData = Pick<
  PositionSheetData,
  | 'isPerp'
  | 'isClosed'
  | 'symbol'
  | 'leverage'
  | 'perpDirection'
  | 'prices'
  | 'markers'
  | 'isMarketCapMode'
  | 'formatValue'
  | 'currentPrice'
  | 'summarySubtitle'
  | 'pnlPercentLabel'
  | 'pnlValueLabel'
  | 'isPnlPositive'
>;

export interface BuildPositionShareCardInput {
  position: Position;
  sheet: PositionShareCardSheetData;
  author: ShareCardAuthor;
  /** The sharer's Rewards referral code, when they have one. */
  referralCode?: string | null;
}

const formatStatValue = (
  value: number | null | undefined,
  formatValue: (price: number) => string,
): string => (value != null && value > 0 ? formatValue(value) : EM_DASH);

const buildStats = (
  position: Position,
  sheet: PositionShareCardSheetData,
): ShareCardStat[] => {
  const marketCapKey = sheet.isMarketCapMode ? '_market_cap' : '';
  const entry: ShareCardStat = {
    label: strings(`share_card.entry${marketCapKey}`),
    value: formatStatValue(
      deriveAverageEntryPrice(position),
      sheet.formatValue,
    ),
  };
  const closing: ShareCardStat = sheet.isClosed
    ? {
        label: strings(`share_card.exit${marketCapKey}`),
        value: formatStatValue(deriveExitPrice(position), sheet.formatValue),
      }
    : {
        label: strings(`share_card.current${marketCapKey}`),
        value: formatStatValue(sheet.currentPrice, sheet.formatValue),
      };
  return [entry, closing];
};

const buildMarketDetail = (
  sheet: PositionShareCardSheetData,
): string | undefined => {
  if (!sheet.isPerp) return undefined;
  const detail = [
    sheet.perpDirection
      ? strings(DIRECTION_KEYS[sheet.perpDirection])
      : undefined,
    sheet.leverage ? `${sheet.leverage}x` : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  return detail || undefined;
};

/**
 * Maps a social position onto the share card. The figures come from the same
 * hook as the position sheet, so the card matches what the user just saw.
 * Open positions mark only the entry; closed ones mark the exit too.
 */
export function buildPositionShareCard({
  position,
  sheet,
  author,
  referralCode,
}: BuildPositionShareCardInput): ShareCardModel {
  const entryMarker = sheet.markers.find((marker) => marker.intent === 'enter');
  const exitMarker = sheet.isClosed
    ? [...sheet.markers].reverse().find((marker) => marker.intent === 'exit')
    : undefined;

  return {
    direction: sheet.isPnlPositive ? 'up' : 'down',
    author,
    statusLabel: sheet.summarySubtitle,
    market: {
      symbol: sheet.symbol,
      imageUrl: position.tokenImageUrl ?? undefined,
      detail: buildMarketDetail(sheet),
    },
    primaryValue: sheet.pnlValueLabel,
    changeLabel: sheet.pnlPercentLabel.replace(/^[+-]/, ''),
    stats: buildStats(position, sheet),
    chart: {
      points: sheet.prices.map(([, price]) => price),
      entryIndex: entryMarker?.index,
      exitIndex: exitMarker?.index,
    },
    ...(referralCode
      ? {
          promoCode: referralCode,
          promoCaption: strings('share_card.referral_code'),
        }
      : {}),
  };
}
