import React from 'react';
import { useSelector } from 'react-redux';
import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import type { ImageSourcePropType } from 'react-native';
import { useParams } from '../../../util/navigation/navUtils';
import { selectPrivacyMode } from '../../../selectors/preferencesController';
import DeFiProtocolPositionGroupsV2 from '../Assets/DeFiPositions/components/DeFiProtocolPositionGroupsV2';
import DeFiProtocolPositionDetailsView from './DeFiProtocolPositionDetailsView';

interface DeFiProtocolPositionDetailsV2Params {
  protocolPositionGroup?: DeFiProtocolPositionGroup;
  networkIconAvatar: ImageSourcePropType | undefined;
}

/**
 * DeFiProtocolPositionDetailsV2 - details screen for a V2 protocol-per-chain
 * group, passed via navigation params. Reads the group's embedded sections
 * (no separate fetch).
 */
const DeFiProtocolPositionDetailsV2: React.FC = () => {
  const { protocolPositionGroup, networkIconAvatar } =
    useParams<DeFiProtocolPositionDetailsV2Params>();
  const privacyMode = useSelector(selectPrivacyMode);

  if (!protocolPositionGroup) {
    return null;
  }

  return (
    <DeFiProtocolPositionDetailsView
      title={protocolPositionGroup.protocolId}
      marketValue={protocolPositionGroup.marketValue}
      iconUrl={protocolPositionGroup.protocolIconUrl}
      networkIconAvatar={networkIconAvatar}
      privacyMode={privacyMode}
    >
      <DeFiProtocolPositionGroupsV2
        protocolPositionGroup={protocolPositionGroup}
        networkIconAvatar={networkIconAvatar}
        privacyMode={privacyMode}
      />
    </DeFiProtocolPositionDetailsView>
  );
};

export default DeFiProtocolPositionDetailsV2;
