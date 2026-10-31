import type { AvatarBaseSize } from '@metamask/design-system-react-native';

/**
 * AvatarPredict component props.
 */
export interface AvatarPredictProps {
  /**
   * Image source, matching `AvatarToken` and `AvatarNetwork`.
   * The placeholder is rendered when omitted or when `uri` is empty.
   */
  src?: { uri?: string };
  /**
   * Avatar size.
   * @default AvatarBaseSize.Lg
   */
  size?: AvatarBaseSize;
  /**
   * Layout classes such as margin or alignment. Size and radius stay on
   * AvatarBase.
   */
  twClassName?: string;
  /**
   * Test ID for the avatar container.
   */
  testID?: string;
}
