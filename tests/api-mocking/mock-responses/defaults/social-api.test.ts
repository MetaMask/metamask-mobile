import { FEED_CAIP2_CHAINS } from '../../../../app/components/UI/SocialFeed/data/feed-constants';
import { SOCIAL_API_MOCKS } from './social-api';

describe('SOCIAL_API_MOCKS', () => {
  it('mocks the supported networks list', () => {
    const supportedNetworksMock = SOCIAL_API_MOCKS.GET?.find(
      (mock) =>
        mock.urlEndpoint instanceof RegExp &&
        mock.urlEndpoint.test(
          'https://social.api.cx.metamask.io/api/v1/supportedNetworks',
        ),
    );

    expect(supportedNetworksMock).toEqual(
      expect.objectContaining({
        responseCode: 200,
        response: {
          fullSupport: [...FEED_CAIP2_CHAINS],
          partialSupport: [],
        },
      }),
    );
  });

  it('mocks empty open-position PnL for a wallet asset', () => {
    const openPositionMock = SOCIAL_API_MOCKS.GET?.find(
      (mock) =>
        mock.urlEndpoint instanceof RegExp &&
        mock.urlEndpoint.test(
          'https://social.api.cx.metamask.io/api/v2/traders/0xabc/eip155%3A1%2Ferc20%3A0xdef/open',
        ),
    );

    expect(openPositionMock).toEqual(
      expect.objectContaining({
        responseCode: 200,
        response: {
          positionAmount: 0,
          isOpen: false,
          boughtUsd: 0,
          soldUsd: 0,
          realizedPnl: 0,
          costBasis: 0,
          currentValueUSD: null,
          pnlValueUsd: null,
          pnlPercent: null,
          pnlStatus: 'in-progress',
        },
      }),
    );
  });

  it('keeps the list open-position route separate from the asset route', () => {
    const listOpenPositionMocks = (SOCIAL_API_MOCKS.GET ?? []).filter(
      (mock) =>
        mock.urlEndpoint instanceof RegExp &&
        mock.urlEndpoint.test(
          'https://social.api.cx.metamask.io/api/v2/traders/0xabc/positions/open',
        ),
    );

    expect(listOpenPositionMocks).toHaveLength(1);
    expect(listOpenPositionMocks[0]?.response).toEqual({ positions: [] });
  });
});
