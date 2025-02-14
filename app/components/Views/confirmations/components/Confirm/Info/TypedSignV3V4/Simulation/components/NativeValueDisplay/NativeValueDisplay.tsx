import React, { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

import { RootState } from '../../../../../../../../../../reducers';
import { selectConversionRateByChainId } from '../../../../../../../../../../selectors/currencyRateController';
import { useTheme } from '../../../../../../../../../../util/theme';

import ButtonPill from '../../../../../../../../../../component-library/components-temp/Buttons/ButtonPill/ButtonPill';
import { ButtonIconSizes } from '../../../../../../../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon.types';
import ButtonIcon from '../../../../../../../../../../component-library/components/Buttons/ButtonIcon/ButtonIcon';
import {
  IconName,
  IconColor,
} from '../../../../../../../../../../component-library/components/Icons/Icon';
import Text from '../../../../../../../../../../component-library/components/Texts/Text';

import AssetPill from '../../../../../../../../../UI/SimulationDetails/AssetPill/AssetPill';
import { IndividualFiatDisplay } from '../../../../../../../../../UI/SimulationDetails/FiatDisplay/FiatDisplay';
import {
  formatAmount,
  formatAmountMaxPrecision,
} from '../../../../../../../../../UI/SimulationDetails/formatAmount';
import { AssetType } from '../../../../../../../../../UI/SimulationDetails/types';
import { shortenString } from '../../../../../../../../../../util/notifications/methods/common';
import { isNumberValue } from '../../../../../../../../../../util/number';
import { calcTokenAmount } from '../../../../../../../../../../util/transactions';
import BottomModal from '../../../../../../UI/BottomModal';

/**
 * Reusing ValueDisplay styles for now. See issue to handle abstracting UI
 * @see {@link https://github.com/MetaMask/metamask-mobile/issues/12974}
 */
import styleSheet from '../ValueDisplay/ValueDisplay.styles';

const NATIVE_DECIMALS = 18;

interface PermitSimulationValueDisplayParams {
  /** ID of the associated chain. */
  chainId: Hex;

  /** Change type to be displayed in value tooltip */
  labelChangeType: string;

  /** The token amount */
  value: number | string;

  /** True if value is being credited to wallet */
  credit?: boolean;

  /** True if value is being debited to wallet */
  debit?: boolean;
}

const NativeValueDisplay: React.FC<PermitSimulationValueDisplayParams> = ({
  chainId,
  credit,
  debit,
  labelChangeType,
  value,
}) => {
  const [hasValueModalOpen, setHasValueModalOpen] = useState(false);

  const { colors } = useTheme();
  const styles = styleSheet(colors);

  const conversionRate = useSelector((state: RootState) =>
    selectConversionRateByChainId(state, chainId),
  );

  const tokenAmount = isNumberValue(value)
    ? calcTokenAmount(value, NATIVE_DECIMALS)
    : null;
  const isValidTokenAmount =
    tokenAmount !== null &&
    tokenAmount !== undefined &&
    tokenAmount instanceof BigNumber;

  const fiatValue =
    isValidTokenAmount && conversionRate
      ? tokenAmount.times(String(conversionRate)).toNumber()
      : undefined;

  const tokenValue = isValidTokenAmount
    ? formatAmount('en-US', tokenAmount)
    : null;
  const tokenValueMaxPrecision = isValidTokenAmount
    ? formatAmountMaxPrecision('en-US', tokenAmount)
    : null;

  function handlePressTokenValue() {
    setHasValueModalOpen(true);
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.flexRowTokenValueAndAddress}>
        <View style={styles.valueAndAddress}>
          <ButtonPill
            onPress={handlePressTokenValue}
            onPressIn={handlePressTokenValue}
            onPressOut={handlePressTokenValue}
            style={[
              credit && styles.valueIsCredit,
              debit && styles.valueIsDebit,
            ]}
          >
            <Text>
              {credit && '+ '}
              {debit && '- '}
              {tokenValue !== null &&
                shortenString(tokenValue || '', {
                  truncatedCharLimit: 15,
                  truncatedStartChars: 15,
                  truncatedEndChars: 0,
                  skipCharacterInEnd: true,
                })}
            </Text>
          </ButtonPill>
          <View style={styles.marginStart4}>
            <AssetPill asset={{ chainId, type: AssetType.Native }} />
          </View>
        </View>
      </View>
      <View style={styles.fiatDisplay}>
        {/**
          TODO - add fiat shorten prop after tooltip logic has been updated
          {@see {@link https://github.com/MetaMask/metamask-mobile/issues/12656}
        */}
        {fiatValue !== undefined && (
          <IndividualFiatDisplay fiatAmount={fiatValue} />
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

export default NativeValueDisplay;
