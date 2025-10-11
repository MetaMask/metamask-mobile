import { TextStyle, ImageStyle, ViewStyle } from 'react-native';

/**
 * Deeplink Modal Link Type
 */
export enum DeepLinkModalLinkType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  INVALID = 'invalid',
  UNSUPPORTED = 'unsupported',
}

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
};

type UnsupportedLinkParams = CommonLinkParams & {
  linkType: DeepLinkModalLinkType.UNSUPPORTED;
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
