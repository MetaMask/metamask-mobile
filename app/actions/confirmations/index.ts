export function upgradeSplashPageAcknowledgedForAccount(account: string) {
  return {
    type: 'UPGRADE_SPLASH_PAGE_ACKNOWLEDGED_FOR_ACCOUNT',
    account,
  };
}
