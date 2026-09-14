import React, { createContext, useContext, useMemo, useState } from 'react';
import type { FeatureId } from '@metamask/bridge-controller';

import { useLatestBalance } from '../Bridge/hooks/useLatestBalance';
import { BridgeSessionContext } from '../Bridge/providers/BridgeSessionProvider';
import { SwapQuotesProvider } from '../Bridge/providers/SwapQuotesProvider';
import { SwapsFeatureIdProvider } from '../Bridge/providers/SwapsFeatureIdProvider';
import { BridgeTabKey } from '../Bridge/Views/BridgeView/BridgeView.constants';
import type { buildGenericQuoteRequest } from '../Bridge/providers/SwapQuotesProvider/utils';

const EMPTY_QUOTE_PARAMS: Parameters<
  typeof buildGenericQuoteRequest
>[0]['quoteParams'] = {
  srcToken: undefined,
  destToken: undefined,
  srcAmount: undefined,
  slippage: undefined,
  walletAddress: undefined,
  destWalletAddress: undefined,
};

const SetQuoteParamsContext = createContext<
  | ((
      next: Parameters<typeof buildGenericQuoteRequest>[0]['quoteParams'],
    ) => void)
  | null
>(null);

export const useSetQuickBuyQuoteParams = () => {
  const setQuoteParams = useContext(SetQuoteParamsContext);
  return setQuoteParams ?? (() => undefined);
};

export const QuickBuyQuotesSession = ({
  featureId,
  children,
}: {
  featureId: FeatureId;
  children: React.ReactNode;
}) => {
  const [quoteParams, setQuoteParams] = useState(EMPTY_QUOTE_PARAMS);
  const latestSourceBalance = useLatestBalance(
    {
      address: quoteParams.srcToken?.address,
      decimals: quoteParams.srcToken?.decimals,
      chainId: quoteParams.srcToken?.chainId,
      balance: quoteParams.srcToken?.balance,
      refreshKey: quoteParams.srcToken?.balance,
    },
    featureId,
  );

  const value = useMemo(
    () => ({
      selectedTab: BridgeTabKey.Market,
      renderedTab: BridgeTabKey.Market,
      setSelectedTab: () => undefined,
      setRenderedTab: () => undefined,
      latestSourceBalance,
      quoteParams,
    }),
    [latestSourceBalance, quoteParams],
  );

  return (
    <BridgeSessionContext.Provider value={value}>
      <SetQuoteParamsContext.Provider value={setQuoteParams}>
        <SwapsFeatureIdProvider featureId={featureId}>
          <SwapQuotesProvider>{children}</SwapQuotesProvider>
        </SwapsFeatureIdProvider>
      </SetQuoteParamsContext.Provider>
    </BridgeSessionContext.Provider>
  );
};
