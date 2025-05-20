import { createClient, type Entry, type EntrySkeletonType } from 'contentful';
import { CarouselSlide } from './types';

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

const space = process.env.CONTENTFUL_SPACE_ID;
const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN;

if (!space || !accessToken) {
  throw new Error(
    'Missing Contentful environment variables: CONTENTFUL_SPACE_ID or CONTENTFUL_ACCESS_TOKEN',
  );
}

const contentfulClient = createClient({
  space,
  accessToken,
});

export async function fetchCarouselSlidesFromContentful(): Promise<
  CarouselSlide[]
> {
  const entries = await contentfulClient.getEntries<ContentfulSlideSkeleton>({
    content_type: 'carouselSlide',
  });

  return entries.items.map((entry: Entry<ContentfulSlideSkeleton>) => {
    const fields = entry.fields;

    return {
      id: 'contentful',
      title: fields.headline,
      description: fields.teaser,
      navigation: {
        type: 'url',
        href: fields.linkUrl,
      },
      image: fields.image,
      undismissable: fields.undismissable ?? false,
      testID: `carousel_slide_${entry.sys.id}`,
      testIDTitle: `carousel_slide_title_${entry.sys.id}`,
      testIDCloseButton: `carousel_slide_close_${entry.sys.id}`,
      startDate: fields.startDate,
      endDate: fields.endDate,
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
