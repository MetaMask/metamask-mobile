import { GroupedDeFiPositions } from '@metamask/assets-controllers';
import { ImageSourcePropType } from 'react-native';

export type DeFiProtocolPositionDetailsParams = {
  protocolAggregate: GroupedDeFiPositions['protocols'][number];
  networkIconAvatar: ImageSourcePropType | undefined;
};
