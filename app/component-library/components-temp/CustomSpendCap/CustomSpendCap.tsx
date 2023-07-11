// Third party dependencies.
import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { strings } from '../../../../locales/i18n';
import InfoModal from '../../../components/UI/Swaps/components/InfoModal';
import { TOKEN_APPROVAL_SPENDING_CAP } from '../../../constants/urls';
import formatNumber from '../../../util/formatNumber';
import { isNumber } from '../../../util/number';
import Button, { ButtonVariants } from '../../components/Buttons/Button';
import Icon, { IconName, IconSize } from '../../components/Icons/Icon';
import Text, { TextVariant } from '../../components/Texts/Text';
// External dependencies.
import { useStyles } from '../../hooks';
import CustomInput from './CustomInput';
// Internal dependencies.
import { CUSTOM_SPEND_CAP_TEST_ID } from './CustomSpendCap.constants';
import customSpendCapStyles from './CustomSpendCap.styles';
import { CustomSpendCapProps } from './CustomSpendCap.types';

const CustomSpendCap = ({
  ticker,
  dappProposedValue,
  accountBalance,
  onInputChanged,
  isEditDisabled,
  editValue,
  tokenSpendValue,
  isInputValid,
  tokenDecimal,
  toggleLearnMoreWebPage,
}: CustomSpendCapProps) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(customSpendCapStyles, {});

  const [value, setValue] = useState(tokenSpendValue);
  const [inputDisabled, setInputDisabled] = useState(true);
  const [maxSelected, setMaxSelected] = useState(false);
  const [
    inputValueHigherThanAccountBalance,
    setInputValueHigherThanAccountBalance,
  ] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [inputHasError, setInputHasError] = useState(false);

  useEffect(() => {
    if (isNumber(value)) {
      setInputHasError(false);
    } else {
      setInputHasError(true);
    }

    onInputChanged(value);
  }, [value, onInputChanged]);

  useEffect(() => {
    isInputValid(!inputHasError);
  }, [inputHasError, isInputValid]);

  useEffect(() => {
    const spendValue = tokenSpendValue || dappProposedValue;
    setValue(spendValue);
  }, [dappProposedValue, tokenSpendValue]);

  const handleDefaultValue = () => {
    setMaxSelected(false);
    setValue(dappProposedValue);
    setInputDisabled(!inputDisabled);
  };

  const handlePress = () => {
    isEditDisabled ? editValue() : handleDefaultValue();
  };

  useEffect(() => {
    if (maxSelected) setValue(accountBalance);
  }, [maxSelected, accountBalance]);

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
    'contract_allowance.custom_spend_cap.default_error_message',
  );

  const INPUT_VALUE_GREATER_THAN_ACCOUNT_BALANCE = strings(
    'contract_allowance.custom_spend_cap.amount_greater_than_balance',
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

  const infoModalTitle = inputValueHigherThanAccountBalance ? (
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

  if (!value || !Number(value)) {
    message = NO_SELECTED;
  } else if (maxSelected) {
    message = MAX_VALUE_SELECTED;
  } else if (inputValueHigherThanAccountBalance) {
    message = INPUT_VALUE_GREATER_THAN_ACCOUNT_BALANCE;
  } else {
    message = INPUT_VALUE_LOWER_THAN_ACCOUNT_BALANCE;
  }

  const openLearnMore = () =>
    toggleLearnMoreWebPage(TOKEN_APPROVAL_SPENDING_CAP);

  return (
    <View style={styles.container} testID={CUSTOM_SPEND_CAP_TEST_ID}>
      {isModalVisible ? (
        <InfoModal
          isVisible={isModalVisible}
          title={infoModalTitle}
          body={
            <Text>
              {inputValueHigherThanAccountBalance
                ? strings(
                    'contract_allowance.custom_spend_cap.info_modal_description_default',
                  )
                : strings(
                    'contract_allowance.custom_spend_cap.default_error_message',
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
              name={
                inputValueHigherThanAccountBalance
                  ? IconName.Danger
                  : IconName.Question
              }
              color={
                inputValueHigherThanAccountBalance
                  ? colors.error.default
                  : colors.icon.muted
              }
            />
          </Pressable>
        </View>
        <Button
          variant={ButtonVariants.Link}
          onPress={handlePress}
          textVariant={TextVariant.BodyMD}
          label={
            isEditDisabled
              ? strings('contract_allowance.custom_spend_cap.edit')
              : strings(
                  'contract_allowance.custom_spend_cap.use_site_suggestion',
                )
          }
        />
      </View>
      <View style={styles.inputContainer}>
        <CustomInput
          ticker={ticker}
          setValue={setValue}
          isInputGreaterThanBalance={inputValueHigherThanAccountBalance}
          setMaxSelected={setMaxSelected}
          value={value}
          isEditDisabled={isEditDisabled}
          tokenDecimal={tokenDecimal}
        />
      </View>
      {value.length > 0 && inputHasError && (
        <Text variant={TextVariant.BodyMD} style={styles.errorDescription}>
          {strings('contract_allowance.custom_spend_cap.error_enter_number')}
        </Text>
      )}
      {!isEditDisabled && (
        <View style={styles.descriptionContainer}>
          <Text variant={TextVariant.BodyMD} style={styles.description}>
            {message}{' '}
            <Button
              variant={ButtonVariants.Link}
              onPress={openLearnMore}
              label={strings('contract_allowance.custom_spend_cap.learn_more')}
            />
          </Text>
        </View>
      )}
    </View>
  );
};

export default CustomSpendCap;
