import { TextColor } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { WhatsHappeningItem } from '../types';

export const getImpactLabel = (
  impact: WhatsHappeningItem['impact'],
): string => {
  switch (impact) {
    case 'positive':
      return strings('homepage.sections.whats_happening_impact.bullish');
    case 'negative':
      return strings('homepage.sections.whats_happening_impact.bearish');
    default:
      return strings('homepage.sections.whats_happening_impact.neutral');
  }
};

/** Returns just the background colour class for the impact badge. */
export const getImpactBackgroundClass = (
  impact: WhatsHappeningItem['impact'],
): string => {
  switch (impact) {
    case 'positive':
      return 'bg-success-muted';
    case 'negative':
      return 'bg-error-muted';
    default:
      return 'bg-muted';
  }
};

/** Returns the text colour token for the impact badge. */
export const getImpactTextColor = (
  impact: WhatsHappeningItem['impact'],
): TextColor => {
  switch (impact) {
    case 'positive':
      return TextColor.SuccessDefault;
    case 'negative':
      return TextColor.ErrorDefault;
    default:
      return TextColor.TextAlternative;
  }
};
