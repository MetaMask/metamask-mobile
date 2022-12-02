import { ImageSourcePropType } from 'react-native';
import { IconNames, IconSize } from '../../../components/Icons/Icon';

export interface ContractBoxBaseProps {
  contractAddress: string;
  contractPetName?: string;
  contractLocalImage: ImageSourcePropType;
  /**
   * function that copies the contract address to the clipboard
   */
  onCopyAddress: () => void;
  /**
   * function that opens contract in block explorer
   */
  onExportAddress: () => void;
}

export interface IconViewProps {
  size: IconSize;
  name: IconNames;
  onPress?: () => void;
  testID?: string;
  color?: string;
}
