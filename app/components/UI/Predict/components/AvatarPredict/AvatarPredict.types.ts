import type {
  AvatarBaseProps,
  AvatarBaseShape,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';

/**
 * AvatarPredict component props.
 */
export interface AvatarPredictProps
  extends Omit<AvatarBaseProps, 'children' | 'size' | 'shape'> {
  /**
   * Remote URI of the prediction image. Renders the AvatarBase placeholder
   * when omitted.
   */
  uri?: string;
  /**
   * Optional AvatarBase size.
   * @default AvatarBaseSize.Lg
   */
  size?: AvatarBaseSize;
  /**
   * Optional AvatarBase shape.
   * @default AvatarBaseShape.Square
   */
  shape?: AvatarBaseShape;
  /**
   * Optional layout classes such as margin or alignment. Size and radius
   * come from `size` and `shape`.
   */
  twClassName?: string;
}
