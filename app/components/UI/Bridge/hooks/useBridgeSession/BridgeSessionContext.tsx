import React, { createContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

import {
  selectBridgeBalanceRefreshKey,
  selectDestAddress,
  selectDestToken,
  selectSlippage,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import {
  BridgeTabKey,
  TAB_TO_FEATURE_ID,
} from '../../Views/BridgeView/BridgeView.constants';
import { FeatureIdProvider } from '../useSwapFeatureId/FeatureIdContext';
import { useLatestBalance } from '../useLatestBalance';
import type { buildGenericQuoteRequest } from '../useSwapQuotes/utils';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';

export const BridgeSessionContext = createContext<{
  selectedTab: BridgeTabKey;
  renderedTab: BridgeTabKey;
  setSelectedTab: (tab: BridgeTabKey) => void;
  setRenderedTab: (tab: BridgeTabKey) => void;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  quoteParams: Parameters<typeof buildGenericQuoteRequest>[0]['quoteParams'];
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
  const latestSourceBalance = useLatestBalance(
    {
      address: sourceToken?.address,
      decimals: sourceToken?.decimals,
      chainId: sourceToken?.chainId,
      balance: sourceToken?.balance,
      refreshKey: balanceRefreshKey,
    },
    featureId,
  );

  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const slippage = useSelector(selectSlippage);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const destAddress = useSelector(selectDestAddress);
  const quoteParams = useMemo(
    (): Parameters<typeof buildGenericQuoteRequest>[0]['quoteParams'] => ({
      srcToken: sourceToken,
      destToken,
      srcAmount: sourceAmount,
      slippage,
      walletAddress,
      destWalletAddress: destAddress,
    }),
    [
      sourceToken,
      destToken,
      sourceAmount,
      slippage,
      walletAddress,
      destAddress,
    ],
  );

  const value = useMemo(
    () => ({
      selectedTab,
      renderedTab,
      setSelectedTab,
      setRenderedTab,
      latestSourceBalance,
      quoteParams,
    }),
    [selectedTab, renderedTab, latestSourceBalance, quoteParams],
  );

  return (
    <BridgeSessionContext.Provider value={value}>
      <FeatureIdProvider featureId={featureId}>{children}</FeatureIdProvider>
    </BridgeSessionContext.Provider>
  );
};
