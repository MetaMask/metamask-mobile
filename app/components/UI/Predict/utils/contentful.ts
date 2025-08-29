import { createClient, type EntrySkeletonType } from 'contentful';
import {
  CONTENTFUL_ACCESS_TOKEN,
  CONTENTFUL_DEFAULT_DOMAIN,
  CONTENTFUL_ENVIRONMENT,
  CONTENTFUL_SPACE_ID,
} from '../constants/contentful';

export interface ContentfulPredictGeoBlockedRegion {
  region: string;
}

export type ContentfulPredictGeoBlockedRegionSkeleton =
  EntrySkeletonType<ContentfulPredictGeoBlockedRegion>;

const CONTENT_TYPE = 'predictGeoBlockedRegion';

export async function fetchGeoBlockedRegionsFromContentful(): Promise<
  ContentfulPredictGeoBlockedRegion[] | null
> {
  const spaceId = CONTENTFUL_SPACE_ID();
  const accessToken = CONTENTFUL_ACCESS_TOKEN();
  const environment = CONTENTFUL_ENVIRONMENT;
  const defaultDomain = CONTENTFUL_DEFAULT_DOMAIN;

  if (!spaceId || !accessToken) {
    console.warn(
      'Missing Contentful env variables: PREDICT_CONTENTFUL_SPACE_ID, PREDICT_CONTENTFUL_ACCESS_TOKEN.',
    );
    return [];
  }

  const host = `https://${defaultDomain}/spaces/${spaceId}/environments/${environment}/entries`;

  // First try through the Contentful Client
  try {
    const contentfulClient = createClient({
      space: spaceId,
      accessToken,
      environment,
      host,
    });

    const entries =
      await contentfulClient.getEntries<ContentfulPredictGeoBlockedRegionSkeleton>(
        {
          content_type: CONTENT_TYPE,
        },
      );
    return entries.items.map((entry) => entry.fields);
  } catch (err) {
    // If the Contentful SDK fails, fall back to a direct fetch
    console.warn('Contentful SDK failed, falling back to direct fetch', err);
  }

  // Otherwise fallback to URL fetch
  try {
    const url = new URL(`${host}`);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('content_type', CONTENT_TYPE);

    const response = await fetch(url.toString());
    const json = await response.json();
    return json.items;
  } catch (fallbackError) {
    console.warn(
      '[fetchGeoBlockedRegionsFromContentful] Fallback fetch failed, gracefully failing.',
      fallbackError,
    );
    return null;
  }
}
