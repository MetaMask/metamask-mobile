import React, { createContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import { selectBridgeBalanceRefreshKey } from '../../../../../core/redux/slices/bridge';
import {
  BridgeTabKey,
  TAB_TO_FEATURE_ID,
} from '../../Views/BridgeView/BridgeView.constants';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import type { QuoteParams } from '../SwapQuotesProvider/utils';
import { SwapsFeatureIdProvider } from '../SwapsFeatureIdProvider';
import { OrdersTabKey } from '../../components/OrdersTabs/OrdersTabs.types';
import type { FeatureId } from '@metamask/bridge-controller';

export const BridgeSessionContext = createContext<{
  selectedTab: BridgeTabKey;
  renderedTab: BridgeTabKey;
  setSelectedTab: (tab: BridgeTabKey) => void;
  setRenderedTab: (tab: BridgeTabKey) => void;
  recurringOrdersTab?: OrdersTabKey;
  setRecurringOrdersTab?: (tab: OrdersTabKey) => void;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  quoteParams: QuoteParams;
  setQuoteParams: (quoteParams: QuoteParams) => void;
} | null>(null);

/**
 * This context provides the current bridge session state, including the
 * selected tab, rendered tab, latest source balance, and quote request parameters
 */
export const BridgeSessionProvider = ({
  children,
  featureId,
}: {
  children: React.ReactNode;
  featureId?: FeatureId;
}) => {
  // `selectedTab` drives the tabs bar and updates urgently so a press is
  // acknowledged on the same frame. `renderedTab` swaps the content, which is
  // expensive enough to drop frames, so it is deferred to a transition instead
  // of holding up that feedback.
  const [selectedTab, setSelectedTab] = useState(BridgeTabKey.Market);
  const [renderedTab, setRenderedTab] = useState(BridgeTabKey.Market);
  const [recurringOrdersTab, setRecurringOrdersTab] = useState(
    OrdersTabKey.OpenOrders,
  );
  const featureIdToUse = featureId ?? TAB_TO_FEATURE_ID[renderedTab];

  const balanceRefreshKey = useSelector(selectBridgeBalanceRefreshKey);

  const [quoteParams, setQuoteParams] = useState<QuoteParams>({});

  const latestSourceBalance = useLatestBalance(
    {
      address: quoteParams.srcToken?.address,
      decimals: quoteParams.srcToken?.decimals,
      chainId: quoteParams.srcToken?.chainId,
      balance: quoteParams.srcToken?.balance,
      refreshKey: balanceRefreshKey,
    },
    featureIdToUse,
  );

  const value = useMemo(
    () => ({
      selectedTab,
      renderedTab,
      setSelectedTab,
      setRenderedTab,
      recurringOrdersTab,
      setRecurringOrdersTab,
      latestSourceBalance,
      quoteParams,
      setQuoteParams,
    }),
    [
      selectedTab,
      renderedTab,
      recurringOrdersTab,
      latestSourceBalance,
      quoteParams,
    ],
  );

  return (
    <BridgeSessionContext.Provider value={value}>
      <SwapsFeatureIdProvider featureId={featureIdToUse}>
        {children}
      </SwapsFeatureIdProvider>
    </BridgeSessionContext.Provider>
  );
};
