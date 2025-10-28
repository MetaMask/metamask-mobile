import React, {
  useCallback,
  useState,
  useEffect,
  useContext,
  useMemo,
} from 'react';
import { ScrollView, TouchableOpacity, View, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { useCardDelegation } from '../../hooks/useCardDelegation';
import { useCardSDK } from '../../sdk';
import { strings } from '../../../../../../locales/i18n';
import { BAANX_MAX_LIMIT, ARBITRARY_ALLOWANCE } from '../../constants';
import Logger from '../../../../../util/Logger';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import createStyles from './SpendingLimit.styles';
import useLoadCardData from '../../hooks/useLoadCardData';
import { SolScope } from '@metamask/keyring-api';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { AllowanceState } from '../../types';
import AssetSelectionBottomSheet, {
  type SupportedTokenWithChain,
} from '../../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';

const getNetworkFromCaipChainId = (caipChainId: string): 'linea' | 'solana' => {
  if (caipChainId === SolScope.Mainnet || caipChainId.startsWith('solana:')) {
    return 'solana';
  }
  return 'linea';
};

const SpendingLimit = ({
  route,
}: {
  route?: {
    params?: {
      flow?: 'manage' | 'enable';
      selectedToken?: SupportedTokenWithChain;
    };
  };
}) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { toastRef } = useContext(ToastContext);

  const flow = route?.params?.flow || 'manage';
  const selectedTokenFromRoute = route?.params?.selectedToken;

  const {
    priorityToken,
    allTokens,
    isLoading: isPriorityTokenLoading,
  } = useLoadCardData();
  const { sdk } = useCardSDK();
  const { submitDelegation, isLoading: isDelegationLoading } =
    useCardDelegation(priorityToken);

  const [openAssetSelectionBottomSheet, setOpenAssetSelectionBottomSheet] =
    useState(false);
  const assetSelectionSheetRef = React.useRef<BottomSheetRef>(null);

  // Derive spending limit settings from priority token
  const spendingLimitSettings = useMemo(() => {
    if (!priorityToken) {
      return { isFullAccess: false, limitAmount: '1000' };
    }

    const allowanceNum = parseFloat(priorityToken.allowance || '0');
    const arbitraryAllowanceNum =
      typeof ARBITRARY_ALLOWANCE === 'string'
        ? parseFloat(ARBITRARY_ALLOWANCE)
        : ARBITRARY_ALLOWANCE;
    const isFullAccess =
      priorityToken.allowanceState === AllowanceState.Enabled ||
      allowanceNum >= arbitraryAllowanceNum;

    return {
      isFullAccess,
      limitAmount: isFullAccess ? undefined : priorityToken.allowance || '1000',
    };
  }, [priorityToken]);

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
    // For 'enable' flow, use the token passed from AssetSelectionBottomSheet
    if (flow === 'enable' && selectedTokenFromRoute && !selectedToken) {
      setSelectedToken(selectedTokenFromRoute);
    }
    // For 'manage' flow, use the priority token
    else if (flow === 'manage' && priorityToken && !selectedToken) {
      const isSolana = priorityToken.caipChainId === SolScope.Mainnet;
      setSelectedToken({
        address: priorityToken.address ?? '',
        symbol: priorityToken.symbol ?? '',
        name: priorityToken.name ?? '',
        decimals: priorityToken.decimals ?? 0,
        enabled: true,
        caipChainId: priorityToken.caipChainId,
        chainName: isSolana ? 'Solana' : 'Linea',
        allowanceState: priorityToken.allowanceState,
        allowance: priorityToken.allowance,
      });
    }
  }, [flow, selectedTokenFromRoute, priorityToken, selectedToken]);

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
          const network = priorityToken?.caipChainId
            ? getNetworkFromCaipChainId(priorityToken.caipChainId)
            : 'linea';

          await submitDelegation(
            {
              amount,
              currency,
              network,
            },
            priorityToken?.walletAddress || '',
          );

          // Show success toast
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            labelOptions: [
              { label: strings('card.card_spending_limit.update_success') },
            ],
            iconName: IconName.Confirmation,
            iconColor: theme.colors.success.default,
            backgroundColor: theme.colors.success.muted,
            hasNoTimeout: false,
          });
        }
      }

      setShowOptions(false);
    } catch (error) {
      Logger.error(error as Error, 'Failed to save spending limit');

      // Show error toast
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('card.card_spending_limit.update_error') },
        ],
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.error.muted,
        hasNoTimeout: false,
      });

      setTempSelectedOption(
        spendingLimitSettings.isFullAccess ? 'full' : 'restricted',
      );
      setTempLimitAmount(spendingLimitSettings.limitAmount || '1000');
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tempSelectedOption,
    tempLimitAmount,
    sdk,
    spendingLimitSettings.isFullAccess,
    spendingLimitSettings.limitAmount,
    submitDelegation,
    priorityToken?.symbol,
    priorityToken?.caipChainId,
    priorityToken?.walletAddress,
  ]);

  const handleCancel = useCallback(() => {
    if (showOptions) {
      setShowOptions(false);
    } else {
      navigation.goBack();
    }
  }, [navigation, showOptions]);

  const handleTokenSelection = useCallback((token: SupportedTokenWithChain) => {
    setSelectedToken(token);
    setOpenAssetSelectionBottomSheet(false);
  }, []);

  const renderSelectedToken = () => {
    if (!selectedToken) {
      return (
        <View style={styles.selectedTokenContainer}>
          <Text variant={TextVariant.BodyMD} style={styles.placeholderText}>
            Select token
          </Text>
          <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
        </View>
      );
    }

    const iconUrl = buildTokenIconUrl(
      selectedToken.caipChainId,
      selectedToken.address || '',
    );

    return (
      <View style={styles.selectedTokenContainer}>
        <AvatarToken
          name={selectedToken.symbol || ''}
          imageSource={iconUrl ? { uri: iconUrl } : undefined}
          size={AvatarSize.Md}
          style={styles.selectedTokenIcon}
        />
        <View style={styles.selectedTokenInfo}>
          <Text variant={TextVariant.BodyMD} style={styles.selectedTokenSymbol}>
            {selectedToken.symbol}
          </Text>
          <Text variant={TextVariant.BodySM} style={styles.selectedChainName}>
            {selectedToken.chainName}
          </Text>
        </View>
        <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
      </View>
    );
  };

  const isConfirmDisabled =
    tempSelectedOption === 'restricted' && !tempLimitAmount;

  return (
    <ScrollView
      style={styles.wrapper}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.assetContainer}>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setOpenAssetSelectionBottomSheet(true)}
        >
          {renderSelectedToken()}
        </TouchableOpacity>
      </View>

      <View style={styles.optionsContainer}>
        {!showOptions && spendingLimitSettings.isFullAccess ? (
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
            <Text variant={TextVariant.BodySM} style={styles.optionDescription}>
              {strings('card.card_spending_limit.restricted_limit_description')}
            </Text>
            <View style={styles.limitInputContainer}>
              <Text variant={TextVariant.BodySM} style={styles.limitInputLabel}>
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
      {openAssetSelectionBottomSheet && (
        <AssetSelectionBottomSheet
          sheetRef={assetSelectionSheetRef}
          setOpenAssetSelectionBottomSheet={setOpenAssetSelectionBottomSheet}
          priorityToken={priorityToken}
          tokensWithAllowances={allTokens}
          selectionOnly
          onTokenSelect={handleTokenSelection}
        />
      )}
    </ScrollView>
  );
};

export default SpendingLimit;
