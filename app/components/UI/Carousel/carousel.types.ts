import { ViewStyle } from 'react-native';

export type SlideId = 'card' | 'fund' | 'cashout' | 'aggregated';

export type NavigationAction =
  | { type: 'url'; href: string }
  | {
      type: 'function';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate: () => any;
    }
  | {
      type: 'route';
      route: string;
      navigationStack?: string;
    };

export interface CarouselSlide {
  id: SlideId;
  title: string;
  description: string;
  image?: string;
  navigation: NavigationAction;
  dismissed?: boolean;
  undismissable?: boolean;
  testID?: string;
  testIDTitle?: string;
  testIDCloseButton?: string;
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
