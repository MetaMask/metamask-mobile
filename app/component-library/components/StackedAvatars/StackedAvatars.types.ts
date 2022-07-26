import { ViewProps } from 'react-native';

interface StackedAvatarsToken {
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
 * StackedAvatars component props.
 */
export interface StackedAvatarsProps extends ViewProps {
  /**
   * A list of Avatars to be horizontally stacked.
   */
  tokenList: StackedAvatarsToken[];
}
