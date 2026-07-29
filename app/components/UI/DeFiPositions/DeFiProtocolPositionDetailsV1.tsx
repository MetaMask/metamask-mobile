import React from 'react';
import { useSelector } from 'react-redux';
import { useParams } from '../../../util/navigation/navUtils';
import { selectPrivacyMode } from '../../../selectors/preferencesController';
import DeFiProtocolPositionGroups from './DeFiProtocolPositionGroups';
import DeFiProtocolPositionDetailsView from './DeFiProtocolPositionDetailsView';
import type { DeFiProtocolPositionDetailsParams } from './DeFiProtocolPositionDetails';

/**
 * DeFiProtocolPositionDetailsV1 - details screen for a legacy (V1) protocol
 * aggregate, passed via navigation params.
 */
const DeFiProtocolPositionDetailsV1: React.FC = () => {
  const { protocolAggregate, networkIconAvatar } =
    useParams<DeFiProtocolPositionDetailsParams>();
  const privacyMode = useSelector(selectPrivacyMode);

  if (!protocolAggregate) {
    return null;
  }

  return (
    <DeFiProtocolPositionDetailsView
      title={protocolAggregate.protocolDetails.name}
      marketValue={protocolAggregate.aggregatedMarketValue}
      iconUrl={protocolAggregate.protocolDetails.iconUrl}
      networkIconAvatar={networkIconAvatar}
      privacyMode={privacyMode}
    >
      <DeFiProtocolPositionGroups
        protocolAggregate={protocolAggregate}
        networkIconAvatar={networkIconAvatar}
        privacyMode={privacyMode}
      />
    </DeFiProtocolPositionDetailsView>
  );
};

export default DeFiProtocolPositionDetailsV1;
