// External dependencies.
import { AvatarVariants } from '../../Avatar.types';
import { AvatarBaseProps } from '../../foundation/AvatarBase';

/**
 * AvatarBlockies component props.
 */
export type AvatarBlockiesProps = AvatarBaseProps & {
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
