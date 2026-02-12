import { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  selectTransak,
  selectUserRegion,
  selectPaymentMethods,
} from '../../../../selectors/rampsController';
import { selectDepositProviderApiKey } from '../../../../selectors/featureFlagController/deposit';
import {
  getProviderToken,
  storeProviderToken,
  resetProviderToken,
} from '../Deposit/utils/ProviderTokenVault';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import type {
  TransakAccessToken,
  TransakBuyQuote,
  TransakKycRequirement,
  TransakAdditionalRequirementsResponse,
  TransakDepositOrder,
  TransakUserLimits,
  TransakOttResponse,
  TransakUserDetails,
  TransakQuoteTranslation,
  TransakTranslationRequest,
  TransakIdProofStatus,
  TransakOrderPaymentMethod,
  TransakState,
  PatchUserRequestBody as TransakPatchUserRequestBody,
  TransakOrder,
} from '@metamask/ramps-controller';
import type { UserRegion, PaymentMethod, ResourceState } from '@metamask/ramps-controller';

export interface UseTransakControllerResult {
  transak: TransakState;
  isAuthenticated: boolean;
  userDetails: TransakUserDetails | null;
  userDetailsLoading: boolean;
  userDetailsError: string | null;
  buyQuote: TransakBuyQuote | null;
  buyQuoteLoading: boolean;
  buyQuoteError: string | null;
  kycRequirement: TransakKycRequirement | null;
  kycRequirementLoading: boolean;
  kycRequirementError: string | null;

  userRegion: UserRegion | null;
  selectedPaymentMethod: PaymentMethod | null;

  checkExistingToken: () => Promise<boolean>;
  setAuthToken: (token: TransakAccessToken) => Promise<boolean>;
  logoutFromProvider: (requireServerInvalidation?: boolean) => Promise<void>;

  sendUserOtp: (email: string) => Promise<{
    isTncAccepted: boolean;
    stateToken: string;
    email: string;
    expiresIn: number;
  }>;
  verifyUserOtp: (
    email: string,
    verificationCode: string,
    stateToken: string,
  ) => Promise<TransakAccessToken>;
  getUserDetails: () => Promise<TransakUserDetails>;
  getBuyQuote: (
    fiatCurrency: string,
    cryptoCurrency: string,
    network: string,
    paymentMethod: string,
    fiatAmount: string,
  ) => Promise<TransakBuyQuote>;
  getKycRequirement: (quoteId: string) => Promise<TransakKycRequirement>;
  getAdditionalRequirements: (
    quoteId: string,
  ) => Promise<TransakAdditionalRequirementsResponse>;
  createOrder: (
    quoteId: string,
    walletAddress: string,
    paymentMethodId: string,
  ) => Promise<TransakDepositOrder>;
  getOrder: (
    orderId: string,
    wallet: string,
    paymentDetails?: TransakOrderPaymentMethod[],
  ) => Promise<TransakDepositOrder>;
  getUserLimits: (
    fiatCurrency: string,
    paymentMethod: string,
    kycType: string,
  ) => Promise<TransakUserLimits>;
  requestOtt: () => Promise<TransakOttResponse>;
  generatePaymentWidgetUrl: (
    ottToken: string,
    quote: TransakBuyQuote,
    walletAddress: string,
    extraParams?: Record<string, string>,
  ) => string;
  submitPurposeOfUsageForm: (purpose: string[]) => Promise<void>;
  patchUser: (data: TransakPatchUserRequestBody) => Promise<unknown>;
  getTranslation: (
    request: TransakTranslationRequest,
  ) => Promise<TransakQuoteTranslation>;
  getIdProofStatus: (workFlowRunId: string) => Promise<TransakIdProofStatus>;
  cancelOrder: (depositOrderId: string) => Promise<void>;
  cancelAllActiveOrders: () => Promise<void>;
  getActiveOrders: () => Promise<TransakOrder[]>;
}

function getRampsController() {
  return Engine.context.RampsController;
}

export function useTransakController(): UseTransakControllerResult {
  const transakState = useSelector(selectTransak);
  const userRegion = useSelector(selectUserRegion);
  const paymentMethodsResource: ResourceState<PaymentMethod[], PaymentMethod | null> =
    useSelector(selectPaymentMethods);
  const providerApiKey = useSelector(selectDepositProviderApiKey);

  const apiKeySetRef = useRef(false);

  useEffect(() => {
    if (providerApiKey && !apiKeySetRef.current) {
      getRampsController().transakSetApiKey(providerApiKey);
      apiKeySetRef.current = true;
    }
  }, [providerApiKey]);

  const checkExistingToken = useCallback(async (): Promise<boolean> => {
    try {
      const tokenResponse = await getProviderToken();
      if (tokenResponse.success && tokenResponse.token?.accessToken) {
        getRampsController().transakSetAccessToken(tokenResponse.token);
        return true;
      }
      return false;
    } catch (error) {
      Logger.error(error as Error, 'Error checking existing token');
      return false;
    }
  }, []);

  const setAuthToken = useCallback(
    async (token: TransakAccessToken): Promise<boolean> => {
      try {
        const storeResult = await storeProviderToken(token);
        if (storeResult.success) {
          getRampsController().transakSetAccessToken(token);
          return true;
        }
        return false;
      } catch (error) {
        Logger.error(error as Error, 'Error setting auth token');
        return false;
      }
    },
    [],
  );

  const logoutFromProvider = useCallback(
    async (requireServerInvalidation = true): Promise<void> => {
      try {
        if (requireServerInvalidation) {
          await getRampsController().transakLogout();
        } else {
          getRampsController()
            .transakLogout()
            .catch((error: Error) =>
              Logger.error(
                error,
                'TransakService logout failed but invalidation was not required.',
              ),
            );
        }
      } catch (error) {
        Logger.error(error as Error, 'Error during logout');
      }

      await resetProviderToken();
      getRampsController().transakClearAccessToken();
    },
    [],
  );

  const sendUserOtp = useCallback(async (email: string) => {
    const result = await getRampsController().transakSendUserOtp(email);
    return result;
  }, []);

  const verifyUserOtp = useCallback(
    async (
      email: string,
      verificationCode: string,
      stateToken: string,
    ): Promise<TransakAccessToken> => {
      const token = await getRampsController().transakVerifyUserOtp(
        email,
        verificationCode,
        stateToken,
      );
      await storeProviderToken(token);
      return token;
    },
    [],
  );

  const getUserDetails = useCallback(async () => {
    return getRampsController().transakGetUserDetails();
  }, []);

  const getBuyQuote = useCallback(
    async (
      fiatCurrency: string,
      cryptoCurrency: string,
      network: string,
      paymentMethod: string,
      fiatAmount: string,
    ) => {
      console.log('RAMPS: useTransakController.getBuyQuote called', {
        fiatCurrency,
        cryptoCurrency,
        network,
        paymentMethod,
        paymentMethodType: typeof paymentMethod,
        fiatAmount,
      });
      return getRampsController().transakGetBuyQuote(
        fiatCurrency,
        cryptoCurrency,
        network,
        paymentMethod,
        fiatAmount,
      );
    },
    [],
  );

  const getKycRequirement = useCallback(async (quoteId: string) => {
    return getRampsController().transakGetKycRequirement(quoteId);
  }, []);

  const getAdditionalRequirements = useCallback(async (quoteId: string) => {
    return getRampsController().transakGetAdditionalRequirements(quoteId);
  }, []);

  const createOrder = useCallback(
    async (
      quoteId: string,
      walletAddress: string,
      paymentMethodId: string,
    ) => {
      return getRampsController().transakCreateOrder(
        quoteId,
        walletAddress,
        paymentMethodId,
      );
    },
    [],
  );

  const getOrder = useCallback(
    async (
      orderId: string,
      wallet: string,
      paymentDetails?: TransakOrderPaymentMethod[],
    ) => {
      return getRampsController().transakGetOrder(
        orderId,
        wallet,
        paymentDetails,
      );
    },
    [],
  );

  const getUserLimits = useCallback(
    async (fiatCurrency: string, paymentMethod: string, kycType: string) => {
      return getRampsController().transakGetUserLimits(
        fiatCurrency,
        paymentMethod,
        kycType,
      );
    },
    [],
  );

  const requestOtt = useCallback(async () => {
    return getRampsController().transakRequestOtt();
  }, []);

  const generatePaymentWidgetUrl = useCallback(
    (
      ottToken: string,
      quote: TransakBuyQuote,
      walletAddress: string,
      extraParams?: Record<string, string>,
    ) => {
      return getRampsController().transakGeneratePaymentWidgetUrl(
        ottToken,
        quote,
        walletAddress,
        extraParams,
      );
    },
    [],
  );

  const submitPurposeOfUsageForm = useCallback(
    async (purpose: string[]) => {
      return getRampsController().transakSubmitPurposeOfUsageForm(purpose);
    },
    [],
  );

  const patchUser = useCallback(
    async (data: TransakPatchUserRequestBody) => {
      return getRampsController().transakPatchUser(data);
    },
    [],
  );

  const getTranslation = useCallback(
    async (request: TransakTranslationRequest) => {
      return getRampsController().transakGetTranslation(request);
    },
    [],
  );

  const getIdProofStatus = useCallback(async (workFlowRunId: string) => {
    return getRampsController().transakGetIdProofStatus(workFlowRunId);
  }, []);

  const cancelOrder = useCallback(async (depositOrderId: string) => {
    return getRampsController().transakCancelOrder(depositOrderId);
  }, []);

  const cancelAllActiveOrders = useCallback(async () => {
    return getRampsController().transakCancelAllActiveOrders();
  }, []);

  const getActiveOrders = useCallback(async () => {
    return getRampsController().transakGetActiveOrders();
  }, []);

  return {
    transak: transakState,
    isAuthenticated: transakState.isAuthenticated,
    userDetails: transakState.userDetails.data,
    userDetailsLoading: transakState.userDetails.isLoading,
    userDetailsError: transakState.userDetails.error,
    buyQuote: transakState.buyQuote.data,
    buyQuoteLoading: transakState.buyQuote.isLoading,
    buyQuoteError: transakState.buyQuote.error,
    kycRequirement: transakState.kycRequirement.data,
    kycRequirementLoading: transakState.kycRequirement.isLoading,
    kycRequirementError: transakState.kycRequirement.error,

    userRegion,
    selectedPaymentMethod: paymentMethodsResource.selected,

    checkExistingToken,
    setAuthToken,
    logoutFromProvider,

    sendUserOtp,
    verifyUserOtp,
    getUserDetails,
    getBuyQuote,
    getKycRequirement,
    getAdditionalRequirements,
    createOrder,
    getOrder,
    getUserLimits,
    requestOtt,
    generatePaymentWidgetUrl,
    submitPurposeOfUsageForm,
    patchUser,
    getTranslation,
    getIdProofStatus,
    cancelOrder,
    cancelAllActiveOrders,
    getActiveOrders,
  };
}

export default useTransakController;
