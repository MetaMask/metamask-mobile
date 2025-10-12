import { useCallback, useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import {
  selectCardAccountState,
  selectIsCardholder,
  selectIsAuthenticated,
  selectUserCardLocation,
  selectIsCardFeatureEnabled,
  selectIsBaanxLoginEnabled,
} from '../../../../selectors/cardController';
import { RootState } from '../../../../reducers';
import Logger from '../../../../util/Logger';
import {
  CardLoadingPhase,
  CardDataSource,
  type CardTokenAllowanceState,
  type CardDetailsResponse,
  type GetPriorityTokenParams,
  type GetCardDetailsParams,
  type AuthenticateParams,
  type InitiateLoginParams,
  type ExchangeTokenParams,
  type AuthorizeParams,
  type RefreshTokenParams,
  type SupportedToken,
  CardExchangeTokenResponse,
  CardLoginResponse,
  CardLoginInitiateResponse,
  CardAuthorizeResponse,
} from '../../../../core/Engine/controllers/card-controller/types';

interface UseCardControllerResult {
  // Authentication state (global)
  isAuthenticated: boolean;
  userCardLocation: 'us' | 'international' | null;
  // Per-wallet cardholder status
  isCardholder: boolean;
  isBaanxLoginEnabled: boolean;
  isFeatureEnabled: boolean;

  // Data
  priorityToken: CardTokenAllowanceState | null;
  cardDetails: CardDetailsResponse | null;
  needsProvisioning: boolean;
  supportedTokens: SupportedToken[];

  // Loading states
  loadingPhase: CardLoadingPhase;
  isLoading: boolean;

  // Error states
  hasErrors: boolean;
  error: string | null;

  // Data source strategy
  dataSource: CardDataSource;

  // Actions
  fetchPriorityToken: (
    forceRefresh?: boolean,
  ) => Promise<CardTokenAllowanceState | null>;
  fetchCardDetails: () => Promise<CardDetailsResponse | null>;
  authenticateUser: (params: AuthenticateParams) => Promise<CardLoginResponse>;
  initiateLogin: (
    params: InitiateLoginParams,
  ) => Promise<CardLoginInitiateResponse>;
  exchangeToken: (
    params: ExchangeTokenParams,
  ) => Promise<CardExchangeTokenResponse>;
  authorize: (params: AuthorizeParams) => Promise<CardAuthorizeResponse>;
  refreshToken: (
    params: RefreshTokenParams,
  ) => Promise<CardExchangeTokenResponse>;
  logout: () => Promise<void>;
  resetRetries: () => void;
}

/**
 * Hook that provides access to CardController functionality
 * This replaces the old useCardAggregatedData hook
 */
export const useCardController = (): UseCardControllerResult => {
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:0',
  )?.address;

  // Get state from Redux selectors
  const isFeatureEnabled = useSelector(selectIsCardFeatureEnabled);
  const isBaanxLoginEnabled = useSelector(selectIsBaanxLoginEnabled);
  const accountState = useSelector((state: RootState) =>
    selectedAddress ? selectCardAccountState(state, selectedAddress) : null,
  );
  const isCardholder = useSelector((state: RootState) =>
    selectedAddress ? selectIsCardholder(state, selectedAddress) : false,
  );
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userCardLocation = useSelector(selectUserCardLocation);

  // Debug: Log when Redux state changes
  useEffect(() => {
    Logger.log('useCardController: Redux state updated', {
      selectedAddress,
      isCardholder,
      isAuthenticated,
      userCardLocation,
      isFeatureEnabled,
      isBaanxLoginEnabled,
    });
  }, [
    selectedAddress,
    isCardholder,
    isAuthenticated,
    userCardLocation,
    isFeatureEnabled,
    isBaanxLoginEnabled,
  ]);

  // Local state for data and loading
  const [priorityToken, setPriorityToken] =
    useState<CardTokenAllowanceState | null>(null);
  const [cardDetails, setCardDetails] = useState<CardDetailsResponse | null>(
    null,
  );
  const [needsProvisioning, setNeedsProvisioning] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<CardLoadingPhase>(
    CardLoadingPhase.INITIALIZING,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supportedTokens = useMemo(() => {
    try {
      return Engine.controllerMessenger.call(
        'CardController:getSupportedTokens',
      );
    } catch {
      return [];
    }
  }, []);

  // Determine data source strategy based on authentication
  const dataSource = useMemo((): CardDataSource => {
    if (isBaanxLoginEnabled && isAuthenticated) {
      return CardDataSource.API;
    }
    return CardDataSource.ON_CHAIN;
  }, [isBaanxLoginEnabled, isAuthenticated]);

  // Actions
  const fetchPriorityToken = useCallback(
    async (
      forceRefresh: boolean = false,
    ): Promise<CardTokenAllowanceState | null> => {
      if (!selectedAddress) return null;

      try {
        setError(null);
        const params: GetPriorityTokenParams = {
          address: selectedAddress,
          dataSource,
          forceRefresh,
        };

        const token = await Engine.controllerMessenger.call(
          'CardController:getPriorityToken',
          params,
        );

        setPriorityToken(token);
        return token;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch priority token';
        Logger.log('useCardController: Error fetching priority token:', err);
        setError(errorMessage);
        return null;
      }
    },
    [selectedAddress, dataSource],
  );

  const fetchCardDetails =
    useCallback(async (): Promise<CardDetailsResponse | null> => {
      if (!isAuthenticated) return null;

      try {
        setError(null);
        const params: GetCardDetailsParams = {};

        const detailsJson = await Engine.controllerMessenger.call(
          'CardController:getCardDetails',
          params,
        );

        const details = detailsJson ? JSON.parse(detailsJson) : null;
        setCardDetails(details);
        setNeedsProvisioning(details === null);
        return details;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch card details';
        Logger.log('useCardController: Error fetching card details:', err);

        if (errorMessage.includes('User has no card')) {
          setNeedsProvisioning(true);
          setCardDetails(null);
        } else {
          setError(errorMessage);
        }
        return null;
      }
    }, [isAuthenticated]);

  const authenticateUser = useCallback(async (params: AuthenticateParams) => {
    try {
      setError(null);
      return await Engine.controllerMessenger.call(
        'CardController:authenticate',
        params,
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Authentication failed';
      Logger.log('useCardController: Error authenticating:', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const initiateLogin = useCallback(async (params: InitiateLoginParams) => {
    try {
      setError(null);
      return await Engine.controllerMessenger.call(
        'CardController:initiateLogin',
        params,
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initiate login';
      Logger.log('useCardController: Error initiating login:', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const exchangeToken = useCallback(async (params: ExchangeTokenParams) => {
    try {
      setError(null);
      return await Engine.controllerMessenger.call(
        'CardController:exchangeToken',
        params,
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Token exchange failed';
      Logger.log('useCardController: Error exchanging token:', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const authorize = useCallback(async (params: AuthorizeParams) => {
    try {
      setError(null);
      return await Engine.controllerMessenger.call(
        'CardController:authorize',
        params,
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Authorization failed';
      Logger.log('useCardController: Error authorizing:', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const refreshToken = useCallback(async (params: RefreshTokenParams) => {
    try {
      setError(null);
      return await Engine.controllerMessenger.call(
        'CardController:refreshToken',
        params,
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Token refresh failed';
      Logger.log('useCardController: Error refreshing token:', err);
      setError(errorMessage);
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    if (!selectedAddress) return;

    try {
      setError(null);
      await Engine.controllerMessenger.call('CardController:logout');

      // Reset local state
      setPriorityToken(null);
      setCardDetails(null);
      setNeedsProvisioning(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      Logger.log('useCardController: Error logging out:', err);
      setError(errorMessage);
      throw err;
    }
  }, [selectedAddress]);

  const resetRetries = useCallback(() => {
    setError(null);
  }, []);

  // Initialize data on mount and when dependencies change
  useEffect(() => {
    const initializeData = async () => {
      if (!isFeatureEnabled) {
        setLoadingPhase(CardLoadingPhase.COMPLETE);
        setIsLoading(false);
        return;
      }

      if (!selectedAddress) {
        setLoadingPhase(CardLoadingPhase.COMPLETE);
        setIsLoading(false);
        return;
      }

      try {
        setLoadingPhase(CardLoadingPhase.AUTHENTICATING);
        setIsLoading(true);

        // Set active account in controller
        Engine.controllerMessenger.call(
          'CardController:setActiveAccount',
          selectedAddress,
        );

        // Note: Cardholder status is checked globally via useCardholderCheck hook

        setLoadingPhase(CardLoadingPhase.FETCHING_DATA);

        // Fetch priority token
        await fetchPriorityToken();

        // Fetch card details if authenticated
        if (isAuthenticated && isBaanxLoginEnabled) {
          await fetchCardDetails();
        }

        setLoadingPhase(CardLoadingPhase.COMPLETE);
      } catch (err) {
        Logger.log('useCardController: Error during initialization:', err);
        setError(err instanceof Error ? err.message : 'Initialization failed');
        setLoadingPhase(CardLoadingPhase.COMPLETE);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [
    isFeatureEnabled,
    selectedAddress,
    isAuthenticated,
    isBaanxLoginEnabled,
    fetchPriorityToken,
    fetchCardDetails,
  ]);

  // Update priority token from account state
  useEffect(() => {
    if (accountState?.priorityToken) {
      setPriorityToken(accountState.priorityToken);
    }
  }, [accountState]);

  // Update card details from account state
  useEffect(() => {
    if (!accountState) return;

    if (accountState.cardDetailsJson) {
      try {
        const cardDetailsParsed = JSON.parse(accountState.cardDetailsJson);
        setCardDetails(cardDetailsParsed);
        setNeedsProvisioning(false);
      } catch (err) {
        Logger.log('useCardController: Error parsing card details JSON:', err);
        setCardDetails(null);
        setNeedsProvisioning(true);
      }
    } else if (accountState.needsProvisioning) {
      setNeedsProvisioning(true);
      setCardDetails(null);
    }
  }, [accountState]);

  const hasErrors = Boolean(error);

  return {
    // Authentication state
    isAuthenticated,
    userCardLocation,
    isCardholder,
    isBaanxLoginEnabled,
    isFeatureEnabled,

    // Data
    priorityToken,
    cardDetails,
    needsProvisioning,
    supportedTokens,

    // Loading states
    loadingPhase,
    isLoading,

    // Error states
    hasErrors,
    error,

    // Data source strategy
    dataSource,

    // Actions
    fetchPriorityToken,
    fetchCardDetails,
    authenticateUser,
    initiateLogin,
    exchangeToken,
    authorize,
    refreshToken,
    logout,
    resetRetries,
  };
};
