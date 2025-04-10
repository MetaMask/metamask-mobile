import { ViewStyle } from 'react-native';

export type SlideId = 'card' | 'fund' | 'cashout' | 'aggregated' | 'multisrp';

interface NavigationParams {
  address?: string;
  chainId?: string;
  amount?: string;
  currency?: string;
}

interface NavigationScreen {
  screen: string;
  params: NavigationParams;
}

type NavigationRoute = readonly [string] | readonly [string, NavigationScreen];

export interface UrlNavigationAction {
  type: 'url';
  href: string;
}

export interface FunctionNavigationAction {
  type: 'function';
  navigate: () => NavigationRoute;
}

export interface RouteNavigationAction {
  type: 'route';
  route: string;
  navigationStack?: string;
}

export type NavigationAction =
  | UrlNavigationAction
  | FunctionNavigationAction
  | RouteNavigationAction;

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

export interface CarouselStyleSheetVars {
  style?: ViewStyle;
}
