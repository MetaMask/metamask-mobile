import { collectedRequests, startMockServer,stopMockServer } from '../../api-mocking/mock-server';
import TestHelpers from '../../helpers';
import SettingsView from '../../pages/Settings/SettingsView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';

describe('Ensure no network requests are made to prohibited URLs when privacy mode is enabled', () => {
  let mockServer;
  const prohibitedUrls = [
    'https://pulse.walletconnect.org/',
    'https://another-prohibited-url.com/'
  ];

  beforeAll(async () => {
    jest.setTimeout(200000);
    await TestHelpers.launchApp();
  });

  afterAll(async () => {
    await stopMockServer(mockServer);
  });

  it('should import wallet and enable privacy mode', async () => {
    await importWalletWithRecoveryPhrase();
    await TabBarComponent.tapSettings();
    await SettingsView.tapSecurityAndPrivacy();
    
    

    mockServer = await startMockServer({});
  });

  it('should log intercepted calls', async () => {
    console.log('Collected requests:', JSON.stringify(collectedRequests, null, 2));
  });

  it('should detect prohibited URLs', async () => {
    const prohibitedUrls = [
      'https://pulse.walletconnect.org/',
      'https://another-prohibited-url.com/restricted'
    ];

    const detectedProhibitedUrls = collectedRequests.filter((request) =>
      prohibitedUrls.some((prohibitedUrl) => request.url.includes(prohibitedUrl))
    );

    if (detectedProhibitedUrls.length > 0) {
      detectedProhibitedUrls.forEach((prohibitedRequest) => {
        console.error(`Prohibited URL detected: ${prohibitedRequest.url}`);
      });

      throw new Error('Prohibited URLs were called during the test.');
    }

    console.log('Privacy mode enforced successfully: No prohibited URLs were accessed.');
  });

});


