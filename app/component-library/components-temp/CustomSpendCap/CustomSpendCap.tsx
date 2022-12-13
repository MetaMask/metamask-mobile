// Third party dependencies.
import React, { useState, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import BigNumber from 'bignumber.js';

// External dependencies.
import { useStyles } from '../../hooks';
import { strings } from '../../../../locales/i18n';
import ButtonLink from '../../components/Buttons/Button/variants/ButtonLink';
import Text, { TextVariants } from '../../components/Texts/Text';
import formatNumber from '../../../util/formatNumber';
import { isNumber } from '../../../util/number';
import CustomInput from './CustomInput';
import InfoModal from '../../../components/UI/Swaps/components/InfoModal';

// Internal dependencies.
import { CUSTOM_SPEND_CAP_TEST_ID } from './CustomSpendCap.constants';
import { CustomSpendCapProps } from './CustomSpendCap.types';
import customSpendCapStyles from './CustomSpendCap.styles';
import Icon, { IconName, IconSize } from '../../components/Icon';

const CustomSpendCap = ({
  ticker,
  dappProposedValue,
  accountBalance,
  domain,
}: CustomSpendCapProps) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(customSpendCapStyles, {});

  const [value, setValue] = useState('');
  const [inputDisabled, setInputDisabled] = useState(true);
  const [maxSelected, setMaxSelected] = useState(false);
  const [defaultValueSelected, setDefaultValueSelected] = useState(false);
  const [
    inputValueHigherThanAccountBalance,
    setInputValueHigherThanAccountBalance,
  ] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [inputHasError, setInputHasError] = useState(false);

  useEffect(() => {
    if (isNumber(value)) return setInputHasError(false);
    return setInputHasError(true);
  }, [value]);

  const handlePress = () => {
    setMaxSelected(false);
    setValue(dappProposedValue);
    setDefaultValueSelected(!defaultValueSelected);
    setInputDisabled(!inputDisabled);
  };

  useEffect(() => {
    if (maxSelected) setValue(accountBalance);
  }, [maxSelected, accountBalance]);

  const editedDefaultValue = new BigNumber(dappProposedValue);
  const newValue = new BigNumber(value);

  const dappValue = editedDefaultValue.minus(accountBalance).toFixed();
  const difference = newValue.minus(accountBalance).toFixed();

  useEffect(() => {
    if (Number(value) > Number(accountBalance))
      return setInputValueHigherThanAccountBalance(true);
    return setInputValueHigherThanAccountBalance(false);
  }, [value, accountBalance]);

  const MAX_VALUE_SELECTED = (
    <>
      {strings('contract_allowance.custom_spend_cap.this_contract_allows')}
      <Text variant={TextVariants.sBodyMDBold} style={styles.description}>
        {` ${formatNumber(accountBalance)} ${ticker} `}
      </Text>
      {strings('contract_allowance.custom_spend_cap.from_your_balance')}
    </>
  );

  const NO_SELECTED = strings(
    'contract_allowance.custom_spend_cap.no_value_selected',
    { domain },
  );

  const DAPP_PROPOSED_VALUE_GREATER_THAN_ACCOUNT_BALANCE = (
    <>
      {strings('contract_allowance.custom_spend_cap.this_contract_allows')}
      <Text variant={TextVariants.sBodyMDBold} style={styles.description}>
        {` ${formatNumber(accountBalance)} ${ticker} `}
      </Text>
      {strings('contract_allowance.custom_spend_cap.from_your_current_balance')}
      <Text variant={TextVariants.sBodyMDBold} style={styles.description}>
        {` ${formatNumber(dappValue)} ${ticker} `}
      </Text>
      {strings('contract_allowance.custom_spend_cap.future_tokens')}
    </>
  );

  const INPUT_VALUE_GREATER_THAN_ACCOUNT_BALANCE = (
    <>
      {strings('contract_allowance.custom_spend_cap.this_contract_allows')}
      <Text variant={TextVariants.sBodyMDBold} style={styles.description}>
        {` ${formatNumber(accountBalance)} ${ticker} `}
      </Text>
      {strings('contract_allowance.custom_spend_cap.from_your_current_balance')}
      <Text variant={TextVariants.sBodyMDBold} style={styles.description}>
        {` ${formatNumber(difference)} ${ticker} `}
      </Text>
      {strings('contract_allowance.custom_spend_cap.future_tokens')}
    </>
  );

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  const infoModalTitle = defaultValueSelected ? (
    <>
      <Icon
        size={IconSize.Sm}
        name={IconName.DangerFilled}
        color={colors.error.default}
      />
      <Text variant={TextVariants.sBodyMDBold} style={styles.modalTitleDanger}>
        {strings('contract_allowance.custom_spend_cap.be_careful')}
      </Text>{' '}
    </>
  ) : (
    <Text variant={TextVariants.sBodyMDBold} style={styles.modalTitle}>
      {strings('contract_allowance.custom_spend_cap.set_spend_cap')}
    </Text>
  );

  return (
    <View style={styles.container} testID={CUSTOM_SPEND_CAP_TEST_ID}>
      {isModalVisible ? (
        <InfoModal
          isVisible={isModalVisible}
          title={infoModalTitle}
          body={
            <Text>
              {defaultValueSelected
                ? strings(
                    'contract_allowance.custom_spend_cap.info_modal_description_default',
                  )
                : strings(
                    'contract_allowance.custom_spend_cap.no_value_selected',
                    { domain },
                  )}
            </Text>
          }
          toggleModal={toggleModal}
        />
      ) : null}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text variant={TextVariants.sBodyMDBold} style={styles.title}>
            {strings('contract_allowance.custom_spend_cap.title')}
          </Text>
          <Pressable onPress={toggleModal}>
            <Icon
              size={IconSize.Sm}
              name={
                defaultValueSelected
                  ? IconName.DangerFilled
                  : IconName.QuestionFilled
              }
              color={
                defaultValueSelected ? colors.error.default : colors.icon.muted
              }
            />
          </Pressable>
        </View>
        <ButtonLink onPress={handlePress} textVariants={TextVariants.sBodyMD}>
          {defaultValueSelected
            ? strings('contract_allowance.custom_spend_cap.edit')
            : strings('contract_allowance.custom_spend_cap.use_default')}
        </ButtonLink>
      </View>
      <View style={styles.inputContainer}>
        <CustomInput
          ticker={ticker}
          setValue={setValue}
          defaultValueSelected={defaultValueSelected}
          setMaxSelected={setMaxSelected}
          inputDisabled={inputDisabled}
          value={value}
        />
      </View>
      {value.length > 0 && inputHasError && (
        <Text variant={TextVariants.sBodyMD} style={styles.errorDescription}>
          {strings('contract_allowance.custom_spend_cap.error_enter_number')}
        </Text>
      )}
      <View style={styles.descriptionContainer}>
        <Text variant={TextVariants.sBodyMD} style={styles.description}>
          {defaultValueSelected
            ? DAPP_PROPOSED_VALUE_GREATER_THAN_ACCOUNT_BALANCE
            : maxSelected
            ? MAX_VALUE_SELECTED
            : inputValueHigherThanAccountBalance
            ? INPUT_VALUE_GREATER_THAN_ACCOUNT_BALANCE
            : NO_SELECTED}
        </Text>
      </View>
    </View>
  );
};

export default CustomSpendCap;
