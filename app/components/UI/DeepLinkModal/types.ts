import { TextStyle, ImageStyle, ViewStyle } from 'react-native';
import { DeepLinkModalLinkType } from '../../../core/DeeplinkManager/types/deepLink.types';
import { DeepLinkAnalyticsContext } from '../../../core/DeeplinkManager/types/deepLinkAnalytics.types';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CommonLinkParams = {
  linkType: DeepLinkModalLinkType;
  onBack: () => void;
  deepLinkContext?: DeepLinkAnalyticsContext;
};

type PublicLinkParams = CommonLinkParams & {
  linkType: DeepLinkModalLinkType.PUBLIC;
  onContinue: () => void;
  pageTitle: string;
};

type PrivateLinkParams = CommonLinkParams & {
  linkType: DeepLinkModalLinkType.PRIVATE;
  onContinue: () => void;
  pageTitle: string;
};

type InvalidLinkParams = CommonLinkParams & {
  linkType: DeepLinkModalLinkType.INVALID;
};

/**
 * Deeplink Modal Params
 */
export type DeepLinkModalParams =
  | PublicLinkParams
  | PrivateLinkParams
  | InvalidLinkParams;

/**
 * Modal Image Props
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ModalImageProps = {
  linkType: DeepLinkModalLinkType;
  styles: Record<string, ImageStyle & ViewStyle & TextStyle>;
};
