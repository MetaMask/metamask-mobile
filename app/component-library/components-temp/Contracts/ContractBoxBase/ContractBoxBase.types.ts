import { ImageSourcePropType } from 'react-native';
import { IconName, IconSize } from '../../../components/Icon';

export interface ContractBoxBaseProps {
  contractAddress: string;
  contractPetName?: string;
  contractLocalImage: ImageSourcePropType;
  /**
   * function that copies the contract address to the clipboard
   */
  onCopyAddress: () => void;
  /**
   * function that opens contract in block explorer if present
   */
  onExportAddress?: () => void;
  /**
   * functions that called when the user clicks on the contract name
   */
  onContractPress: () => void;
}

export interface IconViewProps {
  size: IconSize;
  name: IconName;
  onPress?: () => void;
  testID?: string;
  color?: string;
}
