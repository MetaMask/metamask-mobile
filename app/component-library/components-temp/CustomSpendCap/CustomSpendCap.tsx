// Third party dependencies.
import React, { useState, useEffect } from 'react';
import { Pressable, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import { strings } from '../../../../locales/i18n';
import Button, { ButtonVariants } from '../../components/Buttons/Button';
import Text, { TextVariant } from '../../components/Texts/Text';
import formatNumber from '../../../util/formatNumber';
import { isNumber } from '../../../util/number';
import CustomInput from './CustomInput';
import InfoModal from '../../../components/UI/Swaps/components/InfoModal';

// Internal dependencies.
import { CUSTOM_SPEND_CAP_TEST_ID } from './CustomSpendCap.constants';
import { CustomSpendCapProps } from './CustomSpendCap.types';
import customSpendCapStyles from './CustomSpendCap.styles';
import Icon, { IconName, IconSize } from '../../components/Icons/Icon';

const CustomSpendCap = ({
  ticker,
  dappProposedValue,
  accountBalance,
  domain,
  onInputChanged,
  disableEdit,
  editValue,
  tokenSpendValue,
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
    if (isNumber(value)) {
      setInputHasError(false);
      return onInputChanged(value);
    }

    value && onInputChanged(value);
    return setInputHasError(true);
  }, [value, onInputChanged]);

  useEffect(() => {
    if (tokenSpendValue) {
      setValue(tokenSpendValue);
    }
  }, [tokenSpendValue]);

  const handlePress = () => {
    if (disableEdit) return editValue();
    setMaxSelected(false);
    setValue(dappProposedValue);
    setDefaultValueSelected(!defaultValueSelected);
    setInputDisabled(!inputDisabled);
  };

  useEffect(() => {
    if (maxSelected) setValue(accountBalance);
  }, [maxSelected, accountBalance]);

  const editedDefaultValue = formatNumber(dappProposedValue);
  const newValue = formatNumber(value);

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
      <Text variant={TextVariant.BodyMDBold} style={styles.description}>
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
      <Text variant={TextVariant.BodyMDBold} style={styles.description}>
        {` ${formatNumber(accountBalance)} ${ticker} `}
      </Text>
      {strings('contract_allowance.custom_spend_cap.from_your_current_balance')}
      <Text variant={TextVariant.BodyMDBold} style={styles.description}>
        {` ${formatNumber(dappValue)} ${ticker} `}
      </Text>
      {strings('contract_allowance.custom_spend_cap.future_tokens')}
    </>
  );

  const INPUT_VALUE_GREATER_THAN_ACCOUNT_BALANCE = (
    <>
      {strings('contract_allowance.custom_spend_cap.this_contract_allows')}
      <Text variant={TextVariant.BodyMDBold} style={styles.description}>
        {` ${formatNumber(accountBalance)} ${ticker} `}
      </Text>
      {strings('contract_allowance.custom_spend_cap.from_your_current_balance')}
      <Text variant={TextVariant.BodyMDBold} style={styles.description}>
        {` ${formatNumber(difference)} ${ticker} `}
      </Text>
      {strings('contract_allowance.custom_spend_cap.future_tokens')}
    </>
  );

  const INPUT_VALUE_LOWER_THAN_ACCOUNT_BALANCE = (
    <>
      {strings('contract_allowance.custom_spend_cap.this_contract_allows')}
      <Text variant={TextVariant.BodyMDBold} style={styles.description}>
        {` ${formatNumber(tokenSpendValue ?? '0')} ${ticker} `}
      </Text>
      {strings('contract_allowance.custom_spend_cap.from_your_balance')}
    </>
  );

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };

  const infoModalTitle = defaultValueSelected ? (
    <>
      <Icon
        size={IconSize.Sm}
        name={IconName.Danger}
        color={colors.error.default}
      />
      <Text variant={TextVariant.BodyMDBold} style={styles.modalTitleDanger}>
        {strings('contract_allowance.custom_spend_cap.be_careful')}
      </Text>{' '}
    </>
  ) : (
    <Text variant={TextVariant.BodyMDBold} style={styles.modalTitle}>
      {strings('contract_allowance.custom_spend_cap.set_spend_cap')}
    </Text>
  );

  let message;

  if (!value) {
    message = NO_SELECTED;
  } else if (maxSelected) {
    message = MAX_VALUE_SELECTED;
  } else if (defaultValueSelected) {
    message = DAPP_PROPOSED_VALUE_GREATER_THAN_ACCOUNT_BALANCE;
  } else if (inputValueHigherThanAccountBalance) {
    message = INPUT_VALUE_GREATER_THAN_ACCOUNT_BALANCE;
  } else {
    message = INPUT_VALUE_LOWER_THAN_ACCOUNT_BALANCE;
  }

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
                    {
                      domain,
                    },
                  )}
            </Text>
          }
          toggleModal={toggleModal}
        />
      ) : null}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text variant={TextVariant.BodyMDBold} style={styles.title}>
            {strings('contract_allowance.custom_spend_cap.title')}
          </Text>
          <Pressable onPress={toggleModal}>
            <Icon
              size={IconSize.Sm}
              name={defaultValueSelected ? IconName.Danger : IconName.Question}
              color={
                defaultValueSelected ? colors.error.default : colors.icon.muted
              }
            />
          </Pressable>
        </View>
        <Button
          variant={ButtonVariants.Link}
          onPress={handlePress}
          textVariant={TextVariant.BodyMD}
          label={
            disableEdit
              ? strings('contract_allowance.custom_spend_cap.edit')
              : defaultValueSelected
              ? strings('contract_allowance.custom_spend_cap.edit')
              : strings('contract_allowance.custom_spend_cap.use_default')
          }
        />
      </View>
      <View style={styles.inputContainer}>
        <CustomInput
          ticker={ticker}
          setValue={setValue}
          defaultValueSelected={defaultValueSelected}
          setMaxSelected={setMaxSelected}
          inputDisabled={inputDisabled}
          value={value}
          disableEdit={disableEdit}
        />
      </View>
      {value.length > 0 && inputHasError && (
        <Text variant={TextVariant.BodyMD} style={styles.errorDescription}>
          {strings('contract_allowance.custom_spend_cap.error_enter_number')}
        </Text>
      )}
      {!disableEdit && (
        <View style={styles.descriptionContainer}>
          <Text variant={TextVariant.BodyMD} style={styles.description}>
            {message}
          </Text>
        </View>
      )}
    </View>
  );
};

export default CustomSpendCap;
