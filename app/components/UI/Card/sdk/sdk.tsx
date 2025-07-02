import React, {
  useState,
  useCallback,
  createContext,
  useContext,
  useMemo,
} from 'react';
import { useSelector } from 'react-redux';

import Logger from '../../../../util/Logger';
import { selectedAddressSelector } from '../../../../reducers/fiatOrders';
import { selectChainId } from '../../../../selectors/networkController';
import { selectCardFeature } from '../../../../selectors/featureFlagController/card';

import {
  fetchSupportedTokensBalances,
  isCardHolder,
  getGeoLocation,
} from '../card.utils';
import { TokenConfig } from '../types';
import { CACHE_EXPIRATION, POLLING_INTERVAL } from '../constants';

export interface CardSDKConfig {
  CACHE_EXPIRATION: number;
  POLLING_INTERVAL: number;
}

export interface CardSDK {
  // Card holder status
  isCardHolderStatus: boolean | null;
  setIsCardHolderStatus: (status: boolean | null) => void;
  checkCardHolderStatus: () => Promise<boolean>;

  // Token balances
  tokenBalances: TokenConfig[];
  setTokenBalances: (balances: TokenConfig[]) => void;
  priorityToken: TokenConfig | null;
  setPriorityToken: (token: TokenConfig | null) => void;

  // Geolocation
  userLocation: string | null;
  setUserLocation: (location: string | null) => void;
  fetchUserLocation: () => Promise<string>;

  // Utility functions
  fetchBalances: () => Promise<{
    balanceList: TokenConfig[];
    priorityToken: TokenConfig | null;
  }>;

  // Loading states
  isLoadingCardHolder: boolean;
  setIsLoadingCardHolder: (loading: boolean) => void;
  isLoadingBalances: boolean;
  setIsLoadingBalances: (loading: boolean) => void;
  isLoadingLocation: boolean;
  setIsLoadingLocation: (loading: boolean) => void;

  // Error states
  balancesError: Error | null;
  setBalancesError: (error: Error | null) => void;

  // Configuration
  config: CardSDKConfig;
}

interface ProviderProps<T> {
  value?: T;
  children?: React.ReactNode;
}

const CardSDKContext = createContext<CardSDK | undefined>(undefined);

export const CardSDKProvider = ({
  value,
  ...props
}: ProviderProps<CardSDK>) => {
  const selectedAddress = useSelector(selectedAddressSelector);
  const selectedChainId = useSelector(selectChainId);
  const cardFeatureFlag = useSelector(selectCardFeature);

  // Card holder status state
  const [isCardHolderStatus, setIsCardHolderStatus] = useState<boolean | null>(
    null,
  );
  const [isLoadingCardHolder, setIsLoadingCardHolder] = useState(false);

  // Token balances state
  const [tokenBalances, setTokenBalances] = useState<TokenConfig[]>([]);
  const [priorityToken, setPriorityToken] = useState<TokenConfig | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [balancesError, setBalancesError] = useState<Error | null>(null);

  // Geolocation state
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Utility functions
  const checkCardHolderStatus = useCallback(async (): Promise<boolean> => {
    setIsLoadingCardHolder(true);

    if (!selectedAddress || !cardFeatureFlag) {
      return false;
    }

    try {
      const status = await isCardHolder(
        selectedAddress,
        cardFeatureFlag,
        selectedChainId,
      );
      setIsCardHolderStatus(status);
      return status;
    } catch (error) {
      const err = error as Error;
      Logger.error(err, 'Failed to check card holder status');
      return false;
    } finally {
      setIsLoadingCardHolder(false);
    }
  }, [selectedAddress, cardFeatureFlag, selectedChainId]);

  const fetchBalances = useCallback(async () => {
    setIsLoadingBalances(true);
    setBalancesError(null);

    if (!selectedAddress || !cardFeatureFlag) {
      throw new Error('Selected address or card feature flag is not set');
    }

    try {
      const result = await fetchSupportedTokensBalances(
        selectedAddress,
        cardFeatureFlag,
      );
      setTokenBalances(result.balanceList);
      setPriorityToken(result.priorityToken);
      return result;
    } catch (error) {
      const err = error as Error;
      Logger.error(err, 'Failed to fetch token balances');
      setBalancesError(err);
      throw err;
    } finally {
      setIsLoadingBalances(false);
    }
  }, [selectedAddress, cardFeatureFlag]);

  const fetchUserLocation = useCallback(async (): Promise<string> => {
    setIsLoadingLocation(true);

    try {
      const location = await getGeoLocation();
      setUserLocation(location);
      return location;
    } catch (error) {
      const err = error as Error;
      Logger.error(err, 'Failed to fetch user location');
      return '';
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  const contextValue = useMemo(
    (): CardSDK => ({
      // Card holder status
      isCardHolderStatus,
      setIsCardHolderStatus,
      checkCardHolderStatus,

      // Token balances
      tokenBalances,
      setTokenBalances,
      priorityToken,
      setPriorityToken,

      // Geolocation
      userLocation,
      setUserLocation,
      fetchUserLocation,

      // Utility functions
      fetchBalances,

      // Loading states
      isLoadingCardHolder,
      setIsLoadingCardHolder,
      isLoadingBalances,
      setIsLoadingBalances,
      isLoadingLocation,
      setIsLoadingLocation,

      // Error states
      balancesError,
      setBalancesError,

      // Configuration
      config: {
        CACHE_EXPIRATION,
        POLLING_INTERVAL,
      },
    }),
    [
      isCardHolderStatus,
      tokenBalances,
      priorityToken,
      userLocation,
      checkCardHolderStatus,
      fetchBalances,
      fetchUserLocation,
      isLoadingCardHolder,
      isLoadingBalances,
      isLoadingLocation,
      balancesError,
    ],
  );

  return <CardSDKContext.Provider value={value || contextValue} {...props} />;
};

export const useCardSDK = () => {
  const contextValue = useContext(CardSDKContext);
  if (!contextValue) {
    throw new Error('useCardSDK must be used within a CardSDKProvider');
  }
  return contextValue;
};

// HOC wrapper similar to withRampSDK
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withCardSDK = (Component: React.FC) => (props: any) =>
  (
    <CardSDKProvider>
      <Component {...props} />
    </CardSDKProvider>
  );

export default CardSDKContext;
