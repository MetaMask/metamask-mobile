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

  it('lets feature mocks registered earlier win over the defaults', async () => {
    disableNetConnect();
    nock('https://token.api.cx.metamask.io')
      .get('/v3/tokens/trending')
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
  });

  it('moves the defaults behind feature mocks registered between installs', async () => {
    disableNetConnect();
    installDefaultApiMocks();
    nock('https://token.api.cx.metamask.io')
      .get('/assets')
      .query(true)
      .reply(200, [{ symbol: 'FEATURE' }])
      .persist();
    installDefaultApiMocks();

    const assets = await (
      await fetch('https://token.api.cx.metamask.io/assets?assetIds=x')
    ).json();
    expect(assets).toEqual([{ symbol: 'FEATURE' }]);
  });

  it('keeps recording requests that no default covers', async () => {
    disableNetConnect();
    installDefaultApiMocks();

    let caught: unknown = null;
    try {
      await fetch('https://unmocked-by-defaults.example.com/v1/thing');
    } catch (error) {
      caught = error;
    }
    expect((caught as Error)?.message).toContain('Disallowed net connect');
  });

  it('reinstalls the defaults after teardownNock clears them', async () => {
    disableNetConnect();
    installDefaultApiMocks();
    teardownNock();

    const assets = await (
      await fetch('https://token.api.cx.metamask.io/assets?assetIds=x')
    ).json();
    expect(assets).toEqual([]);
  });
});
