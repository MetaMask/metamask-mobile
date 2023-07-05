const nock = require('nock');

export const gasApiDown = () => {
  const mockServer = nock(new URL('https://gas-api.metaswap.codefi.network'))
    .persist()
    .get('/networks/1/suggestedGasFees')
    .reply(500);
  return mockServer;
};

export const cleanAllMocks = () => {
  nock.cleanAll();
};
