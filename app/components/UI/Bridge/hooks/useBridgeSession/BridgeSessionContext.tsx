import React, { createContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import {
  selectBridgeBalanceRefreshKey,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import {
  BridgeTabKey,
  TAB_TO_FEATURE_ID,
} from '../../Views/BridgeView/BridgeView.constants';
import { FeatureIdProvider } from '../useSwapFeatureId/FeatureIdContext';
import { useLatestBalance } from '../useLatestBalance';

export const BridgeSessionContext = createContext<{
  selectedTab: BridgeTabKey;
  renderedTab: BridgeTabKey;
  setSelectedTab: (tab: BridgeTabKey) => void;
  setRenderedTab: (tab: BridgeTabKey) => void;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
} | null>(null);

export const BridgeSessionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // `selectedTab` drives the tabs bar and updates urgently so a press is
  // acknowledged on the same frame. `renderedTab` swaps the content, which is
  // expensive enough to drop frames, so it is deferred to a transition instead
  // of holding up that feedback.
  const [selectedTab, setSelectedTab] = useState(BridgeTabKey.Market);
  const [renderedTab, setRenderedTab] = useState(BridgeTabKey.Market);
  const featureId = TAB_TO_FEATURE_ID[renderedTab];

  const sourceToken = useSelector(selectSourceToken);
  const balanceRefreshKey = useSelector(selectBridgeBalanceRefreshKey);
  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
    refreshKey: balanceRefreshKey,
  });

  const value = useMemo(
    () => ({
      selectedTab,
      renderedTab,
      setSelectedTab,
      setRenderedTab,
      latestSourceBalance,
    }),
    [selectedTab, renderedTab, latestSourceBalance],
  );

  return (
    <BridgeSessionContext.Provider value={value}>
      <FeatureIdProvider featureId={featureId}>{children}</FeatureIdProvider>
    </BridgeSessionContext.Provider>
  );
};
