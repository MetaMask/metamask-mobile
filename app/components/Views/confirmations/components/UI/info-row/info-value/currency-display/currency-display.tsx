import BigNumber from 'bignumber.js';
import React from 'react';
import { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';

import { strings } from '../../../../../../../../../locales/i18n';
import { RootState } from '../../../../../../../../reducers';
import { calcTokenAmount } from '../../../../../../../../util/transactions';
import { shortenString } from '../../../../../../../../util/notifications';
import { selectNativeCurrencyByChainId } from '../../../../../../../../selectors/networkController';
import {
  formatAmount,
  formatAmountMaxPrecision,
} from '../../../../../../../UI/SimulationDetails/formatAmount';
import TextWithTooltip from '../../../text-with-tooltip';

const EVM_NATIVE_TOKEN_DECIMALS = 18;

interface CurrencyDisplayProps {
  chainId?: Hex;
  value: number | string | BigNumber;
}

// Current implementation of the component support only native currenct for chainId provided
// but this can be extended to support non-native currencies also.

const CurrencyDisplay = ({ chainId, value }: CurrencyDisplayProps) => {
  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, chainId),
  );
  const tokenValue = calcTokenAmount(value, EVM_NATIVE_TOKEN_DECIMALS);
  const tokenText = formatAmount('en-US', tokenValue);
  const tokenTextMaxPrecision = formatAmountMaxPrecision('en-US', tokenValue);

  return (
    <TextWithTooltip
      label={strings('confirm.label.value')}
      text={`${shortenString(tokenText, {
        truncatedCharLimit: 15,
        truncatedStartChars: 15,
        truncatedEndChars: 0,
        skipCharacterInEnd: true,
      })} ${nativeCurrency}`}
      tooltip={tokenTextMaxPrecision}
    />
  );
};

export default CurrencyDisplay;
