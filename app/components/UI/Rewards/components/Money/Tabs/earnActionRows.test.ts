import { IconName } from '@metamask/design-system-react-native';
import { REFERRAL_LOCALIZED_TEXT } from '../../../../../../../tests/component-view/presets/rewardsMoney';
import { earnActionRows } from './earnActionRows';

const BOTH = { socialRewards: true, tradingRebates: true };
const COPY_TRADING_ONLY = { socialRewards: true, tradingRebates: false };

const keys = (rows: ReturnType<typeof earnActionRows>): string[] =>
  rows.map((row) => row.key);

describe('earnActionRows', () => {
  it('gives a referrer Refer friends then Post trades', () => {
    const rows = earnActionRows(
      'referrer',
      REFERRAL_LOCALIZED_TEXT,
      BOTH,
      true,
    );

    expect(keys(rows)).toEqual(['referrals', 'social']);
    expect(rows[0]).toEqual({
      key: 'referrals',
      iconName: IconName.UserCircleAdd,
      title: REFERRAL_LOCALIZED_TEXT.referFriends,
      description: REFERRAL_LOCALIZED_TEXT.earnEligibleFees,
    });
    expect(rows[1]).toEqual({
      key: 'social',
      iconName: IconName.People,
      title: REFERRAL_LOCALIZED_TEXT.postTrades,
      description: REFERRAL_LOCALIZED_TEXT.copyTradingInfoDescription,
    });
  });

  it('gives a referee with trading rebates Trade and earn then Post trades', () => {
    const rows = earnActionRows('referee', REFERRAL_LOCALIZED_TEXT, BOTH, true);

    expect(keys(rows)).toEqual(['trading', 'social']);
    expect(rows[0]).toEqual({
      key: 'trading',
      iconName: IconName.SwapVertical,
      title: REFERRAL_LOCALIZED_TEXT.tradeAndEarn,
      description: REFERRAL_LOCALIZED_TEXT.invitedBenefitTitle,
    });
  });

  it('leaves out Trade and earn when the referee has no trading rebates', () => {
    expect(
      keys(
        earnActionRows(
          'referee',
          REFERRAL_LOCALIZED_TEXT,
          COPY_TRADING_ONLY,
          true,
        ),
      ),
    ).toEqual(['social']);
  });

  it('gives a plain user only Post trades', () => {
    expect(
      keys(earnActionRows('plain', REFERRAL_LOCALIZED_TEXT, BOTH, true)),
    ).toEqual(['social']);
  });

  it.each(['referrer', 'referee', 'plain'] as const)(
    'drops Post trades for a %s while Social V1 is off',
    (persona) => {
      const rows = earnActionRows(
        persona,
        REFERRAL_LOCALIZED_TEXT,
        BOTH,
        false,
      );

      expect(keys(rows)).not.toContain('social');
    },
  );

  it('returns no rows for a plain user while Social V1 is off', () => {
    expect(
      earnActionRows('plain', REFERRAL_LOCALIZED_TEXT, BOTH, false),
    ).toEqual([]);
  });
});
