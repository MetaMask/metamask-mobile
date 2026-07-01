import { useEffect, useRef, useState } from 'react';
import { BridgeToken } from '../../types';
import {
  areBridgeTokensEqual,
  areDisplayedBridgeTokensSyncedWithRedux,
} from './BridgeView.utils';

export const useBridgeViewRouteFallbacks = ({
  sourceToken,
  destToken,
  sourceAmount,
  initialSourceToken,
  initialSourceAmount,
  initialDestToken,
}: {
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  sourceAmount?: string;
  initialSourceToken?: BridgeToken;
  initialSourceAmount?: string;
  initialDestToken?: BridgeToken;
}) => {
  const [sourceRouteFallback, setSourceRouteFallback] = useState<{
    token?: BridgeToken;
    amount?: string;
  }>(() => ({
    token: initialSourceToken,
    amount: initialSourceAmount,
  }));
  const [destRouteFallbackToken, setDestRouteFallbackToken] = useState<
    BridgeToken | undefined
  >(initialDestToken);
  const previousInitialDestTokenRef = useRef(initialDestToken);
  const destRouteFallbackInitialReduxTokenRef = useRef(destToken);

  useEffect(() => {
    setSourceRouteFallback({
      token: initialSourceToken,
      amount: initialSourceAmount,
    });
  }, [initialSourceToken, initialSourceAmount]);

  useEffect(() => {
    if (previousInitialDestTokenRef.current === initialDestToken) {
      return;
    }

    previousInitialDestTokenRef.current = initialDestToken;
    destRouteFallbackInitialReduxTokenRef.current = destToken;
    setDestRouteFallbackToken(initialDestToken);
  }, [destToken, initialDestToken]);

  useEffect(() => {
    if (!sourceRouteFallback.token) {
      return;
    }

    const hasSyncedInitialSourceToken = areBridgeTokensEqual(
      sourceToken,
      sourceRouteFallback.token,
    );
    const hasSyncedInitialSourceAmount =
      !sourceRouteFallback.amount ||
      sourceAmount === sourceRouteFallback.amount;

    if (hasSyncedInitialSourceToken && hasSyncedInitialSourceAmount) {
      setSourceRouteFallback({});
    }
  }, [sourceAmount, sourceRouteFallback, sourceToken]);

  useEffect(() => {
    if (!destRouteFallbackToken) {
      return;
    }

    if (areBridgeTokensEqual(destToken, destRouteFallbackToken)) {
      setDestRouteFallbackToken(undefined);
      return;
    }

    const hasReduxDestChangedAfterRouteFallback =
      destToken &&
      !areBridgeTokensEqual(
        destToken,
        destRouteFallbackInitialReduxTokenRef.current,
      );

    if (hasReduxDestChangedAfterRouteFallback) {
      setDestRouteFallbackToken(undefined);
    }
  }, [destRouteFallbackToken, destToken]);

  const shouldUseInitialSourceToken =
    sourceRouteFallback.token &&
    !areBridgeTokensEqual(sourceToken, sourceRouteFallback.token);
  const shouldUseInitialSourceAmount =
    sourceRouteFallback.amount && sourceAmount !== sourceRouteFallback.amount;
  const displaySourceToken = shouldUseInitialSourceToken
    ? sourceRouteFallback.token
    : sourceToken;
  const displaySourceAmount = shouldUseInitialSourceAmount
    ? sourceRouteFallback.amount
    : sourceAmount;
  const hasReduxDestChangedAfterRouteFallback = Boolean(
    destRouteFallbackToken &&
      destToken &&
      !areBridgeTokensEqual(
        destToken,
        destRouteFallbackInitialReduxTokenRef.current,
      ),
  );
  const displayDestToken = hasReduxDestChangedAfterRouteFallback
    ? destToken
    : (destRouteFallbackToken ?? destToken);

  return {
    displaySourceToken,
    displaySourceAmount,
    displayDestToken,
    areDisplayedTokensSyncedWithRedux: areDisplayedBridgeTokensSyncedWithRedux({
      sourceToken,
      destToken,
      displaySourceToken,
      displayDestToken,
    }),
  };
};
