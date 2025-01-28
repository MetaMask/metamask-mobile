import { ViewStyle } from 'react-native';

export interface CarouselSlide {
  id: string;
  title: string;
  description: string;
  image?: string;
  href?: string;
  dismissed?: boolean;
  undismissable?: boolean;
}

export interface CarouselProps {
  /**
   * Whether the carousel is in a loading state
   */
  isLoading?: boolean;
  /**
   * Callback when a slide is clicked
   */
  onClick?: (slideId: string) => void;
  /**
   * Additional style for the container
   */
  style?: ViewStyle;
}
