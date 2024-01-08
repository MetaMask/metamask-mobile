// Third party dependencies.
import { ImageProps } from 'react-native';

/**
 * Blockies component props.
 */
export interface BlockiesProps extends ImageProps {
  /**
   * An Ethereum wallet address.
   */
  accountAddress: string;
  size: number;
  colors?: string[];
}

/**
 * Style sheet input parameters.
 */
export type BlockiesStyleSheetVars = Pick<BlockiesProps, 'style' | 'size'>;
