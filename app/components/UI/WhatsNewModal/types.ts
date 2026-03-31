import { ImageSourcePropType } from 'react-native';
import { NavigationProp } from '@react-navigation/native';

export const SlideContentType = {
  IMAGE: 'image',
  CAROUSEL_IMAGES: 'carousel_images',
  TITLE: 'title',
  DESCRIPTION: 'description',
  DESCRIPTIONS: 'descriptions',
  MORE_INFORMATION: 'more_information',
  BUTTON: 'button',
} as const;

interface SlideImage {
  type: typeof SlideContentType.IMAGE;
  image: ImageSourcePropType;
}

interface SlideCarouselImages {
  type: typeof SlideContentType.CAROUSEL_IMAGES;
  images: {
    image: ImageSourcePropType;
    alt: string;
  }[];
}

interface SlideTitle {
  type: typeof SlideContentType.TITLE;
  title: string;
}

interface SlideDescription {
  type: typeof SlideContentType.DESCRIPTION;
  description: string;
}

interface SlideDescriptions {
  type: typeof SlideContentType.DESCRIPTIONS;
  descriptions: string[];
}

interface SlideMoreInformation {
  type: typeof SlideContentType.MORE_INFORMATION;
  moreInformation: string;
}

type SlideButtonType = 'normal' | 'blue';

interface SlideButton {
  type: typeof SlideContentType.BUTTON;
  buttonType: SlideButtonType;
  buttonText: string;
  onPress: (props: {
    navigation: NavigationProp<Record<string, object | undefined>>;
  }) => void;
}

export type SlideContent =
  | SlideImage
  | SlideCarouselImages
  | SlideTitle
  | SlideDescription
  | SlideDescriptions
  | SlideMoreInformation
  | SlideButton;

type WhatsNewSlides = SlideContent[][];

type VersionString = `${number}.${number}.${number}` | `${number}.${number}`;

export interface WhatsNew {
  onlyUpdates: boolean;
  maxLastAppVersion: VersionString;
  minAppVersion: VersionString;
  /**
   * Slides utilizes a templating system in the form of a 2D array, which is eventually rendered within app/components/UI/WhatsNewModal/index.js.
   * The root layer determines the number of slides. Ex. To display 3 slides, the root layer should contain 3 arrays.
   * The inner layer determines the content that will be rendered within each slide.
   * The slide content takes the form of union types, where the possible types are `image`, `title`, `description`, or `button`.
   * Both slide count and slide content will be rendered in the same order as the data set.
   */
  slides: WhatsNewSlides;
}
