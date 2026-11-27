import { IconName } from '@metamask/design-system-react-native';
import type { ReferralLocalizedText } from '../../../../../../core/Engine/controllers/rewards-money-controller/types';
import type {
  MoneyDashboardPersona,
  RefereeMoneySections,
} from '../../../../../../reducers/rewardsMoney/selectors';

export type EarnActionRowKey = 'referrals' | 'trading' | 'social';

/** One way to earn: an icon, a title and a line of copy. */
export interface EarnActionRow<Key extends string = EarnActionRowKey> {
  key: Key;
  iconName: IconName;
  title: string;
  description: string;
}

/**
 * The rows Next steps and Ways to earn share. Referrals and trading follow
 * the same persona and role rules as the Your earnings breakdown. Post trades
 * is not tied to a persona: every user sees it while Social V1 is on.
 */
export function earnActionRows(
  persona: MoneyDashboardPersona,
  localizedText: ReferralLocalizedText,
  sections: RefereeMoneySections,
  socialEnabled: boolean,
): EarnActionRow[] {
  const rows: EarnActionRow[] = [];

  if (persona === 'referrer') {
    rows.push({
      key: 'referrals',
      iconName: IconName.UserCircleAdd,
      title: localizedText.referFriends,
      description: localizedText.earnEligibleFees,
    });
  } else if (persona === 'referee' && sections.tradingRebates) {
    rows.push({
      key: 'trading',
      iconName: IconName.SwapVertical,
      title: localizedText.tradeAndEarn,
      description: localizedText.invitedBenefitTitle,
    });
  }

  if (socialEnabled) {
    rows.push({
      key: 'social',
      iconName: IconName.People,
      title: localizedText.postTrades,
      description: localizedText.copyTradingInfoDescription,
    });
  }

  return rows;
}
