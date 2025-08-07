import BN from 'bnjs4';
import { AccountInformation } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import {
  fromTokenMinimalUnitString,
  fromWei,
  hexToBN,
} from '../../../../../../util/number/index';
import { selectAccounts } from '../../../../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../../../../selectors/tokenBalancesController';
import { AssetType } from '../../../types/token';
import { isNativeToken } from '../../../utils/generic';
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

export interface GetMaxValueArgs {
  accounts: Record<Hex, AccountInformation>;
  asset?: AssetType;
  contractBalances: Record<Hex, Hex>;
  from: Hex;
  gasFeeEstimates: GasFeeEstimatesType;
}

export const getMaxValueFn = ({
  accounts,
  asset,
  contractBalances,
  from,
  gasFeeEstimates,
}: GetMaxValueArgs) => {
  if (!asset) {
    return { maxAmount: '0', balance: '0' };
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
    return {
      maxAmount: fromWei(maxValue),
      balance: fromWei(balance),
    };
  }
  const balance = fromTokenMinimalUnitString(
    contractBalances[asset.address as Hex],
    asset.decimals,
  );
  return { maxAmount: balance, balance };
};

export const useEvmMaxAmount = () => {
  const accounts = useSelector(selectAccounts);
  const contractBalances = useSelector(selectContractBalances);
  const { asset, from } = useSendContext();
  const { gasFeeEstimates } = useGasFeeEstimatesForSend();

  const getEvmMaxAmount = useCallback(
    () =>
      getMaxValueFn({
        accounts,
        asset,
        contractBalances,
        from: from as Hex,
        gasFeeEstimates: gasFeeEstimates as unknown as GasFeeEstimatesType,
      }),
    [accounts, asset, contractBalances, from, gasFeeEstimates],
  );

  return { getEvmMaxAmount };
};
