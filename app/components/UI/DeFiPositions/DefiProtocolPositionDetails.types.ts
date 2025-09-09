import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { ImageSourcePropType } from 'react-native';

export interface DeFiProtocolPositionDetailsParams {
  protocolAggregate: GroupedDeFiPositions['protocols'][number];
  networkIconAvatar: ImageSourcePropType | undefined;
}
