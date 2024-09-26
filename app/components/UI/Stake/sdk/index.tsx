import { useDispatch, useSelector } from 'react-redux';
import Device from '../../../../util/device';
import Logger from '../../../../util/Logger';
import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import type { FC, PropsWithChildren } from 'react';
import {
  chainIdSelector,
  selectedAddressSelector,
} from '../../../../reducers/stake';
import { selectNickname } from '../../../../selectors/networkController';
import {
  updateAmountState,
  updateCurrencyState,
} from '../../../../core/redux/slices/stake';

// to do: move this to the stake-sdk repo
export enum ProtocolType {
  POOLED = 'pooled',
  VALIDATOR = 'validator',
  LIQUID = 'liquid',
}

// to do: move this to the stake-sdk repo
export type StakeSdkParameters = StakeSdkConfig & Context;

// to do: move this to the stake-sdk repo
export interface StakeSdkConfig {
  verbose?: boolean;
  pool?: {
    contractAddress: string;
    abi: string;
  };
  apiUrl?: string;
  context?: Context;
}

// to do: move this to the stake-sdk repo
export declare enum Context {
  Browser = 'browser',
  Extension = 'extension',
  /**
   * @deprecated Prefer MobileAndroid or MobileIOS
   */
  Mobile = 'mobile',
  MobileAndroid = 'mobile-android',
  MobileIOS = 'mobile-ios',
  Payroll = 'payroll',
}

// to do: move this to the stake-sdk repo
export const POOLEDSERVICEABI = '[{}]';

// to do: move this to the stake-sdk repo
export class PooledService {
  public static create(config: {
    abi: string;
    contractAddress: string;
  }): PooledService {
    // to do : check abi+contractAddress
    const pooledService = new PooledService(config.contractAddress, config.abi);
    return pooledService;
  }
  abi: string;
  contractAddress: string;

  constructor(contractAddress: string, abi: string) {
    this.abi = POOLEDSERVICEABI;
    this.contractAddress = contractAddress;
  }
}

// to do: move this to the stake-sdk repo
export class StakeSdk {
  public static create(config: StakeSdkConfig = {}): StakeSdk {
    const verbose = config.verbose || false;
    const pooledContractAddress =
      config?.pool?.contractAddress ||
      '0x0000000000000000000000000000000000000000';
    const pooledAbi = config?.pool?.abi || POOLEDSERVICEABI;
    const apiUrl = config.apiUrl || 'http://localhost:3000';
    const context = config.context || Context.Mobile; // to do : use Device.isAndroid or Device.isIos instead
    const sdk = new StakeSdk(
      apiUrl,
      pooledContractAddress,
      pooledAbi,
      context,
      verbose,
    );
    // logger.setVerbose(verbose)

    return sdk;
  }

  public pooledService: PooledService;
  public sdkConfig: StakeSdkConfig;

  constructor(
    apiUrl: string,
    pooledContractAddress: string,
    pooledAbi: string,
    context: Context,
    verbose: boolean,
  ) {
    this.sdkConfig = {
      verbose,
      context,
      apiUrl,
    };
    this.pooledService = PooledService.create({
      abi: pooledAbi,
      contractAddress: pooledContractAddress,
    });
  }
}

export interface StakeProviderProps {
  protocolType?: ProtocolType;
  stakeCurrency?: string;
}

export const SDK = StakeSdk.create();

export interface Stake {
  sdkError?: Error;
  sdkService?: PooledService; // to do : facade it for other services implementation

  sdkType?: ProtocolType;
  setSdkType: (stakeType: ProtocolType) => void;

  currency?: string | null;
  setCurrency: (currency: string) => void;

  amount?: string | undefined;
  setAmount: (amount: string) => void;

  selectedAddress: string | undefined;
  selectedChainId: string | undefined;
  selectedNetworkName: string | undefined;
}

const initialStakeContext: Stake = {
  sdkError: undefined,
  sdkService: undefined,
  sdkType: undefined,
  setSdkType: undefined as any,
  currency: undefined,
  setCurrency: undefined as any,
  amount: undefined,
  setAmount: undefined as any,
  selectedAddress: undefined,
  selectedChainId: undefined,
  selectedNetworkName: undefined,
};

const STAKEContext = createContext<Stake>(initialStakeContext);
export const useStakeContext = () => useContext(STAKEContext);

export const StakeSDKProvider: FC<PropsWithChildren<StakeProviderProps>> = ({
  children,
  stakeCurrency,
  protocolType,
  ...props
}) => {
  // from react state
  const [sdkService, setSdkService] = useState<PooledService>();
  const [sdkError, setSdkError] = useState<Error>();
  const [currency, setCurrency] = useState<string>(stakeCurrency ?? 'ETH');
  const [amount, setAmount] = useState<string>();
  const [sdkType, setSdkType] = useState(protocolType ?? ProtocolType.POOLED);

  // from redux state
  const selectedAddress = useSelector(selectedAddressSelector);
  const selectedChainId = useSelector(chainIdSelector);
  const selectedNetworkName = useSelector(selectNickname);
  const dispatch = useDispatch();

  const setAmountCallback = useCallback(
    (amount: string) => {
      setAmount(amount);
      dispatch(updateAmountState(amount));
    },
    [dispatch],
  );

  const setCurrencyCallback = useCallback(
    (currency: string) => {
      setCurrency(currency);
      dispatch(updateCurrencyState(currency));
    },
    [dispatch],
  );

  useEffect(() => {
    (async () => {
      try {
        if (sdkType === ProtocolType.POOLED) {
          setSdkService(SDK.pooledService);
        } else {
          const notImplementedError = new Error(
            `StakeSDKProvider SDK.protocolType ${sdkType} not implemented yet`,
          );
          Logger.error(notImplementedError);
          setSdkError(notImplementedError);
        }
      } catch (error) {
        Logger.error(error as Error, `StakeSDKProvider SDK.service failed`);
        setSdkError(error as Error);
      }
    })();
  }, [sdkType]);

  const contextValue = useMemo(
    (): Stake => ({
      sdkError,
      sdkService,
      sdkType,
      setSdkType,
      currency,
      setCurrency: setCurrencyCallback,
      amount,
      setAmount: setAmountCallback,
      selectedAddress,
      selectedChainId,
      selectedNetworkName,
    }),
    [],
  );
  return (
    <STAKEContext.Provider
      value={{
        sdkError,
        sdkService,
        sdkType,
        setSdkType,
        currency,
        setCurrency: setCurrencyCallback,
        amount,
        setAmount: setAmountCallback,
        selectedAddress,
        selectedChainId,
        selectedNetworkName,
      }}
    >
      {children}
    </STAKEContext.Provider>
  );
};

export default STAKEContext;
