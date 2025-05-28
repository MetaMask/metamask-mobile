import { upgradeSplashPageAcknowledgedForAccount } from '.';

describe('upgradeSplashPageAcknowledgedForAccount', () => {
  it('retype correct action details', async () => {
    const mockAddress = '0x123';
    expect(upgradeSplashPageAcknowledgedForAccount(mockAddress)).toStrictEqual({
      account: '0x123',
      type: 'UPGRADE_SPLASH_PAGE_ACKNOWLEDGED_FOR_ACCOUNT',
    });
  });
});
