import React from 'react';
import type {
  DeFiProtocolPositionGroup,
  GroupedDeFiPositions,
} from '@metamask/assets-controllers';
import { ImageSourcePropType } from 'react-native';
import { useParams } from '../../../util/navigation/navUtils';
import DeFiProtocolPositionDetailsV1 from './DeFiProtocolPositionDetailsV1';
import DeFiProtocolPositionDetailsV2 from './DeFiProtocolPositionDetailsV2';

export { DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID } from './DeFiProtocolPositionDetailsView';

export interface DeFiProtocolPositionDetailsParams {
  protocolAggregate?: GroupedDeFiPositions['protocols'][number];
  protocolPositionGroup?: DeFiProtocolPositionGroup;
  networkIconAvatar: ImageSourcePropType | undefined;
}

/**
 * DeFiProtocolPositionDetails - protocol details screen.
 *
 * Thin wrapper that selects the V1 or V2 implementation based on which shape
 * navigation supplied: the V2 list item passes a `protocolPositionGroup`, the
 * V1 list item passes a `protocolAggregate`. Selecting on the param (rather
 * than the flag) keeps the screen consistent with the data it was opened with.
 */
const DeFiProtocolPositionDetails: React.FC = () => {
  const { protocolPositionGroup } =
    useParams<DeFiProtocolPositionDetailsParams>();

  return protocolPositionGroup ? (
    <DeFiProtocolPositionDetailsV2 />
  ) : (
    <DeFiProtocolPositionDetailsV1 />
  );
};

export default DeFiProtocolPositionDetails;
