import { ViewStyle } from 'react-native';

import { WalletClientType } from '../../../core/SnapKeyring/MultichainWalletSnapClient';
import { CaipChainId } from '@metamask/utils';
export type SlideId =
  | 'card'
  | 'fund'
  | 'cashout'
  | 'aggregated'
  | 'multisrp'
  | 'backupAndSync'
  | 'solana';

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
