import React, { useCallback, useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '../../../../../util/theme';
import { useGetPriorityCardToken } from '../../hooks/useGetPriorityCardToken';
import { useCardDelegation } from '../../hooks/useCardDelegation';
import { useCardSDK } from '../../sdk';
import { strings } from '../../../../../../locales/i18n';
import {
  selectSpendingLimitSettings,
  setShouldShowDelegationSuccessToast,
} from '../../../../../core/redux/slices/card';
import { BAANX_MAX_LIMIT } from '../../constants';
import Logger from '../../../../../util/Logger';
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

const getNetworkFromChainId = (chainId: string): 'linea' | 'solana' => {
  if (chainId.startsWith('solana:')) {
    return 'solana';
  }
  return 'linea';
};

const SpendingLimit = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const dispatch = useDispatch();

  const { priorityToken, isLoading: isPriorityTokenLoading } =
    useGetPriorityCardToken();
  const { sdk } = useCardSDK();
  const { submitDelegation, isLoading: isDelegationLoading } =
    useCardDelegation(priorityToken);
  const spendingLimitSettings = useSelector(selectSpendingLimitSettings);

  const [showOptions, setShowOptions] = useState(false);
  const [selectedToken, setSelectedToken] =
    useState<SupportedTokenWithChain | null>(null);
  const [tempSelectedOption, setTempSelectedOption] = useState<
    'full' | 'restricted'
  >(spendingLimitSettings.isFullAccess ? 'full' : 'restricted');
  const [tempLimitAmount, setTempLimitAmount] = useState(() => {
    // Use the stored spending limit settings as the primary source
    if (!spendingLimitSettings.isFullAccess) {
      return spendingLimitSettings.limitAmount || '1000';
    }
    return spendingLimitSettings.limitAmount || '1000';
  });

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

  // Update limit amount when spending limit settings change
  useEffect(() => {
    if (
      tempSelectedOption === 'restricted' &&
      spendingLimitSettings.limitAmount
    ) {
      setTempLimitAmount(spendingLimitSettings.limitAmount);
    }
  }, [spendingLimitSettings.limitAmount, tempSelectedOption]);

  // Also update when spending limit settings become available for the first time
  useEffect(() => {
    if (
      spendingLimitSettings.limitAmount &&
      tempSelectedOption === 'restricted' &&
      tempLimitAmount === '1000'
    ) {
      setTempLimitAmount(spendingLimitSettings.limitAmount);
    }
  }, [spendingLimitSettings.limitAmount, tempSelectedOption, tempLimitAmount]);

  // Handle initial load when spending limit settings become available
  useEffect(() => {
    if (
      !isPriorityTokenLoading &&
      spendingLimitSettings.limitAmount &&
      tempSelectedOption === 'restricted'
    ) {
      setTempLimitAmount(spendingLimitSettings.limitAmount);
    }
  }, [
    isPriorityTokenLoading,
    spendingLimitSettings.limitAmount,
    tempSelectedOption,
  ]);

  const handleOptionSelect = useCallback(
    (option: 'full' | 'restricted') => {
      setTempSelectedOption(option);

      // If switching to restricted, set the limit amount to stored spending limit
      if (option === 'restricted' && spendingLimitSettings.limitAmount) {
        setTempLimitAmount(spendingLimitSettings.limitAmount);
      }
    },
    [spendingLimitSettings.limitAmount],
  );

  const handleEditLimit = useCallback(() => {
    // Reset temporary values to current saved values
    setTempSelectedOption(
      spendingLimitSettings.isFullAccess ? 'full' : 'restricted',
    );

    // Use stored spending limit settings
    setTempLimitAmount(spendingLimitSettings.limitAmount || '1000');

    setShowOptions(true);
  }, [spendingLimitSettings]);

  const handleConfirm = useCallback(async () => {
    const isFullAccess = tempSelectedOption === 'full';
    const newSpendingLimit = {
      isFullAccess,
      limitAmount: isFullAccess ? undefined : tempLimitAmount,
    };

    try {
      if (
        sdk &&
        (newSpendingLimit.isFullAccess ||
          (newSpendingLimit.limitAmount && !newSpendingLimit.isFullAccess))
      ) {
        const currentLimit = parseFloat(
          spendingLimitSettings.limitAmount || '0',
        );
        const newLimit = newSpendingLimit.isFullAccess
          ? parseFloat(BAANX_MAX_LIMIT)
          : parseFloat(newSpendingLimit.limitAmount || '0');

        const isSwitchingFromFullAccess =
          spendingLimitSettings.isFullAccess && !newSpendingLimit.isFullAccess;

        const isLimitChange = Math.abs(newLimit - currentLimit) > 0.01;

        if (isSwitchingFromFullAccess || isLimitChange) {
          const amount = newSpendingLimit.isFullAccess
            ? BAANX_MAX_LIMIT
            : newSpendingLimit.limitAmount || '0';

          const currency =
            (priorityToken?.symbol?.toLowerCase() as 'usdc' | 'usdt') || 'usdc';
          const network = priorityToken?.chainId
            ? getNetworkFromChainId(priorityToken.chainId)
            : 'linea';

          await submitDelegation(
            {
              amount,
              currency,
              network,
            },
            priorityToken?.walletAddress || '',
          );

          dispatch(setShouldShowDelegationSuccessToast(true));
        }
      }

      setShowOptions(false);
    } catch (error) {
      Logger.error(error as Error, 'Failed to save spending limit');
      console.error('Failed to save spending limit:', error);

      setTempSelectedOption(
        spendingLimitSettings.isFullAccess ? 'full' : 'restricted',
      );
      setTempLimitAmount(spendingLimitSettings.limitAmount || '1000');
    }
  }, [
    tempSelectedOption,
    tempLimitAmount,
    sdk,
    spendingLimitSettings.isFullAccess,
    spendingLimitSettings.limitAmount,
    submitDelegation,
    priorityToken?.symbol,
    priorityToken?.chainId,
    priorityToken?.walletAddress,
    dispatch,
  ]);

  const handleCancel = useCallback(() => {
    if (showOptions) {
      setShowOptions(false);
    } else {
      navigation.goBack();
    }
  }, [navigation, showOptions]);

  const isConfirmDisabled =
    tempSelectedOption === 'restricted' && !tempLimitAmount;

  return (
    <>
      {/* CardSignatureModal integration - Force Metro rebuild - v2 */}
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
          {!showOptions && spendingLimitSettings.isFullAccess ? (
            // Initial view - only show full access option without radio button
            <View style={styles.optionCard}>
              <Text
                variant={TextVariant.BodyMDMedium}
                style={styles.optionTitle}
              >
                {strings('card.card_spending_limit.full_access_title')}
              </Text>
              <Text
                variant={TextVariant.BodySM}
                style={styles.optionDescription}
              >
                {strings('card.card_spending_limit.full_access_description')}
              </Text>
              <TouchableOpacity
                style={styles.editLimitButton}
                onPress={handleEditLimit}
              >
                <Text variant={TextVariant.BodySM} style={styles.editLimitText}>
                  {strings('card.card_spending_limit.edit_limit')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : !showOptions && !spendingLimitSettings.isFullAccess ? (
            // Show restricted limit view when restricted is selected
            <View style={styles.optionCard}>
              <View style={styles.optionHeader}>
                <View style={styles.radioButton}>
                  <View style={styles.radioButtonSelected} />
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
              <View style={styles.limitInputContainer}>
                <Text
                  variant={TextVariant.BodySM}
                  style={styles.limitInputLabel}
                >
                  Limit Amount
                </Text>
                <TextInput
                  style={styles.limitInput}
                  value={tempLimitAmount}
                  onChangeText={setTempLimitAmount}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  returnKeyType="done"
                  editable={false}
                />
              </View>
              <TouchableOpacity
                style={styles.editLimitButton}
                onPress={handleEditLimit}
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
                  tempSelectedOption === 'full' && styles.selectedOptionCard,
                ]}
                onPress={() => handleOptionSelect('full')}
              >
                <View style={styles.optionHeader}>
                  <View style={styles.radioButton}>
                    {tempSelectedOption === 'full' && (
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
                  tempSelectedOption === 'restricted' &&
                    styles.selectedOptionCard,
                ]}
                onPress={() => handleOptionSelect('restricted')}
              >
                <View style={styles.optionHeader}>
                  <View style={styles.radioButton}>
                    {tempSelectedOption === 'restricted' && (
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
                {tempSelectedOption === 'restricted' && (
                  <View style={styles.limitInputContainer}>
                    <Text
                      variant={TextVariant.BodySM}
                      style={styles.limitInputLabel}
                    >
                      Limit Amount
                    </Text>
                    <TextInput
                      style={styles.limitInput}
                      value={tempLimitAmount}
                      onChangeText={setTempLimitAmount}
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
          {showOptions ? (
            <>
              <Button
                variant={ButtonVariants.Primary}
                label={strings('card.card_spending_limit.confirm_new_limit')}
                size={ButtonSize.Lg}
                onPress={handleConfirm}
                width={ButtonWidthTypes.Full}
                disabled={isConfirmDisabled || isDelegationLoading}
                loading={isDelegationLoading}
              />
              <Button
                variant={ButtonVariants.Secondary}
                label={strings('card.card_spending_limit.cancel')}
                size={ButtonSize.Lg}
                onPress={handleCancel}
                width={ButtonWidthTypes.Full}
                disabled={isDelegationLoading}
              />
            </>
          ) : (
            <Button
              variant={ButtonVariants.Secondary}
              label={strings('card.card_spending_limit.cancel')}
              size={ButtonSize.Lg}
              onPress={handleCancel}
              width={ButtonWidthTypes.Full}
              disabled={isDelegationLoading}
            />
          )}
        </View>
      </ScrollView>
    </>
  );
};

export default SpendingLimit;
