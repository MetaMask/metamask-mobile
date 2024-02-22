import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { fontStyles } from '../../../../styles/common';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';
import { isNumber } from '../../../../util/number';
import ConnectHeader from '../../ConnectHeader';
import Device from '../../../../util/device';
import ErrorMessage from '../../../Views/SendFlow/ErrorMessage';
import { useTheme } from '../../../../util/theme';
import formatNumber from '../../../../util/formatNumber';

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: Device.isIphoneX() ? 48 : 24,
      backgroundColor: colors.background.default,
      borderTopRightRadius: 20,
      borderTopLeftRadius: 20,
    },
    sectionExplanationText: {
      ...fontStyles.normal,
      fontSize: 12,
      color: colors.text.alternative,
      marginVertical: 6,
    },
    option: {
      flexDirection: 'row',
      marginVertical: 8,
    },
    errorMessageWrapper: {
      marginVertical: 6,
    },
    optionText: {
      ...fontStyles.normal,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text.default,
    },
    touchableOption: {
      flexDirection: 'row',
    },
    selectedCircle: {
      width: 8,
      height: 8,
      borderRadius: 8 / 2,
      margin: 3,
      backgroundColor: colors.primary.default,
    },
    outSelectedCircle: {
      width: 18,
      height: 18,
      borderRadius: 18 / 2,
      borderWidth: 2,
      borderColor: colors.primary.default,
    },
    circle: {
      width: 18,
      height: 18,
      borderRadius: 18 / 2,
      backgroundColor: colors.background.default,
      opacity: 1,
      borderWidth: 2,
      borderColor: colors.border.default,
    },
    input: {
      padding: 12,
      borderColor: colors.border.default,
      borderRadius: 10,
      borderWidth: 2,
      color: colors.text.default,
    },
    spendLimitContent: {
      marginLeft: 8,
      flex: 1,
    },
    spendLimitTitle: {
      ...fontStyles.bold,
      color: colors.text.default,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 8,
    },
    spendLimitSubtitle: {
      ...fontStyles.normal,
      fontSize: 12,
      lineHeight: 18,
      color: colors.text.alternative,
    },
    textBlue: {
      color: colors.primary.default,
    },
    textBlack: {
      color: colors.text.default,
    },
  });

interface IEditPermissionProps {
  host: string;
  minimumSpendLimit: string;
  spendLimitUnlimitedSelected: boolean;
  tokenSymbol: string;
  spendLimitCustomValue: string;
  originalApproveAmount: string;
  onSetApprovalAmount: () => void;
  onSpendLimitCustomValueChange: (approvalCustomValue: string) => void;
  onPressSpendLimitUnlimitedSelected: () => void;
  onPressSpendLimitCustomSelected: () => void;
  toggleEditPermission: () => void;
}

function EditPermission({
  host,
  minimumSpendLimit,
  spendLimitUnlimitedSelected,
  tokenSymbol,
  spendLimitCustomValue,
  originalApproveAmount,
  onSetApprovalAmount: setApprovalAmount,
  onSpendLimitCustomValueChange,
  onPressSpendLimitUnlimitedSelected,
  onPressSpendLimitCustomSelected,
  toggleEditPermission,
}: IEditPermissionProps) {
  const [initialState] = useState({
    spendLimitUnlimitedSelected,
    spendLimitCustomValue,
  });
  const [disableBtn, setDisableBtn] = useState(false);
  const [displayErrorMsg, setDisplayErrorMsg] = useState(false);
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  useEffect(() => {
    setDisplayErrorMsg(
      Number(minimumSpendLimit) > Number(spendLimitCustomValue),
    );
  }, [minimumSpendLimit, spendLimitCustomValue, spendLimitUnlimitedSelected]);

  useEffect(() => {
    setDisableBtn(!isNumber(spendLimitCustomValue) || displayErrorMsg);
  }, [spendLimitCustomValue, displayErrorMsg]);

  const onSetApprovalAmount = useCallback(() => {
    if (!spendLimitUnlimitedSelected && !spendLimitCustomValue) {
      onPressSpendLimitUnlimitedSelected();
    } else {
      setApprovalAmount();
    }
  }, [
    spendLimitUnlimitedSelected,
    spendLimitCustomValue,
    onPressSpendLimitUnlimitedSelected,
    setApprovalAmount,
  ]);

  const onBackPress = useCallback(() => {
    if (initialState.spendLimitUnlimitedSelected) {
      onPressSpendLimitUnlimitedSelected();
    } else {
      onPressSpendLimitCustomSelected();
    }
    onSpendLimitCustomValueChange(initialState.spendLimitCustomValue);
    toggleEditPermission();
  }, [
    initialState,
    onPressSpendLimitCustomSelected,
    onPressSpendLimitUnlimitedSelected,
    onSpendLimitCustomValueChange,
    toggleEditPermission,
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
            onPress={onPressSpendLimitCustomSelected}
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
              onFocus={onPressSpendLimitCustomSelected}
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
