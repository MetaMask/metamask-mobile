import { ImageSourcePropType } from 'react-native';

interface SlideImage {
  type: 'image';
  image: ImageSourcePropType;
}

interface SlideImages {
  type: 'image';
  images: {
    light: ImageSourcePropType;
    dark: ImageSourcePropType;
  };
}

interface SlideTitle {
  type: 'title';
  title: string;
}

interface SlideDescription {
  type: 'description';
  description: string;
}

type SlideButtonType = 'normal' | 'blue';

interface SlideButton {
  type: 'button';
  buttonType: SlideButtonType;
  buttonText: string;
  onPress: (props: { navigation: any }) => void;
}

type SlideContentType =
  | SlideImage
  | SlideImages
  | SlideTitle
  | SlideDescription
  | SlideButton;

type WhatsNewSlides = SlideContentType[][];

type VersionString = `${number}.${number}.${number}`;

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
