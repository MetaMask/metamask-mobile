import { createClient, type EntrySkeletonType } from 'contentful';
import { isProduction } from '../../../util/environment';
import { CarouselSlide } from './types';
import { ACCESS_TOKEN, SPACE_ID } from './constants';
import { hasMinimumRequiredVersion } from '../../../util/remoteFeatureFlag';
import { getContentPreviewToken } from '../../../actions/notification/helpers';

export interface ContentfulCarouselSlideFields {
  headline: string;
  teaser: string;
  image: string;
  linkUrl: string;
  undismissable: boolean;
  startDate?: string;
  endDate?: string;
  priorityPlacement?: boolean;
  cardPlacement?: number | string;
  variableName?: string;
}

export type ContentfulSlideSkeleton =
  EntrySkeletonType<ContentfulCarouselSlideFields>;

export const getContentfulEnvironmentDetails = () => {
  // If preview mode, then show preview prod master content
  const previewToken = getContentPreviewToken();
  if (previewToken) {
    return {
      environment: 'master',
      domain: 'preview.contentful.com',
      accessToken: previewToken,
      spaceId: SPACE_ID(),
    };
  }

  // If production, show prod master content
  if (isProduction()) {
    return {
      environment: 'master',
      domain: 'cdn.contentful.com',
      accessToken: ACCESS_TOKEN(),
      spaceId: SPACE_ID(),
    };
  }

  // If dev, show preview dev content
  if (!isProduction()) {
    return {
      environment: 'dev',
      domain: 'preview.contentful.com',
      accessToken: ACCESS_TOKEN(),
      spaceId: SPACE_ID(),
    };
  }
};

const CONTENT_TYPE = 'promotionalBanner';

interface ContentfulSysField {
  sys: { id: string };
}

export async function fetchCarouselSlidesFromContentful(): Promise<{
  prioritySlides: CarouselSlide[];
  regularSlides: CarouselSlide[];
}> {
  const { spaceId, accessToken, environment, domain } =
    getContentfulEnvironmentDetails() ?? {};

  if (!spaceId || !accessToken) {
    console.warn(
      'Missing Contentful env variables: FEATURES_ANNOUNCEMENTS_SPACE_ID, FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN.',
    );
    return { prioritySlides: [], regularSlides: [] };
  }

  const host = `https://${domain}/spaces/${spaceId}/environments/${environment}/entries`;

  // First try through the Contentful Client
  try {
    const contentfulClient = createClient({
      space: spaceId,
      accessToken,
      environment,
      host,
    });

    const entries = await contentfulClient.getEntries({
      content_type: CONTENT_TYPE,
      'fields.showInMobile': true, // Only banners marked for mobile
    });
    const { prioritySlides, regularSlides } = mapContentfulEntriesToSlides(
      entries.items,
      entries.includes?.Asset ?? [],
    );
    return { prioritySlides, regularSlides };
  } catch (err) {
    // If the Contentful SDK fails, fall back to a direct fetch
    console.warn('Contentful SDK failed, falling back to direct fetch', err);
  }

  // Otherwise fallback to URL fetch
  try {
    const url = new URL(`${host}`);
    url.searchParams.set('access_token', accessToken);
    url.searchParams.set('content_type', CONTENT_TYPE);
    url.searchParams.set('fields.showInMobile', 'true');

    const response = await fetch(url.toString());
    const json = await response.json();
    const { prioritySlides, regularSlides } = mapContentfulEntriesToSlides(
      json.items,
      json.includes?.Asset ?? [],
    );
    return { prioritySlides, regularSlides };
  } catch (fallbackError) {
    console.warn(
      '[fetchCarouselSlidesFromContentful] Fallback fetch failed, gracefully failing.',
      fallbackError,
    );
    return { prioritySlides: [], regularSlides: [] };
  }
}

function mapContentfulEntriesToSlides(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assets: any[],
): { prioritySlides: CarouselSlide[]; regularSlides: CarouselSlide[] } {
  if (!items || !Array.isArray(items)) {
    console.warn('[mapContentfulEntriesToSlides] Invalid items format:', items);
    return { prioritySlides: [], regularSlides: [] };
  }

  const resolveImage = (imageRef: ContentfulSysField) => {
    const asset = assets.find((a) => a.sys.id === imageRef?.sys?.id);
    const rawUrl = asset?.fields?.file?.url || '';
    return rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
  };

  const prioritySlides: CarouselSlide[] = [];
  const regularSlides: CarouselSlide[] = [];

  for (const entry of items) {
    const {
      headline,
      teaser,
      image,
      linkUrl,
      undismissable,
      startDate,
      endDate,
      priorityPlacement,
      cardPlacement,
      variableName,
      mobileMinimumVersionNumber,
    } = entry.fields;

    const slide: CarouselSlide = {
      id: `contentful-${entry.sys.id}`,
      title: headline,
      description: teaser,
      navigation: {
        type: 'url',
        href: linkUrl,
      },
      image: resolveImage(image as unknown as ContentfulSysField),
      undismissable: undismissable ?? false,
      testID: `carousel_slide_${entry.sys.id}`,
      testIDTitle: `carousel_slide_title_${entry.sys.id}`,
      testIDCloseButton: `carousel_slide_close_${entry.sys.id}`,
      startDate,
      endDate,
      cardPlacement,
      variableName,
    };

    if (!isValidMinimumVersion(mobileMinimumVersionNumber)) {
      continue;
    }

    if (priorityPlacement) {
      prioritySlides.push(slide);
    } else {
      regularSlides.push(slide);
    }
  }

  return { prioritySlides, regularSlides };
}

function isValidMinimumVersion(contentfulMinimumVersionNumber?: string) {
  // Field is not set, show by default
  if (!contentfulMinimumVersionNumber) {
    return true;
  }

  try {
    return hasMinimumRequiredVersion(contentfulMinimumVersionNumber);
  } catch {
    // Invalid mobile version number, not showing banner
    return false;
  }
}

export function isActive(
  slide: { startDate?: string; endDate?: string },
  now = new Date(),
): boolean {
  const start = slide.startDate ? new Date(slide.startDate) : null;
  const end = slide.endDate ? new Date(slide.endDate) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}
