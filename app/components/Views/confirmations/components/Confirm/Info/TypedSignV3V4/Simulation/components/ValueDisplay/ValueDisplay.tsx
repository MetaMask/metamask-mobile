import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { NetworkClientId } from '@metamask/network-controller';
import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

import ButtonPill from '../../../../../../../../../../component-library/components-temp/Buttons/ButtonPill/ButtonPill';
import { ButtonIconSizes } from '../../../../../../../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.types';
import ButtonIcon from '../../../../../../../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../../../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../../../../../component-library/components/Texts/Text';

import { IndividualFiatDisplay } from '../../../../../../../../../UI/SimulationDetails/FiatDisplay/FiatDisplay';
import {
  formatAmount,
  formatAmountMaxPrecision,
} from '../../../../../../../../../UI/SimulationDetails/formatAmount';

import Address from '../../../../../../UI/InfoRow/InfoValue/Address/Address';

import Logger from '../../../../../../../../../../util/Logger';
import { shortenString } from '../../../../../../../../../../util/notifications/methods/common';
import { isNumberValue } from '../../../../../../../../../../util/number';
import { useTheme } from '../../../../../../../../../../util/theme';
import { calcTokenAmount } from '../../../../../../../../../../util/transactions';

import { useGetTokenStandardAndDetails } from '../../../../../../../hooks/useGetTokenStandardAndDetails';
import useTrackERC20WithoutDecimalInformation from '../../../../../../../hooks/useTrackERC20WithoutDecimalInformation';
import { TOKEN_VALUE_UNLIMITED_THRESHOLD } from '../../../../../../../utils/confirm';
import { TokenDetailsERC20 } from '../../../../../../../utils/token';
import BottomModal from '../../../../../../UI/BottomModal';

import styleSheet from './ValueDisplay.styles';
import { strings } from '../../../../../../../../../../../locales/i18n';
import AnimatedPulse from '../AnimatedPulse/AnimatedPulse';
import { selectContractExchangeRatesByChainId } from '../../../../../../../../../../selectors/tokenRatesController';
import { RootState } from '../../../../../../../../../../reducers';

interface SimulationValueDisplayParams {
  /** ID of the associated chain. */
  chainId: Hex;

  /** Change type to be displayed in value tooltip */
  labelChangeType: string;

  /** The network client ID */
  networkClientId?: NetworkClientId;

  /**
   * The ethereum token contract address. It is expected to be in hex format.
   * We currently accept strings since we have a patch that accepts a custom string
   * {@see .yarn/patches/@metamask-eth-json-rpc-middleware-npm-14.0.1-b6c2ccbe8c.patch}
   */
  tokenContract: Hex | string | undefined;

  // Optional

  /** Whether a large amount can be substituted by "Unlimited" */
  canDisplayValueAsUnlimited?: boolean;

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

const SimulationValueDisplay: React.FC<SimulationValueDisplayParams> = ({
  chainId,
  labelChangeType,
  networkClientId,
  primaryType,
  tokenContract,
  tokenId,
  value,
  credit,
  debit,
  canDisplayValueAsUnlimited = false,
}) => {
  const [hasValueModalOpen, setHasValueModalOpen] = useState(false);

    const { colors } = useTheme();

    const styles = styleSheet(colors);

  const contractExchangeRates = useSelector((state: RootState) =>
    selectContractExchangeRatesByChainId(state, chainId),
  );

  const exchangeRate =
    tokenContract && contractExchangeRates
      ? contractExchangeRates[tokenContract as `0x${string}`]?.price
      : undefined;

    const {
      details: tokenDetails,
      isPending: isPendingTokenDetails,
    } = useGetTokenStandardAndDetails(tokenContract, networkClientId);
    const { decimalsNumber: tokenDecimals } = tokenDetails;

  useTrackERC20WithoutDecimalInformation(
    chainId,
    tokenContract,
    tokenDetails as TokenDetailsERC20,
  );

  const tokenAmount =
    isNumberValue(value) && !tokenId
      ? calcTokenAmount(value as number | string, tokenDecimals)
      : null;
  const isValidTokenAmount =
    tokenAmount !== null &&
    tokenAmount !== undefined &&
    tokenAmount instanceof BigNumber;

  const fiatValue =
    isValidTokenAmount && exchangeRate && !tokenId
      ? tokenAmount.multipliedBy(exchangeRate).toNumber()
      : undefined;

  const tokenValue = isValidTokenAmount
    ? formatAmount('en-US', tokenAmount)
    : null;
  const tokenValueMaxPrecision = isValidTokenAmount
    ? formatAmountMaxPrecision('en-US', tokenAmount)
    : null;

  const shouldShowUnlimitedValue =
    canDisplayValueAsUnlimited &&
    Number(value) > TOKEN_VALUE_UNLIMITED_THRESHOLD;

  /** Temporary error capturing as we are building out Permit Simulations */
  if (!tokenContract) {
    Logger.error(
      new Error(
        `SimulationValueDisplay: Token contract address is missing where primaryType === ${primaryType}`,
      ),
    );
    return null;
  }

  function handlePressTokenValue() {
    setHasValueModalOpen(true);
  }

    return (
      <View style={styles.wrapper}>
        <View style={styles.flexRowTokenValueAndAddress}>
          <View style={styles.valueAndAddress}>
            {
              <AnimatedPulse isPulsing={isPendingTokenDetails} testID="simulation-value-display-loader">
                <ButtonPill
                  isDisabled={!!tokenId || tokenId === '0'}
                  onPress={handlePressTokenValue}
                  onPressIn={handlePressTokenValue}
                  onPressOut={handlePressTokenValue}
                  style={[credit && styles.valueIsCredit, debit && styles.valueIsDebit]}
                >
                  {isPendingTokenDetails ?
                    <View style={styles.loaderButtonPillEmptyContent} />
                  :
                  <Text>
                    {credit && '+ '}
                    {debit && '- '}
                    {shouldShowUnlimitedValue
                      ? strings('confirm.unlimited')
                      : tokenValue !== null &&
                        shortenString(tokenValue || '', {
                        truncatedCharLimit: 15,
                        truncatedStartChars: 15,
                        truncatedEndChars: 0,
                        skipCharacterInEnd: true,
                      })}
                      {tokenId && `#${tokenId}`}
                    </Text>
                  }
                </ButtonPill>
              </AnimatedPulse>
            }
            <View style={styles.marginStart4}>
              <Address address={tokenContract} chainId={chainId} />
            </View>
          </View>
        </View>
        <View style={styles.fiatDisplay}>
          {/**
            TODO - add fiat shorten prop after tooltip logic has been updated
            {@see {@link https://github.com/MetaMask/metamask-mobile/issues/12656}
          */}
        {fiatValue && (
          <IndividualFiatDisplay fiatAmount={fiatValue} /* shorten*/ />
        )}
      </View>
      {hasValueModalOpen && (
        /**
         * TODO replace BottomModal instances with BottomSheet
         * {@see {@link https://github.com/MetaMask/metamask-mobile/issues/12656}}
         */
        <BottomModal onClose={() => setHasValueModalOpen(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setHasValueModalOpen(false)}
          >
            <View style={styles.valueModal}>
              <View style={styles.valueModalHeader}>
                <ButtonIcon
                  iconColor={IconColor.Default}
                  size={ButtonIconSizes.Sm}
                  style={styles.valueModalHeaderIcon}
                  onPress={() => setHasValueModalOpen(false)}
                  iconName={IconName.ArrowLeft}
                />
                <Text style={styles.valueModalHeaderText}>
                  {labelChangeType}
                </Text>
              </View>
              <Text style={styles.valueModalText}>
                {tokenValueMaxPrecision}
              </Text>
            </View>
          </TouchableOpacity>
        </BottomModal>
      )}
    </View>
  );
};

export default SimulationValueDisplay;
