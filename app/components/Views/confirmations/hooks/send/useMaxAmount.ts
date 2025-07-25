import BN from 'bnjs4';
import { AccountInformation } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import {
  fromTokenMinimalUnitString,
  fromWei,
  hexToBN,
} from '../../../../../util/number/index';
import { selectAccounts } from '../../../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../../../selectors/tokenBalancesController';
import { AssetType } from '../../types/token';
import { isNativeToken } from '../../utils/generic';
import { useGasFeeEstimates } from '../gas/useGasFeeEstimates';

const NATIVE_TRANSFER_GAS_LIMIT = 21000;
const GWEI_TO_WEI_CONVERSION_RATE = 1e9;

interface GasFeeEstimatesType {
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

export const getMaxValueFn = ({
  accounts,
  asset,
  contractBalances,
  from,
  gasFeeEstimates,
}: {
  accounts: Record<Hex, AccountInformation>;
  asset?: AssetType;
  contractBalances: Record<Hex, Hex>;
  from: Hex;
  gasFeeEstimates: GasFeeEstimatesType;
}) => {
  if (!asset) {
    return '0';
  }
  if (isNativeToken(asset)) {
    const estimatedTotalGas = getEstimatedTotalGas(gasFeeEstimates);
    const accountAddress = Object.keys(accounts).find(
      (address) => address.toLowerCase() === from.toLowerCase(),
    ) as Hex;
    const account = accounts[accountAddress];
    const balance = hexToBN(account.balance);
    const realMaxValue = balance.sub(estimatedTotalGas);
    const maxValue =
      balance.isZero() || realMaxValue.isNeg() ? hexToBN('0x0') : realMaxValue;
    return fromWei(maxValue);
  }
  return fromTokenMinimalUnitString(
    contractBalances[asset.address as Hex],
    asset.decimals,
  );
};

const useMaxAmount = (networkClientId?: string) => {
  const { gasFeeEstimates } = useGasFeeEstimates(networkClientId ?? '');
  const accounts = useSelector(selectAccounts);
  const contractBalances = useSelector(selectContractBalances);

  const getMaxValue = useCallback(
    (from: Hex, asset?: AssetType) => {
      return getMaxValueFn({
        accounts,
        asset,
        contractBalances,
        from,
        gasFeeEstimates: gasFeeEstimates as unknown as GasFeeEstimatesType,
      });
    },
    [accounts, contractBalances, gasFeeEstimates],
  );

  return { getMaxValue };
};

export default useMaxAmount;
