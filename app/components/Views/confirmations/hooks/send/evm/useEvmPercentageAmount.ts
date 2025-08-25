import BN from 'bnjs4';
import {
  AccountInformation,
  getNativeTokenAddress,
} from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import {
  BNToHex,
  fromTokenMinimalUnitString,
  fromWei,
  hexToBN,
} from '../../../../../../util/number/index';
import { selectAccounts } from '../../../../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../../../../selectors/tokenBalancesController';
import { AssetType } from '../../../types/token';
import { useSendContext } from '../../../context/send-context';
import { useGasFeeEstimatesForSend } from '../useGasFeeEstimatesForSend';

const NATIVE_TRANSFER_GAS_LIMIT = 21000;
const GWEI_TO_WEI_CONVERSION_RATE = 1e9;

export interface GasFeeEstimatesType {
  medium: {
    suggestedMaxFeePerGas: number;
  };
}

export const getEstimatedTotalGas = (gasFeeEstimates: GasFeeEstimatesType) => {
  if (!gasFeeEstimates) {
    return new BN(0);
  }
  const {
    medium: { suggestedMaxFeePerGas },
  } = gasFeeEstimates;
  const totalGas = new BN(suggestedMaxFeePerGas * NATIVE_TRANSFER_GAS_LIMIT);
  const conversionrate = new BN(GWEI_TO_WEI_CONVERSION_RATE);
  return totalGas.mul(conversionrate);
};

export interface GetPercentageValueArgs {
  accounts: Record<Hex, AccountInformation>;
  asset?: AssetType;
  contractBalances: Record<Hex, Hex>;
  from: Hex;
  gasFeeEstimates: GasFeeEstimatesType;
  percentage: number;
}

export const getPercentageValueFn = ({
  accounts,
  asset,
  contractBalances,
  from,
  gasFeeEstimates,
  percentage,
}: GetPercentageValueArgs) => {
  if (!asset) {
    return '0';
  }
  const nativeTokenAddressForChainId = getNativeTokenAddress(
    asset.chainId as Hex,
  );
  if (
    nativeTokenAddressForChainId.toLowerCase() === asset.address.toLowerCase()
  ) {
    const estimatedTotalGas = getEstimatedTotalGas(gasFeeEstimates);
    const accountAddress = Object.keys(accounts).find(
      (address) => address.toLowerCase() === from.toLowerCase(),
    ) as Hex;
    const account = accounts[accountAddress];
    let balance = hexToBN(account.balance);
    if (percentage !== 100) {
      balance = balance.mul(new BN(percentage)).div(new BN(100));
    }
    const realPercentageValue = balance.sub(estimatedTotalGas);
    const percentageValue =
      balance.isZero() || realPercentageValue.isNeg()
        ? hexToBN('0x0')
        : realPercentageValue;
    return fromWei(percentageValue);
  }
  let balance = contractBalances[asset.address as Hex];
  if (percentage !== 100) {
    balance = BNToHex(
      hexToBN(balance).mul(new BN(percentage)).div(new BN(100)),
    );
  }
  return fromTokenMinimalUnitString(balance, asset.decimals);
};

export const useEvmPercentageAmount = () => {
  const accounts = useSelector(selectAccounts);
  const contractBalances = useSelector(selectContractBalances);
  const { asset, from } = useSendContext();
  const { gasFeeEstimates } = useGasFeeEstimatesForSend();

  const getEvmPercentageAmount = useCallback(
    (percentage: number) =>
      getPercentageValueFn({
        accounts,
        asset: asset as AssetType,
        contractBalances,
        from: from as Hex,
        gasFeeEstimates: gasFeeEstimates as unknown as GasFeeEstimatesType,
        percentage,
      }),
    [accounts, asset, contractBalances, from, gasFeeEstimates],
  );

  return { getEvmPercentageAmount };
};
