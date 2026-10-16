import { AutorampStatus } from '@metamask/ramps-controller';
import { findUsableAutorampForActivity } from './useNeobankAutorampActivity';

describe('findUsableAutorampForActivity', () => {
  const money = '0xMoneyAccount';
  const other = '0xOther';

  it('prefers an autoramp matching the Money Account wallet', () => {
    const matched = {
      id: 'ar-money',
      walletAddress: money,
      status: AutorampStatus.Approved,
    };
    const otherAr = {
      id: 'ar-other',
      walletAddress: other,
      status: AutorampStatus.Approved,
    };

    expect(
      findUsableAutorampForActivity(
        [otherAr, matched] as never,
        [money],
      )?.id,
    ).toBe('ar-money');
  });

  it('does not fall back to an unmatched autoramp (stale post-reset cursors)', () => {
    const stale = {
      id: 'ar-stale',
      walletAddress: other,
      status: AutorampStatus.Approved,
      updatedAt: 99,
    };

    expect(
      findUsableAutorampForActivity([stale] as never, [money]),
    ).toBeUndefined();
  });

  it('returns undefined when no wallet addresses are provided', () => {
    expect(
      findUsableAutorampForActivity(
        [
          {
            id: 'ar-1',
            walletAddress: money,
            status: AutorampStatus.Approved,
          },
        ] as never,
        [null, undefined, ''],
      ),
    ).toBeUndefined();
  });

  it('skips Rejected and Cancelled autoramps', () => {
    expect(
      findUsableAutorampForActivity(
        [
          {
            id: 'ar-rejected',
            walletAddress: money,
            status: AutorampStatus.Rejected,
          },
          {
            id: 'ar-cancelled',
            walletAddress: money,
            status: AutorampStatus.Cancelled,
          },
        ] as never,
        [money],
      ),
    ).toBeUndefined();
  });
});
