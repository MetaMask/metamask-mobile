import { useSelector } from 'react-redux';
import { useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';
import useCardDetails from './useCardDetails';
import { useGetPriorityCardToken } from './useGetPriorityCardToken';
import useGetCardExternalWalletDetails from './useGetCardExternalWalletDetails';
import useGetDelegationSettings from './useGetDelegationSettings';
import useGetLatestAllowanceForPriorityToken from './useGetLatestAllowanceForPriorityToken';
import useGetUserKYCStatus from './useGetUserKYCStatus';
import { CardTokenAllowance, CardStateWarning } from '../types';
import { cardQueries } from '../queries';

const useLoadCardData = () => {
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);
  const isBaanxLoginEnabled = useIsBaanxLoginEnabled();
  const queryClient = useQueryClient();
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:0',
  )?.address;

  const {
    data: delegationSettings,
    isLoading: isLoadingDelegationSettings,
    error: delegationSettingsError,
    fetchData: fetchDelegationSettings,
  } = useGetDelegationSettings();

  const {
    data: externalWalletDetailsData,
    isLoading: isLoadingExternalWalletDetails,
    error: externalWalletDetailsError,
    fetchData: fetchExternalWalletDetails,
  } = useGetCardExternalWalletDetails(delegationSettings);

  const {
    priorityToken,
    allTokensWithAllowances,
    isLoading: isLoadingPriorityToken,
    error: priorityTokenError,
    warning: priorityTokenWarning,
  } = useGetPriorityCardToken(externalWalletDetailsData);

  const {
    latestAllowance: priorityTokenLatestAllowance,
    isLoading: isLoadingLatestAllowance,
  } = useGetLatestAllowanceForPriorityToken(
    isAuthenticated ? priorityToken : null,
  );

  const {
    kycStatus,
    isLoading: isLoadingKYCStatus,
    error: kycStatusError,
    fetchKYCStatus,
  } = useGetUserKYCStatus();

  const priorityTokenWithLatestAllowance = useMemo(() => {
    if (!priorityToken || !isAuthenticated) {
      return priorityToken;
    }

    return {
      ...priorityToken,
      totalAllowance: priorityTokenLatestAllowance || priorityToken.allowance,
    };
  }, [priorityToken, priorityTokenLatestAllowance, isAuthenticated]);

  const {
    cardDetails,
    isLoading: isLoadingCardDetails,
    error: cardDetailsError,
    warning: cardDetailsWarning,
    fetchCardDetails: fetchCardDetailsQuery,
  } = useCardDetails();

  const allTokens: CardTokenAllowance[] = useMemo(() => {
    if (isAuthenticated) {
      return externalWalletDetailsData?.mappedWalletDetails || [];
    }
    return allTokensWithAllowances || [];
  }, [externalWalletDetailsData, isAuthenticated, allTokensWithAllowances]);

  const isLoading = useMemo(() => {
    const baseLoading =
      isLoadingPriorityToken ||
      isLoadingCardDetails ||
      isLoadingDelegationSettings;

    if (isAuthenticated) {
      return (
        baseLoading ||
        isLoadingExternalWalletDetails ||
        isLoadingLatestAllowance ||
        isLoadingKYCStatus
      );
    }
    return baseLoading;
  }, [
    isLoadingPriorityToken,
    isLoadingCardDetails,
    isLoadingDelegationSettings,
    isLoadingExternalWalletDetails,
    isLoadingLatestAllowance,
    isLoadingKYCStatus,
    isAuthenticated,
  ]);

  const error = useMemo(() => {
    const baseError = priorityTokenError;

    if (isAuthenticated) {
      return (
        baseError ||
        externalWalletDetailsError ||
        kycStatusError ||
        delegationSettingsError ||
        cardDetailsError
      );
    }
    return baseError || delegationSettingsError || cardDetailsError;
  }, [
    priorityTokenError,
    delegationSettingsError,
    externalWalletDetailsError,
    kycStatusError,
    isAuthenticated,
    cardDetailsError,
  ]);

  const warning = useMemo(() => {
    if (cardDetailsWarning === CardStateWarning.NoCard) {
      return cardDetailsWarning;
    }
    return priorityTokenWarning || cardDetailsWarning;
  }, [priorityTokenWarning, cardDetailsWarning]);

  const fetchRef = useRef({
    fetchDelegationSettings,
    fetchExternalWalletDetails,
    fetchCardDetails: fetchCardDetailsQuery,
    fetchKYCStatus,
  });
  fetchRef.current = {
    fetchDelegationSettings,
    fetchExternalWalletDetails,
    fetchCardDetails: fetchCardDetailsQuery,
    fetchKYCStatus,
  };

  const fetchAllData = useCallback(async () => {
    if (isAuthenticated) {
      const fns = fetchRef.current;
      try {
        await fns.fetchDelegationSettings();
      } catch {
        // Delegation settings uses queryClient.fetchQuery which throws on
        // error. Catch here so independent sibling fetches still run.
      }
      await Promise.all([
        fns.fetchExternalWalletDetails(),
        fns.fetchCardDetails(),
        fns.fetchKYCStatus(),
      ]);
    } else if (selectedAddress) {
      await queryClient.refetchQueries({
        queryKey:
          cardQueries.dashboard.keys.priorityTokenOnChain(selectedAddress),
      });
    }
  }, [queryClient, isAuthenticated, selectedAddress]);

  const fetchCardDetails = useCallback(async () => {
    await fetchRef.current.fetchCardDetails();
  }, []);

  return {
    priorityToken: priorityTokenWithLatestAllowance,
    allTokens,
    cardDetails,
    delegationSettings: isAuthenticated ? delegationSettings : null,
    externalWalletDetailsData: isAuthenticated
      ? externalWalletDetailsData
      : null,
    kycStatus: isAuthenticated ? kycStatus : null,
    isLoading,
    error,
    warning,
    isAuthenticated,
    isBaanxLoginEnabled,
    fetchAllData,
    fetchCardDetails,
  };
};

export default useLoadCardData;
