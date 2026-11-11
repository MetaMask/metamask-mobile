import React, { useCallback, useRef, useState } from 'react';
import { Modal, View } from 'react-native';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';

import { RootState } from '../../../../../../../../../reducers';
import { selectConversionRateByChainId } from '../../../../../../../../../selectors/currencyRateController';
import { useTheme } from '../../../../../../../../../util/theme';

import ButtonPill from '../../../../../../../../../component-library/components-temp/Buttons/ButtonPill/ButtonPill';

import AssetPill from '../../../../../../../../UI/SimulationDetails/AssetPill/AssetPill';
import { IndividualFiatDisplay } from '../../../../../../../../UI/SimulationDetails/FiatDisplay/FiatDisplay';
import {
  formatAmount,
  formatAmountMaxPrecision,
} from '../../../../../../../../UI/SimulationDetails/formatAmount';
import { AssetType } from '../../../../../../../../UI/SimulationDetails/types';
import { shortenString } from '../../../../../../../../../util/notifications/methods/common';
import { isNumberValue } from '../../../../../../../../../util/number';
import { calcTokenAmount } from '../../../../../../../../../util/transactions';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Text,
} from '@metamask/design-system-react-native';

/**
 * Reusing ValueDisplay styles for now. See issue to handle abstracting UI
 * @see {@link https://github.com/MetaMask/metamask-mobile/issues/12974}
 */
import styleSheet from '../value-display/value-display.styles';

const NATIVE_DECIMALS = 18;

interface PermitSimulationValueDisplayParams {
  /** ID of the associated chain. */
  chainId: Hex;

  /** Modal header text to be displayed in the value modal */
  modalHeaderText: string;

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
  modalHeaderText,
  value,
}) => {
  const [hasValueModalOpen, setHasValueModalOpen] = useState(false);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const theme = useTheme();
  const styles = styleSheet(theme);

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
      ? tokenAmount.times(String(conversionRate))
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

  const handleRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSheetClosed = useCallback(() => {
    setHasValueModalOpen(false);
  }, []);

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
      {fiatValue !== undefined && (
        <IndividualFiatDisplay fiatAmount={fiatValue} />
      )}
      {hasValueModalOpen && (
        <Modal
          visible
          animationType="none"
          transparent
          presentationStyle="overFullScreen"
          onRequestClose={handleRequestClose}
        >
          <BottomSheet
            ref={bottomSheetRef}
            keyboardAvoidingViewEnabled={false}
            onClose={handleSheetClosed}
          >
            <BottomSheetHeader onClose={handleRequestClose}>
              {modalHeaderText}
            </BottomSheetHeader>
            <Box twClassName="flex flex-col p-4 pt-0">
              <Text style={styles.valueModalText}>
                {tokenValueMaxPrecision}
              </Text>
            </Box>
          </BottomSheet>
        </Modal>
      )}
    </View>
  );
};

export default NativeValueDisplay;
