import React from 'react';
import { useSelector } from 'react-redux';
import { selectEarnTradeMenuRowRedesignEnabled } from '../../../../../components/UI/Earn/selectors/featureFlags';
import LegacyEarnTradeMenuRow from './LegacyEarnTradeMenuRow';
import RedesignedEarnTradeMenuRow from './RedesignedEarnTradeMenuRow';

export interface EarnTradeMenuRowProps {
  onActionSelected: (callback: () => void | Promise<void>) => void;
  isDisabled: boolean;
}

const EarnTradeMenuRow = (props: EarnTradeMenuRowProps) => {
  const isRedesignEnabled = useSelector(selectEarnTradeMenuRowRedesignEnabled);

  return isRedesignEnabled ? (
    <RedesignedEarnTradeMenuRow {...props} />
  ) : (
    <LegacyEarnTradeMenuRow {...props} />
  );
};

export default EarnTradeMenuRow;
