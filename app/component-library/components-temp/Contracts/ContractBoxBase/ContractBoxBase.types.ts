import { ImageSourcePropType } from 'react-native';

export interface ContractBoxBaseProps {
  contractAddress: string;
  contractPetName?: string;
  contractLocalImage: ImageSourcePropType;
}
