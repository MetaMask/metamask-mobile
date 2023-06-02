import { Given, Then } from '@wdio/cucumber-framework';
const mockttp = require('mockttp');

Given(/^Mock server is started with mock Gas API Down$/, async function () {
    const https = await mockttp.generateCACertificate();
    this.mockServer = mockttp.getLocal({ https, cors: true });
    await this.mockServer.start(8000);
    await this.mockServer
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

Then(/^Mock server is stopped$/, async function () {
    await this.server.stop();
});