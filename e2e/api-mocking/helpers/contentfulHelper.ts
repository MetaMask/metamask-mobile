import { Mockttp } from 'mockttp';
import contentfulPromotionalBanners from '../mock-responses/contentful-promotional-banners.json';
import { setupMockRequest } from './mockHelpers';

/**
 * Sets up Contentful promotional banners mock with higher priority than notification mocks
 * @param {Mockttp} mockServer - The mock server instance
 */
export const setupContentfulPromotionalBannersMock = async (
  mockServer: Mockttp,
): Promise<void> => {
  // Pattern 1: Standard Contentful URL with content_type=promotionalBanner
  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: /https:\/\/cdn\.contentful\.com.*content_type=promotionalBanner/,
      response: contentfulPromotionalBanners,
      responseCode: 200,
    },
    10000, // Higher priority than notification mock
  );

  // Pattern 2: Alternative URL structure
  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: /contentful\.com.*promotionalBanner/,
      response: contentfulPromotionalBanners,
      responseCode: 200,
    },
    10000,
  );

  // Pattern 3: Catch any Contentful request that includes showInMobile
  await setupMockRequest(
    mockServer,
    {
      requestMethod: 'GET',
      url: /contentful\.com.*showInMobile.*true/,
      response: contentfulPromotionalBanners,
      responseCode: 200,
    },
    10000,
  );
};
