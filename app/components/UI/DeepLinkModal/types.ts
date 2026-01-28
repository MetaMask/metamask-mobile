import { TextStyle, ImageStyle, ViewStyle } from 'react-native';
import { DeepLinkModalLinkType } from '../../../core/DeeplinkManager/types/deepLink.types';

// Re-export DeepLinkModalLinkType for external use
export { DeepLinkModalLinkType };

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type CommonLinkParams = {
  linkType: DeepLinkModalLinkType;
  onBack: () => void;
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
  onContinue?: () => void; // Optional callback for primary button action (navigate to home)
  pageTitle?: never; // Invalid links don't have a page title
};

type UnsupportedLinkParams = CommonLinkParams & {
  linkType: DeepLinkModalLinkType.UNSUPPORTED;
  onContinue?: () => void; // Optional callback for primary button action (navigate to home)
  pageTitle?: never; // Unsupported links don't have a page title
};

/**
 * Deeplink Modal Params
 */
export type DeepLinkModalParams =
  | PublicLinkParams
  | PrivateLinkParams
  | InvalidLinkParams
  | UnsupportedLinkParams;

/**
 * Modal Image Props
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ModalImageProps = {
  linkType: DeepLinkModalLinkType;
  styles: Record<string, ImageStyle & ViewStyle & TextStyle>;
};
