/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Linking, View } from 'react-native';
import { TransactionType } from '@metamask/transaction-controller';

// External dependencies.
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import { useStyles } from '../../../hooks';
import Button from '../../Buttons/Button';
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import { useTransactionMetadataRequest } from '../../../../components/Views/confirmations/hooks/useTransactionMetadataRequest';
import styleSheet from './BottomSheetFooter.styles';
import { BottomSheetFooterProps } from './BottomSheetFooter.types';
import {
  DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT,
  TESTID_BOTTOMSHEETFOOTER,
  TESTID_BOTTOMSHEETFOOTER_BUTTON,
  TESTID_BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT,
} from './BottomSheetFooter.constants';

const BottomSheetFooter: React.FC<BottomSheetFooterProps> = ({
  style,
  buttonsAlignment = DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT,
  buttonPropsArray,
}) => {
  const { styles } = useStyles(styleSheet, { style, buttonsAlignment });

  const transactionMetadata = useTransactionMetadataRequest();
  const isStakingConfirmation = [
    TransactionType.stakingDeposit,
    TransactionType.stakingUnstake,
    TransactionType.stakingClaim,
  ].includes(transactionMetadata?.type as TransactionType);

  return (
    <View style={styles.base} testID={TESTID_BOTTOMSHEETFOOTER}>
      {buttonPropsArray.map((buttonProp, index) => (
        <Button
          key={index}
          style={index > 0 ? styles.subsequentButton : styles.button}
          testID={
            index > 0
              ? TESTID_BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT
              : TESTID_BOTTOMSHEETFOOTER_BUTTON
          }
          {...buttonProp}
        />
      ))}
      {isStakingConfirmation && (
        <View style={styles.textContainer}>
          <Text
            variant={TextVariant.BodySM}
          >
            {strings('confirm.staking_footer.part1')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            style={styles.linkText}
            onPress={() => Linking.openURL(AppConstants.URLS.TERMS_OF_USE)}
          >
            {strings('confirm.staking_footer.terms_of_use')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
          >
            {strings('confirm.staking_footer.part2')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
            style={styles.linkText}
            onPress={() => Linking.openURL(AppConstants.URLS.STAKING_RISK_DISCLOSURE)}
          >
            {strings('confirm.staking_footer.risk_disclosure')}
          </Text>
          <Text
            variant={TextVariant.BodySM}
          >
            {strings('confirm.staking_footer.part3')}
          </Text>
        </View>
      )}
    </View>
  );
};

export default BottomSheetFooter;
