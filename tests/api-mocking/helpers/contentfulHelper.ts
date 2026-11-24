import { Mockttp } from 'mockttp';
import contentfulPromotionalBanners from '../mock-responses/contentful-promotional-banners.json';
import { contentfulBanners } from '../api-mocks.ts';
import type { ContentfulBannersResponse } from '../api-response-types.ts';

/**
 * Sets up Contentful promotional banners mock with higher priority than notification mocks
 * @param {Mockttp} mockServer - The mock server instance
 */
export const setupContentfulPromotionalBannersMock = async (
  mockServer: Mockttp,
): Promise<void> => {
  await contentfulBanners.register(
    mockServer,
    // The fixture is a trimmed capture: its assets lack the SDK-required
    // `metadata`, which the carousel never reads.
    () => contentfulPromotionalBanners as unknown as ContentfulBannersResponse,
    undefined,
    { priority: 10000 }, // Higher priority than notification mock
  );
};
