import { createClient, type Entry, type EntrySkeletonType } from 'contentful';
import { CarouselSlide } from './types';
import { isProduction } from '../../../util/environment';

export interface ContentfulCarouselSlideFields {
  headline: string;
  teaser: string;
  image: string;
  linkUrl: string;
  undismissable: boolean;
  startDate?: string;
  endDate?: string;
  priorityPlacement?: boolean;
}

export type ContentfulSlideSkeleton =
  EntrySkeletonType<ContentfulCarouselSlideFields>;

const SPACE_ID = process.env.FEATURES_ANNOUNCEMENTS_SPACE_ID;
const ACCESS_TOKEN = process.env.FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN;
const ENVIRONMENT = isProduction() ? 'master' : 'dev';
const CONTENT_TYPE = 'promotionalBanner';
const DEFAULT_DOMAIN = isProduction()
  ? 'cdn.contentful.com'
  : 'preview.contentful.com';

interface ContentfulSysField {
  sys: { id: string };
}

export async function fetchCarouselSlidesFromContentful(): Promise<{
  prioritySlides: CarouselSlide[];
  regularSlides: CarouselSlide[];
}> {
  if (!SPACE_ID || !ACCESS_TOKEN) {
    console.warn(
      'Missing Contentful env variables: FEATURES_ANNOUNCEMENTS_SPACE_ID, FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN.',
    );
    return { prioritySlides: [], regularSlides: [] };
  }

  const host = `https://${DEFAULT_DOMAIN}/spaces/${SPACE_ID}/environments/${ENVIRONMENT}/entries`;

  // First try through the Contentful Client
  try {
    const contentfulClient = createClient({
      space: SPACE_ID,
      accessToken: ACCESS_TOKEN,
      environment: ENVIRONMENT,
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
  try {
    const url = new URL(`${host}`);
    url.searchParams.set('access_token', ACCESS_TOKEN);
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
    console.error(
      '[fetchCarouselSlidesFromContentful] Fallback fetch failed:',
      fallbackError,
    );
    return { prioritySlides: [], regularSlides: [] };
  }
}

function mapContentfulEntriesToSlides(
  items: any[],
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
    };

    if (priorityPlacement) {
      prioritySlides.push(slide);
    } else {
      regularSlides.push(slide);
    }
  }

  return { prioritySlides, regularSlides };
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
