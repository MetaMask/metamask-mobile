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
});
