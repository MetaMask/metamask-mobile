// eslint-disable-next-line import-x/no-extraneous-dependencies
import nock from 'nock';
import { installDefaultApiMocks } from './defaults';
import { disableNetConnect, teardownNock } from './nockHelpers';

describe('installDefaultApiMocks', () => {
  afterEach(() => {
    teardownNock();
  });

  it('answers common secondary requests with empty payloads', async () => {
    disableNetConnect();
    installDefaultApiMocks();

    const assets = await (
      await fetch('https://token.api.cx.metamask.io/assets?assetIds=eip155:1/x')
    ).json();
    expect(assets).toEqual([]);

    const spotPrices = await (
      await fetch('https://price.api.cx.metamask.io/v3/spot-prices?assetIds=x')
    ).json();
    expect(spotPrices).toEqual({});

    const transactions = await (
      await fetch(
        'https://accounts.api.cx.metamask.io/v5/multiaccount/transactions?accountIds=x',
      )
    ).json();
    expect(transactions.data).toEqual([]);

    const icon = await fetch(
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
      { method: 'HEAD' },
    );
    expect(icon.status).toBe(200);
  });

  it('lets feature mocks registered before an install win over the defaults', async () => {
    disableNetConnect();
    nock('https://token.api.cx.metamask.io')
      .get('/v3/tokens/trending')
      .query(true)
      .reply(200, [{ symbol: 'FEATURE' }])
      .persist();

    installDefaultApiMocks();
    nock('https://token.api.cx.metamask.io')
      .get('/assets')
      .query(true)
      .reply(200, [{ symbol: 'FEATURE' }])
      .persist();
    installDefaultApiMocks();

    const trending = await (
      await fetch(
        'https://token.api.cx.metamask.io/v3/tokens/trending?chainIds=eip155:1',
      )
    ).json();
    expect(trending).toEqual([{ symbol: 'FEATURE' }]);

    const assets = await (
      await fetch('https://token.api.cx.metamask.io/assets?assetIds=x')
    ).json();
    expect(assets).toEqual([{ symbol: 'FEATURE' }]);
  });
});
