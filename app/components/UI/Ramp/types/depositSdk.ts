import type {
  DepositCryptoCurrency,
  DepositPaymentMethod,
  DepositRegion,
  NativeTransakAccessToken,
} from './legacyDeposit';
import type { DepositNavigationParams } from './depositNavigationParams';

export interface DepositSDK {
  sdkError?: Error;
  providerApiKey: string | null;
  isAuthenticated: boolean;
  authToken?: NativeTransakAccessToken;
  setAuthToken: (token: NativeTransakAccessToken) => Promise<boolean>;
  logoutFromProvider: (requireServerInvalidation?: boolean) => Promise<void>;
  checkExistingToken: () => Promise<boolean>;
  selectedWalletAddress: string | null;
  selectedRegion: DepositRegion | null;
  setSelectedRegion: (region: DepositRegion | null) => void;
  selectedPaymentMethod: DepositPaymentMethod | null;
  setSelectedPaymentMethod: (paymentMethod: DepositPaymentMethod) => void;
  selectedCryptoCurrency: DepositCryptoCurrency | null;
  setSelectedCryptoCurrency: (cryptoCurrency: DepositCryptoCurrency) => void;
  intent?: DepositNavigationParams;
  setIntent: (
    intentOrSetter:
      | DepositNavigationParams
      | ((
          previousIntent: DepositNavigationParams | undefined,
        ) => DepositNavigationParams | undefined)
      | undefined,
  ) => void;
}
