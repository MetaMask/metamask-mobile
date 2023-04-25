import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import {
  decodeApproveData,
  generateTxWithNewTokenAllowance,
  minimumTokenAllowance,
} from '../../../../util/transactions';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';
import {
  fromTokenMinimalUnit,
  hexToBN,
  isNumber,
} from '../../../../util/number';
import Logger from '../../../../util/Logger';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import ConnectHeader from '../../ConnectHeader';
import ErrorMessage from '../../../Views/SendFlow/ErrorMessage';
import { useTheme } from '../../../../util/theme';
import formatNumber from '../../../../util/formatNumber';
import createStyles from './styles';

interface IEditPermissionProps {
  host: string;
  token: { tokenSymbol: string; tokenDecimals: number };
  originalApproveAmount: string;
  spendLimitCustomValue: string;
  onSpendLimitCustomValueChange: (approvalCustomValue: string) => void;
  spendLimitUnlimitedSelected: boolean;
  onSpendLimitUnlimitedSelectedChange: (value: boolean) => void;
  transaction: Record<string, unknown> & { data: string };
  setTransactionObject: (
    transaction: Record<string, unknown> & { data: string },
  ) => void;
  toggleEditPermission: () => void;
  onCustomSpendAmountChange: (amount: string) => void;
  spenderAddress: string;
  getAnalyticsParams: () => Record<string, unknown>;
}

function EditPermission({
  host,
  token,
  originalApproveAmount,
  spendLimitCustomValue,
  onSpendLimitCustomValueChange,
  spendLimitUnlimitedSelected,
  onSpendLimitUnlimitedSelectedChange,
  transaction,
  setTransactionObject,
  toggleEditPermission,
  onCustomSpendAmountChange,
  spenderAddress,
  getAnalyticsParams,
}: IEditPermissionProps) {
  const [initialState] = useState({
    spendLimitUnlimitedSelected,
    spendLimitCustomValue,
  });
  const [disableBtn, setDisableBtn] = useState(false);
  const [displayErrorMsg, setDisplayErrorMsg] = useState(false);
  const { colors, themeAppearance } = useTheme();
  const { tokenSymbol, tokenDecimals } = token;
  const minimumSpendLimit = minimumTokenAllowance(tokenDecimals);
  const styles = createStyles(colors);

  useEffect(() => {
    setDisplayErrorMsg(
      Number(minimumSpendLimit) > Number(spendLimitCustomValue),
    );
  }, [minimumSpendLimit, spendLimitCustomValue, spendLimitUnlimitedSelected]);

  useEffect(() => {
    setDisableBtn(!isNumber(spendLimitCustomValue) || displayErrorMsg);
  }, [spendLimitCustomValue, displayErrorMsg]);

  const onPressSpendLimitUnlimitedSelected = useCallback(() => {
    onSpendLimitUnlimitedSelectedChange(true);
    onSpendLimitCustomValueChange(minimumSpendLimit);
  }, [
    onSpendLimitUnlimitedSelectedChange,
    onSpendLimitCustomValueChange,
    minimumSpendLimit,
  ]);

  const onBackPress = useCallback(() => {
    if (initialState.spendLimitUnlimitedSelected) {
      onSpendLimitUnlimitedSelectedChange(true);
    } else {
      onSpendLimitUnlimitedSelectedChange(false);
    }
    onSpendLimitCustomValueChange(initialState.spendLimitCustomValue);
    toggleEditPermission();
  }, [
    initialState,
    onSpendLimitUnlimitedSelectedChange,
    onSpendLimitCustomValueChange,
    toggleEditPermission,
  ]);

  const onSetApprovalAmount = useCallback(() => {
    if (!spendLimitUnlimitedSelected && !spendLimitCustomValue) {
      onPressSpendLimitUnlimitedSelected();
    } else {
      try {
        const newApprovalTransaction = generateTxWithNewTokenAllowance(
          spendLimitUnlimitedSelected
            ? originalApproveAmount
            : spendLimitCustomValue,
          tokenDecimals,
          spenderAddress,
          transaction,
        );

        const { encodedAmount } = decodeApproveData(
          newApprovalTransaction.data,
        );

        const approveAmount = fromTokenMinimalUnit(
          hexToBN(encodedAmount),
          tokenDecimals.toString(),
        );

        onCustomSpendAmountChange(approveAmount);
        setTransactionObject({
          ...newApprovalTransaction,
          transaction: {
            ...(newApprovalTransaction as any).transaction,
            data: newApprovalTransaction.data,
          },
        });
      } catch (err) {
        Logger.log('Failed to setTransactionObject', err);
      }
      toggleEditPermission();
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.APPROVAL_PERMISSION_UPDATED,
        getAnalyticsParams(),
      );
    }
  }, [
    getAnalyticsParams,
    onCustomSpendAmountChange,
    onPressSpendLimitUnlimitedSelected,
    originalApproveAmount,
    setTransactionObject,
    spenderAddress,
    spendLimitCustomValue,
    spendLimitUnlimitedSelected,
    toggleEditPermission,
    tokenDecimals,
    transaction,
  ]);

  return (
    <View style={styles.wrapper}>
      <ConnectHeader
        action={onBackPress}
        title={strings('spend_limit_edition.title')}
      />
      <View>
        <Text style={styles.spendLimitTitle}>
          {strings('spend_limit_edition.spend_limit')}
        </Text>
        <Text style={styles.spendLimitSubtitle}>
          {strings('spend_limit_edition.allow')}
          <Text style={fontStyles.bold}>{` ${host} `}</Text>
          {strings('spend_limit_edition.allow_explanation')}
        </Text>

        <View style={styles.option}>
          <TouchableOpacity
            onPress={onPressSpendLimitUnlimitedSelected}
            style={styles.touchableOption}
          >
            {spendLimitUnlimitedSelected ? (
              <View style={styles.outSelectedCircle}>
                <View style={styles.selectedCircle} />
              </View>
            ) : (
              <View style={styles.circle} />
            )}
          </TouchableOpacity>
          <View style={styles.spendLimitContent}>
            <Text
              style={[
                styles.optionText,
                spendLimitUnlimitedSelected
                  ? styles.textBlue
                  : styles.textBlack,
              ]}
            >
              {strings('spend_limit_edition.proposed')}
            </Text>
            <Text style={styles.sectionExplanationText}>
              {strings('spend_limit_edition.requested_by')}
              <Text style={fontStyles.bold}>{` ${host}`}</Text>
            </Text>
            <Text
              style={[styles.optionText, styles.textBlack]}
            >{`${formatNumber(originalApproveAmount)} ${tokenSymbol}`}</Text>
          </View>
        </View>

        <View style={styles.option}>
          <TouchableOpacity
            onPress={onPressSpendLimitUnlimitedSelected}
            style={styles.touchableOption}
          >
            {spendLimitUnlimitedSelected ? (
              <View style={styles.circle} />
            ) : (
              <View style={styles.outSelectedCircle}>
                <View style={styles.selectedCircle} />
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.spendLimitContent}>
            <Text
              style={[
                styles.optionText,
                !spendLimitUnlimitedSelected
                  ? styles.textBlue
                  : styles.textBlack,
              ]}
            >
              {strings('spend_limit_edition.custom_spend_limit')}
            </Text>
            <Text style={styles.sectionExplanationText}>
              {strings('spend_limit_edition.max_spend_limit')}
            </Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="numeric"
              autoCorrect={false}
              onChangeText={onSpendLimitCustomValueChange}
              placeholder={`100 ${tokenSymbol}`}
              placeholderTextColor={colors.text.muted}
              spellCheck={false}
              style={styles.input}
              value={spendLimitCustomValue}
              numberOfLines={1}
              onFocus={() => onSpendLimitUnlimitedSelectedChange(false)}
              returnKeyType={'done'}
              keyboardAppearance={themeAppearance}
            />
            {displayErrorMsg && (
              <View style={styles.errorMessageWrapper}>
                <ErrorMessage
                  errorMessage={strings(
                    'spend_limit_edition.must_be_at_least',
                    {
                      allowance: minimumSpendLimit,
                    },
                  )}
                />
              </View>
            )}
          </View>
        </View>
      </View>
      <StyledButton
        disabled={disableBtn}
        type="confirm"
        onPress={onSetApprovalAmount}
      >
        {strings('transaction.set_gas')}
      </StyledButton>
    </View>
  );
}

export default EditPermission;
