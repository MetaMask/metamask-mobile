// Third party dependencies.
import { CirclePatternProps } from '../../../../../patterns/Circles/Circle';

// External dependencies.
import { AvatarVariants } from '../../Avatar.types';

/**
 * AvatarBlockies component props.
 */
export type AvatarBlockiesProps = CirclePatternProps & {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariants.Blockies;
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
};

/**
 * Style sheet input parameters.
 */
export type AvatarBlockiesStyleSheetVars = Pick<AvatarBlockiesProps, 'size'>;
