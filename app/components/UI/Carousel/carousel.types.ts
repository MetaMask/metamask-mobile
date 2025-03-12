import { ViewStyle } from 'react-native';

export type SlideId = 'card' | 'fund' | 'cashout' | 'aggregated';

export type NavigationAction =
  | { type: 'url'; href: string }
  | {
      type: 'function';
      navigate: () =>
        | readonly [string]
        | readonly [
            string,
            {
              screen: string;
              params: {
                address?: string;
                chainId?: string;
                amount?: string;
                currency?: string;
              };
            },
          ];
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
   * Additional style for the container
   */
  style?: ViewStyle;
}
