import { ImageSourcePropType } from 'react-native';
import { IconName, IconSize } from '../../../components/Icon';

export interface ContractBoxBaseProps {
  contractAddress: string;
  contractPetName?: string;
  contractLocalImage: ImageSourcePropType;
  /**
   * function that copies the contract address to the clipboard
   */
  handleCopyAddress: () => void;
  /**
   * function that opens contract in block explorer
   */
  handleExportAddress: () => void;
}

export interface IconViewProps {
  size: IconSize;
  name: IconName;
  onPress?: () => void;
  testID?: string;
  color?: string;
}
