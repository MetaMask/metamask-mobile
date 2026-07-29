import React from 'react';
import { useSelector } from 'react-redux';
import { selectDeFiPositionsV2SectionEnabled } from '../../../selectors/deFiPositionsV2SectionEnabled';
import DeFiPositionsListV1 from './DeFiPositionsListV1';
import DeFiPositionsListV2 from './DeFiPositionsListV2';

export interface DeFiPositionsListProps {
  tabLabel: string;
  isFullView?: boolean;
}

/**
 * DeFiPositionsList - homepage / full-view list of DeFi positions.
 *
 * Thin flag-driven wrapper that selects the V1 (polling controller) or V2
 * (on-demand controller) implementation. Both render the same shared list
 * view; only the data source differs.
 */
const DeFiPositionsList: React.FC<DeFiPositionsListProps> = ({
  isFullView = false,
}) => {
  const isV2Enabled = useSelector(selectDeFiPositionsV2SectionEnabled);

  return isV2Enabled ? (
    <DeFiPositionsListV2 isFullView={isFullView} />
  ) : (
    <DeFiPositionsListV1 isFullView={isFullView} />
  );
};

export default DeFiPositionsList;
