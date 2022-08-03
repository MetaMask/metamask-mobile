import { ViewProps } from 'react-native';

interface AvatarGroupToken {
  /**
   * Token id.
   */
  id: string;
  /**
   * Token Name.
   */
  name: string;
  /**
   * Token image url.
   */
  imageUrl: string;
}

/**
 * AvatarGroup component props.
 */
export interface AvatarGroupProps extends ViewProps {
  /**
   * A list of Avatars to be horizontally stacked.
   */
  tokenList: AvatarGroupToken[];
}
