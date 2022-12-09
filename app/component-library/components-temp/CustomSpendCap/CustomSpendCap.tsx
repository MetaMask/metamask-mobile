// Third party dependencies.
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import { strings } from '../../../../locales/i18n';
import ButtonLink from '../../components/Buttons/Button/variants/ButtonLink';
import Text, { TextVariants } from '../../components/Texts/Text';
import formatNumber from '../../../util/formatNumber';
import CustomInput from './CustomInput';

// Internal dependencies.
import { CUSTOM_SPEND_CAP_TEST_ID } from './CustomSpendCap.constants';
import { CustomSpendCapProps } from './CustomSpendCap.types';
import customSpendCapStyles from './CustomSpendCap.styles';

const CustomSpendCap = ({
  ticker,
  dappProposedValue,
  accountBalance,
  domain,
}: CustomSpendCapProps) => {
  const { styles } = useStyles(customSpendCapStyles, {});

  const [value, setValue] = useState('');
  const [inputDisabled, setInputDisabled] = useState(true);
  const [maxSelected, setMaxSelected] = useState(false);
  const [defaultValueSelected, setDefaultValueSelected] = useState(false);
  const [
    inputValueHigherThanAccountBalance,
    setInputValueHigherThanAccountBalance,
  ] = useState(false);

  const handlePress = () => {
    setMaxSelected(false);
    setValue(dappProposedValue);
    setDefaultValueSelected(!defaultValueSelected);
    setInputDisabled(!inputDisabled);
  };

  useEffect(() => {
    if (maxSelected) setValue(accountBalance);
  }, [maxSelected, accountBalance]);

  const dappValue = Number(dappProposedValue) - Number(accountBalance);
  const difference = Number(value) - Number(accountBalance);

  useEffect(() => {
    if (Number(value) > Number(accountBalance)) {
      setInputValueHigherThanAccountBalance(true);
    } else {
      setInputValueHigherThanAccountBalance(false);
    }
  }, [value, accountBalance]);

  const MAX_VALUE_SELECTED = strings(
    'contract_allowance.custom_spend_cap.max_value_selected',
    { accountBalance: formatNumber(accountBalance), ticker },
  );
  const NO_SELECTED = strings(
    'contract_allowance.custom_spend_cap.no_value_selected',
    { domain },
  );
  const DAPP_PROPOSED_VALUE_GREATER_THAN_ACCOUNT_BALANCE = strings(
    'contract_allowance.custom_spend_cap.dapp_proposed_value_greater_than_account_balance',
    {
      accountBalance: formatNumber(accountBalance),
      dappValue: formatNumber(dappValue),
      ticker,
    },
  );
  const INPUT_VALUE_GREATER_THAN_ACCOUNT_BALANCE = strings(
    'contract_allowance.custom_spend_cap.input_value_greater_than_account_balance',
    {
      accountBalance: formatNumber(accountBalance),
      difference: formatNumber(difference),
      ticker,
    },
  );

  return (
    <View style={styles.container} testID={CUSTOM_SPEND_CAP_TEST_ID}>
      <View style={styles.header}>
        <Text variant={TextVariants.sBodyMDBold}>Custom spending cap</Text>
        {defaultValueSelected ? (
          <ButtonLink onPress={handlePress} textVariants={TextVariants.sBodyMD}>
            {strings('contract_allowance.custom_spend_cap.edit')}
          </ButtonLink>
        ) : (
          <ButtonLink onPress={handlePress} textVariants={TextVariants.sBodyMD}>
            {strings('contract_allowance.custom_spend_cap.use_default')}
          </ButtonLink>
        )}
      </View>
      <CustomInput
        ticker={ticker}
        setValue={setValue}
        defaultValueSelected={defaultValueSelected}
        setMaxSelected={setMaxSelected}
        inputDisabled={inputDisabled}
        value={value}
      />
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
  );
};

export default CustomSpendCap;
