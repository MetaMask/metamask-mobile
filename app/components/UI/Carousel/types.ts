import { ViewStyle } from 'react-native';
import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { CaipChainId } from '@metamask/utils';

interface NavigationParams {
  address?: string;
  chainId?: string;
  amount?: string;
  currency?: string;
  clientType?: WalletClientType;
  scope?: CaipChainId;
}

interface NavigationScreen {
  screen: string;
  params: NavigationParams;
}

export type NavigationRoute =
  | readonly [string]
  | readonly [string, NavigationScreen];

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
  id: string;
  title: string;
  description: string;
  image?: string;
  navigation: NavigationAction;
  dismissed?: boolean;
  undismissable?: boolean;
  href?: string;
  startDate?: string;
  endDate?: string;
  cardPlacement?: number | string;
  variableName?: string;
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
  /**
   * Callback when empty state should be shown
   */
  onEmptyState?: () => void;
}

export interface CarouselStyleSheetVars {
  style?: ViewStyle;
}
