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
}

export type ContentfulSlideSkeleton =
  EntrySkeletonType<ContentfulCarouselSlideFields>;

const space = process.env.FEATURES_ANNOUNCEMENTS_SPACE_ID;
const accessToken = process.env.FEATURES_ANNOUNCEMENTS_ACCESS_TOKEN;
const environment = isProduction() ? 'master' : 'dev';
const contentType = 'promotionalBanner';
const defaultDomain = isProduction()
  ? 'cdn.contentful.com'
  : 'preview.contentful.com';
const host = `https://${defaultDomain}/spaces/${space}/environments/${environment}/entries`;

if (!space || !accessToken) {
  throw new Error(
    'Missing Contentful environment variables: CONTENTFUL_SPACE_ID or CONTENTFUL_ACCESS_TOKEN',
  );
}

const contentfulClient = createClient({
  space,
  accessToken,
  environment,
  host,
});

interface ContentfulSysField {
  sys: { id: string };
}

export async function fetchCarouselSlidesFromContentful(): Promise<
  CarouselSlide[]
> {
  const entries = await contentfulClient.getEntries({
    content_type: contentType,
    'fields.showInMobile': true, // Only banners marked for mobile
  });
  const assets = (entries.includes?.Asset ?? []) as any[];
  const resolveImage = (imageRef: ContentfulSysField) => {
    const asset = assets.find((a) => a.sys.id === imageRef?.sys?.id);
    const rawUrl = asset?.fields?.file?.url || '';
    return rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
  };

  return entries.items.map((entry) => {
    const {
      headline,
      teaser,
      image,
      linkUrl,
      undismissable,
      startDate,
      endDate,
    } = entry.fields;

    return {
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
      startDate: startDate,
      endDate: endDate,
    };
  });
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
