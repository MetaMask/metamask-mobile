import { useDispatch, useSelector } from 'react-redux';
import { PooledService, ProtocolType, StakeSdk } from '@metamask/stake-sdk';
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
} from '../../../../core/redux/slices/stake';
import useBalance from '../hooks/useBalance';
import BN from 'bn.js';
import { toWei, weiToFiatNumber } from '../../../../util/number';

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

  amount: string;
  setAmount: (amount: string) => void;

  amountBN: BN;
  setAmountBN: (amount: BN) => void;

  fiatAmount: string;
  setFiatAmount: (amount: string) => void;

  selectedAddress: string | undefined;
  selectedChainId: string | undefined;
  selectedNetworkName: string | undefined;

  balance: string | undefined;
  balanceBN: BN | undefined;
  balanceFiatNumber: number | undefined;

  conversionRate: number;
  currentCurrency: string;
  estimatedAnnualRewards: string;
  setEstimatedAnnualRewards: (value: string) => void;
}

const STAKEContext = createContext<Stake | undefined>(undefined);

export const useStakeContext = () => {
  const context = useContext(STAKEContext);
  return context as Stake;
};

export const StakeSDKProvider: FC<PropsWithChildren<StakeProviderProps>> = ({
  children,
  stakeCurrency,
  protocolType,
  ...props
}) => {
  // from react state
  const [sdkService, setSdkService] = useState<PooledService>();
  const [sdkError, setSdkError] = useState<Error>();
  const [amount, setAmount] = useState<string>('0');
  const [amountBN, setAmountBN] = useState<BN>(new BN(0));
  const [fiatAmount, setFiatAmount] = useState('0');
  const [estimatedAnnualRewards, setEstimatedAnnualRewards] = useState('-');

  const [sdkType, setSdkType] = useState(protocolType ?? ProtocolType.POOLED);

  // from redux state
  const selectedAddress = useSelector(selectedAddressSelector);
  const selectedChainId = useSelector(chainIdSelector);
  const selectedNetworkName = useSelector(selectNickname);
  const {
    balance,
    balanceBN,
    balanceFiatNumber,
    conversionRate,
    currentCurrency,
  } = useBalance();
  const dispatch = useDispatch();

  // from stake sdk

  const setAmountCallback = useCallback(
    (value: string) => {
      setAmount(value);
      setAmountBN(toWei(value, 'ether'));
      const fiatValue = weiToFiatNumber(
        toWei(value, 'ether'),
        conversionRate,
        2,
      ).toString();
      setFiatAmount(fiatValue);
      dispatch(updateAmountState(amount));
    },
    [dispatch, conversionRate],
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

  const stakeContextValue = useMemo(
    (): Stake => ({
      sdkError,
      sdkService,
      sdkType,
      setSdkType,
      amount,
      setAmount: setAmountCallback,
      amountBN,
      setAmountBN,
      fiatAmount,
      setFiatAmount,
      selectedAddress,
      selectedChainId,
      selectedNetworkName,
      balance,
      balanceBN,
      balanceFiatNumber,
      conversionRate,
      currentCurrency,
      estimatedAnnualRewards,
      setEstimatedAnnualRewards
    }),
    [
      sdkError,
      sdkService,
      sdkType,
      setSdkType,
      amount,
      setAmountCallback,
      amountBN,
      setAmountBN,
      fiatAmount,
      setFiatAmount,
      selectedAddress,
      selectedChainId,
      selectedNetworkName,
      balance,
      balanceBN,
      balanceFiatNumber,
      conversionRate,
      currentCurrency,
      estimatedAnnualRewards,
      setEstimatedAnnualRewards
    ],
  );
  return (
    <STAKEContext.Provider value={stakeContextValue}>
      {children}
    </STAKEContext.Provider>
  );
};

export default STAKEContext;
