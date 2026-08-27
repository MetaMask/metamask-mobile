import { strings } from '../../../../../../locales/i18n';
import type { FeedSubHeader } from '../types';

/** Flat string for accessibility labels and test assertions. */
export function formatFeedSubHeader(subHeader: FeedSubHeader): string {
  if (!subHeader.sizeLabel) {
    return '';
  }
  if (!subHeader.contextValueLabel) {
    return subHeader.sizeLabel;
  }
  if (subHeader.contextKind === 'marketCap') {
    return strings('social_leaderboard.feed.sub_header.size_at_market_cap', {
      size: subHeader.sizeLabel,
      marketCap: subHeader.contextValueLabel,
      abbreviation: strings(
        'social_leaderboard.feed.sub_header.market_cap_suffix',
      ),
    });
  }
  return strings('social_leaderboard.feed.sub_header.size_at_price', {
    size: subHeader.sizeLabel,
    price: subHeader.contextValueLabel,
  });
}
