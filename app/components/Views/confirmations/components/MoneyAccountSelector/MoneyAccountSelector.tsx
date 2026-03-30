import React, { useCallback } from 'react';
import { TextInput, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import stylesheet from './MoneyAccountSelector.styles';

export const MONEY_ACCOUNT_SELECTOR_TEST_IDS = {
  INPUT: 'money-account-selector-input',
  LABEL: 'money-account-selector-label',
};

export interface MoneyAccountSelectorProps {
  chainId?: string;
  label?: string;
  placeholder?: string;
  selectedAddress?: string;
  onAccountSelected: (address: string) => void;
}

const MoneyAccountSelector: React.FC<MoneyAccountSelectorProps> = ({
  label = strings('transaction.recipient_address'),
  placeholder = 'Paste address',
  selectedAddress,
  onAccountSelected,
}) => {
  const { styles, theme } = useStyles(stylesheet, {});

  const handleChangeText = useCallback(
    (text: string) => {
      onAccountSelected(text);
    },
    [onAccountSelected],
  );

  return (
    <View style={styles.container}>
      <Text
        variant={TextVariant.BodySMMedium}
        style={styles.label}
        testID={MONEY_ACCOUNT_SELECTOR_TEST_IDS.LABEL}
      >
        {label}
      </Text>
      <TextInput
        style={styles.input}
        value={selectedAddress ?? ''}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.muted}
        autoCapitalize="none"
        autoCorrect={false}
        testID={MONEY_ACCOUNT_SELECTOR_TEST_IDS.INPUT}
      />
    </View>
  );
};

export default MoneyAccountSelector;
