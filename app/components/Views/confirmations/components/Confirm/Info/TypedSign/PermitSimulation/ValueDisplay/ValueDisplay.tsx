import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import { IndividualFiatDisplay } from '../../../../../../../../UI/SimulationDetails/FiatDisplay/FiatDisplay';
import {
  formatAmount,
  formatAmountMaxPrecision,
} from '../../../../../../../../UI/SimulationDetails/formatAmount';
import { useGetTokenStandardAndDetails } from '../../../../../../hooks/useGetTokenStandardAndDetails';
import useTrackERC20WithoutDecimalInformation from '../../../../../../hooks/useTrackERC20WithoutDecimalInformation';
import { TokenDetailsERC20 } from '../../../../../../utils/token';

import Box from '../../../../../../../../UI/Ramp/components/Box';
import Address from '../../../../../UI/InfoRow/InfoValue/Address/Address';
import Text from '../../../../../../../../../component-library/components/Texts/Text';

import { selectContractExchangeRates } from '../../../../../../../../../selectors/tokenRatesController';

import Logger from '../../../../../../../../../util/Logger';
import { shortenString } from '../../../../../../../../../util/notifications/methods/common';
import { calcTokenAmount } from '../../../../../../../../../util/transactions';

import { useTheme } from '../../../../../../../../../util/theme';
import styleSheet from './ValueDisplay.styles';

interface PermitSimulationValueDisplayParams {
  /** ID of the associated chain. */
  chainId: Hex;

  /**
   * The ethereum token contract address. It is expected to be in hex format.
   * We currently accept strings since we have a patch that accepts a custom string
   * {@see .yarn/patches/@metamask-eth-json-rpc-middleware-npm-14.0.1-b6c2ccbe8c.patch}
   */
  tokenContract: Hex | string | undefined;

  // Optional

  /** True if value is being credited to wallet */
  credit?: boolean;

  /** True if value is being debited to wallet */
  debit?: boolean;

  /** The primaryType of the typed sign message */
  primaryType?: string;

  /** The tokenId for NFT */
  tokenId?: string;

  /** The token amount */
  value?: number | string;
}

const PermitSimulationValueDisplay: React.FC<
  PermitSimulationValueDisplayParams
> = ({
  chainId,
  primaryType,
  tokenContract,
  tokenId,
  value,
  credit,
  debit,
}) => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);

  const contractExchangeRates = useSelector(selectContractExchangeRates);
  const exchangeRate =
    tokenContract && contractExchangeRates
      ? contractExchangeRates[tokenContract as `0x${string}`]?.price
      : undefined;

  const tokenDetails = useGetTokenStandardAndDetails(tokenContract);
  const { decimalsNumber: tokenDecimals } = tokenDetails;

  useTrackERC20WithoutDecimalInformation(
    chainId,
    tokenContract,
    tokenDetails as TokenDetailsERC20,
  );

  const fiatValue = useMemo(() => {
    if (exchangeRate && value && !tokenId) {
      const tokenAmount = calcTokenAmount(value, tokenDecimals);
      return tokenAmount.multipliedBy(exchangeRate).toNumber();
    }
    return undefined;
  }, [exchangeRate, tokenDecimals, tokenId, value]);

  const { tokenValue, tokenValueMaxPrecision } = useMemo(() => {
    if (!value || tokenId) {
      return { tokenValue: null, tokenValueMaxPrecision: null };
    }

    const tokenAmount = calcTokenAmount(value, tokenDecimals);

    return {
      tokenValue: formatAmount('en-US', tokenAmount),
      tokenValueMaxPrecision: formatAmountMaxPrecision('en-US', tokenAmount),
    };
  }, [tokenDecimals, tokenId, value]);

  /** Temporary error capturing as we are building out Permit Simulations */
  if (!tokenContract) {
    Logger.error(
      new Error(
        `PermitSimulationValueDisplay: Token contract address is missing where primaryType === ${primaryType}`,
      ),
    );
    return null;
  }

  return (
    <Box style={styles.wrapper}>
      <Box style={styles.flexRowTokenValueAndAddress}>
        {/* TODO: add tooltip + precision */}
        <View style={styles.valueAndAddress}>
          <Text style={[credit && styles.valueIsCredit, debit && styles.valueIsDebit]}>
            {credit && '+ '}
            {debit && '- '}
            {tokenValue !== null &&
              shortenString(tokenValue || '', {
                truncatedCharLimit: 15,
                truncatedStartChars: 15,
                truncatedEndChars: 0,
                skipCharacterInEnd: true,
              })}
            {tokenId && `#${tokenId}`}
          </Text>
        </View>
        <Address address={tokenContract} chainId={chainId} style={styles.tokenAddress} />
      </Box>
      <Box compact noBorder>
        {/* TODO - add fiat shorten prop */}
        {fiatValue && <IndividualFiatDisplay fiatAmount={fiatValue} /* shorten*/ />}
      </Box>
    </Box>
  );
};

export default PermitSimulationValueDisplay;
