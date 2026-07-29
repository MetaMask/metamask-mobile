import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from '../../../util/navigation/navUtils';
import { selectPrivacyMode } from '../../../selectors/preferencesController';
import DeFiProtocolPositionGroupsV2 from '../Assets/DeFiPositions/components/DeFiProtocolPositionGroupsV2';
import DeFiProtocolPositionDetailsView from './DeFiProtocolPositionDetailsView';
import type { DeFiProtocolPositionDetailsParams } from './DeFiProtocolPositionDetails';

/**
 * DeFiProtocolPositionDetailsV2 - details screen for a V2 protocol-per-chain
 * group, passed via navigation params. Reads the group's embedded sections
 * (no separate fetch).
 */
const DeFiProtocolPositionDetailsV2: React.FC = () => {
  const { protocolPositionGroup, networkIconAvatar } =
    useParams<DeFiProtocolPositionDetailsParams>();
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
