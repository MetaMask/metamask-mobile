import BigNumber from 'bignumber.js';
import React from 'react';

import {
  formatAmount,
  formatAmountMaxPrecision,
} from '../../../../../../../UI/SimulationDetails/formatAmount';
import { calcTokenAmount } from '../../../../../../../../util/transactions';
import { shortenString } from '../../../../../../../../util/notifications';
import TextWithTooltip from '../../../TextWithTooltip';

interface TokenValueProps {
  value: number | string | BigNumber;
  decimals?: number;
}

const TokenValue = ({ value, decimals }: TokenValueProps) => {
  const tokenValue = calcTokenAmount(value, decimals);

  const tokenText = formatAmount('en-US', tokenValue);
  const tokenTextMaxPrecision = formatAmountMaxPrecision('en-US', tokenValue);

  return (
    <TextWithTooltip
      text={shortenString(tokenText, {
        truncatedCharLimit: 15,
        truncatedStartChars: 15,
        truncatedEndChars: 0,
        skipCharacterInEnd: true,
      })}
      tooltip={tokenTextMaxPrecision}
    />
  );
};

export default TokenValue;
