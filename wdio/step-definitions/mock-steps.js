import { Given, Then } from '@wdio/cucumber-framework';
const mockttp = require('mockttp');

Given(/^Mock server is started with mock Gas API Down$/, async () => {
    const https = await mockttp.generateCACertificate();
    const mockServer = mockttp.getLocal({ https, cors: true });
    await mockServer.start(8000);
    await mockServer
    .forGet(
        'https://gas-api.metaswap.codefi.network/networks/1/suggestedGasFees',
      )
    .always()
    .thenCallback(() => {
        return {
          statusCode: 500,
          json: {
          }
        };
    });
});


Then(/^Mock server is stopped$/, async () => {
    this.server.stop();
});