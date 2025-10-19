import React, { useCallback, useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { useGetPriorityCardToken } from '../../hooks/useGetPriorityCardToken';
import { useSpendingLimit } from '../../hooks/useSpendingLimit';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import TokenSelectorDropdown, {
  SupportedTokenWithChain,
} from '../../components/TokenSelectorDropdown';
import createStyles from './SpendingLimit.styles';

const SpendingLimit = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);

  const { priorityToken } = useGetPriorityCardToken();
  const { spendingLimit, saveSpendingLimit, isLoading } = useSpendingLimit();

  const [selectedOption, setSelectedOption] = useState<'full' | 'restricted'>(
    spendingLimit.isFullAccess ? 'full' : 'restricted',
  );
  const [limitAmount, setLimitAmount] = useState(
    spendingLimit.limitAmount || '1000',
  );
  const [showOptions, setShowOptions] = useState(false);
  const [selectedToken, setSelectedToken] =
    useState<SupportedTokenWithChain | null>(null);

  useEffect(() => {
    if (priorityToken && !selectedToken) {
      setSelectedToken({
        address: priorityToken.address,
        symbol: priorityToken.symbol,
        name: priorityToken.name,
        decimals: priorityToken.decimals,
        enabled: true,
        chainId: priorityToken.chainId ?? '',
        chainName: 'Linea',
      });
    }
  }, [priorityToken, selectedToken]);

  const handleConfirm = useCallback(async () => {
    const newSpendingLimit = {
      isFullAccess: selectedOption === 'full',
      limitAmount: selectedOption === 'restricted' ? limitAmount : undefined,
    };

    await saveSpendingLimit(newSpendingLimit);
  }, [selectedOption, limitAmount, saveSpendingLimit]);

  const handleCancel = useCallback(() => {
    if (showOptions) {
      setShowOptions(false);
    } else {
      navigation.goBack();
    }
  }, [navigation, showOptions]);

  const isConfirmDisabled = selectedOption === 'restricted' && !limitAmount;

  return (
    <ScrollView
      style={styles.wrapper}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.assetContainer}>
        <TokenSelectorDropdown
          selectedToken={selectedToken}
          onTokenSelect={setSelectedToken}
        />
      </View>

      <View style={styles.optionsContainer}>
        {!showOptions ? (
          // Initial view - only show full access option without radio button
          <View style={styles.optionCard}>
            <Text variant={TextVariant.BodyMDMedium} style={styles.optionTitle}>
              {strings('card.card_spending_limit.full_access_title')}
            </Text>
            <Text variant={TextVariant.BodySM} style={styles.optionDescription}>
              {strings('card.card_spending_limit.full_access_description')}
            </Text>
            <TouchableOpacity
              style={styles.editLimitButton}
              onPress={() => setShowOptions(true)}
            >
              <Text variant={TextVariant.BodySM} style={styles.editLimitText}>
                {strings('card.card_spending_limit.edit_limit')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Options view - show both options with radio buttons
          <>
            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedOption === 'full' && styles.selectedOptionCard,
              ]}
              onPress={() => setSelectedOption('full')}
            >
              <View style={styles.optionHeader}>
                <View style={styles.radioButton}>
                  {selectedOption === 'full' && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  style={styles.optionTitle}
                >
                  {strings('card.card_spending_limit.full_access_title')}
                </Text>
              </View>
              <Text
                variant={TextVariant.BodySM}
                style={styles.optionDescription}
              >
                {strings('card.card_spending_limit.full_access_description')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedOption === 'restricted' && styles.selectedOptionCard,
              ]}
              onPress={() => setSelectedOption('restricted')}
            >
              <View style={styles.optionHeader}>
                <View style={styles.radioButton}>
                  {selectedOption === 'restricted' && (
                    <View style={styles.radioButtonSelected} />
                  )}
                </View>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  style={styles.optionTitle}
                >
                  {strings('card.card_spending_limit.restricted_limit_title')}
                </Text>
              </View>
              <Text
                variant={TextVariant.BodySM}
                style={styles.optionDescription}
              >
                {strings(
                  'card.card_spending_limit.restricted_limit_description',
                )}
              </Text>
              {selectedOption === 'restricted' && (
                <View style={styles.limitInputContainer}>
                  <Text
                    variant={TextVariant.BodySM}
                    style={styles.limitInputLabel}
                  >
                    Limit Amount
                  </Text>
                  <TextInput
                    style={styles.limitInput}
                    value={limitAmount}
                    onChangeText={setLimitAmount}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.buttonsContainer}>
        <Button
          variant={ButtonVariants.Primary}
          label={strings('card.card_spending_limit.confirm_new_limit')}
          size={ButtonSize.Lg}
          onPress={showOptions ? handleConfirm : () => setShowOptions(true)}
          width={ButtonWidthTypes.Full}
          disabled={isConfirmDisabled || isLoading}
          loading={isLoading}
        />
        <Button
          variant={ButtonVariants.Secondary}
          label={strings('card.card_spending_limit.cancel')}
          size={ButtonSize.Lg}
          onPress={handleCancel}
          width={ButtonWidthTypes.Full}
          disabled={isLoading}
        />
      </View>
    </ScrollView>
  );
};

export default SpendingLimit;
