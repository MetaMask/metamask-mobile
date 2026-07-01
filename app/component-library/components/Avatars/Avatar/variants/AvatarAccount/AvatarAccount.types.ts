// External dependencies.
import { AvatarBaseProps } from '../../foundation/AvatarBase';

/**
 * AvatarAccount variants.
 */
export enum AvatarAccountType {
  JazzIcon = 'JazzIcon',
  Blockies = 'Blockies',
  /**
   * @deprecated Use `Maskicon` from `@metamask/design-system-react-native` instead.
   * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/temp-components/Maskicon/README.md | MMDS README}
   * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/MIGRATION.md#maskicon-temp-component | Migration Guide}
   */
  Maskicon = 'Maskicon', // Referred to as Polycons to users
}

/**
 * Border radius mapping by avatar size.
 */
export interface BorderRadiusByAvatarSize {
  [key: string]: number;
}

/**
 * AvatarAccount component props.
 */
export interface AvatarAccountProps extends AvatarBaseProps {
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
  /**
   * Optional enum to select the avatar type between `JazzIcon`, `Blockies`, and `Maskicon`.
   * @default JazzIcon
   */
  type?: AvatarAccountType;
}

/**
 * Style sheet input parameters.
 */
export type AvatarAccountStyleSheetVars = Pick<
  AvatarAccountProps,
  'style' | 'size'
>;
