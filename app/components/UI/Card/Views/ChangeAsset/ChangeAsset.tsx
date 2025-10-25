import React, { useCallback, useEffect, useState, useContext } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '../../../../../util/theme';
import { useCardSDK } from '../../sdk';
import { useCardDelegation } from '../../hooks/useCardDelegation';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import {
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
} from '../../../../../core/redux/slices/card';
import { AllowanceState, CardTokenAllowance } from '../../types';
import Logger from '../../../../../util/Logger';
import createStyles from './ChangeAsset.styles';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import AssetSelectionBottomSheet from '../../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { Hex } from '@metamask/utils';

interface SupportedTokenWithChain {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  enabled: boolean;
  chainId: string;
  chainName: string;
}

import { BAANX_MAX_LIMIT } from '../../constants';

const getChainNameFromChainId = (chainId: string): string => {
  const decimalChainId = parseInt(chainId, 10);

  if (decimalChainId === 59144 || decimalChainId === 59140) {
    return 'Linea';
  }
  if (decimalChainId === 1 || decimalChainId === 11155111) {
    return 'Ethereum';
  }
  if (decimalChainId === 101 || decimalChainId === 103) {
    return 'Solana';
  }

  return 'Linea';
};

const getNetworkFromChainId = (chainId: string): 'solana' => {
  const chainName = getChainNameFromChainId(chainId).toLowerCase();

  if (chainName === 'solana') {
    return 'solana';
  }

  return 'solana';
};

const ChangeAsset = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();
  const styles = createStyles(theme);
  const dispatch = useDispatch();
  const { toastRef } = useContext(ToastContext);
  const { sdk } = useCardSDK();
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const routeParams = route.params as
    | {
        selectedToken?: SupportedTokenWithChain;
        priorityToken?: CardTokenAllowance;
      }
    | undefined;
  const priorityToken = routeParams?.priorityToken;
  const { submitDelegation, isLoading: isDelegationLoading } =
    useCardDelegation(priorityToken);
  const [selectedToken, setSelectedToken] =
    useState<SupportedTokenWithChain | null>(
      routeParams?.selectedToken || null,
    );
  const [showAssetSelectionBottomSheet, setShowAssetSelectionBottomSheet] =
    useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [tempSelectedOption, setTempSelectedOption] = useState<
    'full' | 'restricted'
  >('full');
  const [tempLimitAmount, setTempLimitAmount] = useState('1000');

  // Initialize with current priority token
  useEffect(() => {
    if (priorityToken && !selectedToken) {
      setSelectedToken({
        address: priorityToken.address || '',
        symbol: priorityToken.symbol || '',
        name: priorityToken.name || '',
        decimals: priorityToken.decimals || 6,
        enabled: true,
        chainId: priorityToken.chainId ?? '',
        chainName: getChainNameFromChainId(priorityToken.chainId ?? ''),
      });
    }
  }, [priorityToken, selectedToken]);

  const handleEnableToken = useCallback(async () => {
    if (!selectedToken || !sdk || !selectedAccount?.address) return;

    try {
      Logger.log('Enabling token:', selectedToken);

      const amount =
        tempSelectedOption === 'full' ? BAANX_MAX_LIMIT : tempLimitAmount;

      const network = getNetworkFromChainId(selectedToken.chainId);

      Logger.log('Delegation parameters:', {
        amount,
        currency: selectedToken.symbol.toLowerCase(),
        network,
        selectedOption: tempSelectedOption,
        userAddress: selectedAccount.address,
      });

      await submitDelegation(
        {
          amount,
          currency: selectedToken.symbol.toLowerCase() as 'usdc' | 'usdt',
          network,
        },
        selectedAccount.address,
      );

      // Update wallet priority to make the selected token priority 1
      try {
        Logger.log('Waiting for Baanx to process delegation...');
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

        Logger.log('Fetching current wallet details for priority update...');
        const currentWalletDetails = await sdk.getCardExternalWalletDetails();
        Logger.log('Current wallet details:', currentWalletDetails);

        // Find the wallet ID for the selected token
        const selectedWallet = currentWalletDetails.find(
          (wallet) =>
            wallet.currency?.toLowerCase() ===
            selectedToken.symbol.toLowerCase(),
        );

        Logger.log('Selected wallet found:', selectedWallet);
        Logger.log('Looking for token:', selectedToken.symbol.toLowerCase());

        if (selectedWallet) {
          // Create new priority order: selected token becomes priority 1, others shift down
          const newPriorities = currentWalletDetails.map((wallet, index) => ({
            id: wallet.id,
            priority: wallet.id === selectedWallet.id ? 1 : index + 2,
          }));

          Logger.log('Updating wallet priorities:', newPriorities);
          await sdk.updateWalletPriority(newPriorities);
          Logger.log('Wallet priority updated successfully:', newPriorities);
        } else {
          Logger.log(
            'Selected wallet not found in current wallet details - may need more time for Baanx to process',
          );
        }
      } catch (error) {
        Logger.log('Error updating wallet priority:', error);
        // Continue even if priority update fails
      }

      // Set the enabled token as the priority token
      const priorityTokenData = {
        address: selectedToken.address,
        decimals: selectedToken.decimals,
        symbol: selectedToken.symbol,
        name: selectedToken.name,
        allowanceState: AllowanceState.Enabled,
        allowance: amount,
        availableBalance: '0',
        walletAddress: selectedAccount.address,
        chainId: selectedToken.chainId.startsWith('0x')
          ? selectedToken.chainId
          : `0x${parseInt(
              selectedToken.chainId.replace('eip155:', ''),
            ).toString(16)}`,
        isStaked: false,
      };

      dispatch(setAuthenticatedPriorityToken(priorityTokenData));
      dispatch(setAuthenticatedPriorityTokenLastFetched(new Date()));

      // Show success toast
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.CheckBold,
        iconColor: theme.colors.primary.default,
        backgroundColor: theme.colors.background.default,
        labelOptions: [
          { label: 'Spending token updated', isBold: true },
          { label: '\n', isBold: false },
          { label: selectedToken.symbol.toUpperCase(), isBold: false },
        ],
        closeButtonOptions: {
          variant: ButtonVariants.Primary,
          endIconName: IconName.CircleX,
          label: '',
          onPress: () => {
            toastRef?.current?.closeToast();
          },
        },
        hasNoTimeout: false,
      });

      navigation.goBack();
    } catch (error) {
      Logger.log('Error enabling token:', error);
    }
  }, [
    selectedToken,
    sdk,
    selectedAccount,
    submitDelegation,
    navigation,
    tempSelectedOption,
    tempLimitAmount,
    toastRef,
    theme,
    dispatch,
  ]);

  const handleEditLimit = useCallback(() => {
    setTempSelectedOption('full');
    setTempLimitAmount('1000');
    setShowOptions(true);
  }, []);

  const handleOptionSelect = useCallback((option: 'full' | 'restricted') => {
    setTempSelectedOption(option);
    if (option === 'restricted') {
      setTempLimitAmount('1000');
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      setShowOptions(false);

      await handleEnableToken();

      Logger.log('Spending limit options confirmed:', {
        option: tempSelectedOption,
        limitAmount: tempLimitAmount,
      });
    } catch (error) {
      Logger.log('Error confirming spending limit options:', error);
    }
  }, [tempSelectedOption, tempLimitAmount, handleEnableToken]);

  const handleCancel = useCallback(() => {
    if (showOptions) {
      setShowOptions(false);
    } else {
      navigation.goBack();
    }
  }, [navigation, showOptions]);

  return (
    <>
      <ScrollView
        style={styles.wrapper}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.assetContainer}>
          {/* Selected Token Display */}
          <TouchableOpacity
            onPress={() => setShowAssetSelectionBottomSheet(true)}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="bg-muted rounded-lg p-4"
            >
              {(() => {
                if (!selectedToken) return null;

                // Convert CAIP chain ID to hex format for both icon and badge
                Logger.log('ChangeAsset chain ID conversion:', {
                  originalChainId: selectedToken.chainId,
                  type: typeof selectedToken.chainId,
                });

                const decimalChainId = selectedToken.chainId.replace(
                  'eip155:',
                  '',
                );
                const hexChainId = `0x${parseInt(decimalChainId, 10).toString(
                  16,
                )}`;
                const iconUrl = buildTokenIconUrl(
                  hexChainId,
                  selectedToken.address,
                );

                Logger.log('ChangeAsset token data:', {
                  symbol: selectedToken.symbol,
                  address: selectedToken.address,
                  originalChainId: selectedToken.chainId,
                  decimalChainId,
                  hexChainId,
                  generatedUrl: iconUrl,
                });

                return (
                  <BadgeWrapper
                    style={styles.tokenIcon}
                    badgePosition={BadgePosition.BottomRight}
                    badgeElement={
                      <Badge
                        variant={BadgeVariant.Network}
                        imageSource={NetworkBadgeSource(hexChainId as Hex)}
                      />
                    }
                  >
                    <AvatarToken
                      name={selectedToken.symbol}
                      imageSource={iconUrl ? { uri: iconUrl } : undefined}
                      size={AvatarSize.Md}
                    />
                  </BadgeWrapper>
                );
              })()}
              <View style={styles.tokenInfo}>
                <Text variant={TextVariant.BodyMDBold}>
                  {selectedToken?.symbol || 'USDC'}
                </Text>
                <Text variant={TextVariant.BodySM} style={styles.tokenNetwork}>
                  {selectedToken?.chainName || 'Linea'}
                </Text>
              </View>
              <Icon
                name={IconName.ArrowDown}
                size={IconSize.Sm}
                style={styles.dropdownIcon}
              />
            </Box>
          </TouchableOpacity>
        </View>

        <View style={styles.optionsContainer}>
          {!showOptions ? (
            // Initial view - only show full access option
            <Box twClassName="bg-muted rounded-lg p-4">
              <Text
                variant={TextVariant.BodyMDBold}
                style={styles.sectionTitle}
              >
                {strings('card.change_asset.full_spending_access')}
              </Text>
              <Text
                variant={TextVariant.BodySM}
                style={styles.sectionDescription}
              >
                {strings('card.change_asset.full_spending_description')}
              </Text>
              <TouchableOpacity
                style={styles.editLimitButton}
                onPress={handleEditLimit}
              >
                <Text variant={TextVariant.BodySM} style={styles.editLimitText}>
                  {strings('card.change_asset.edit_limit')}
                </Text>
              </TouchableOpacity>
            </Box>
          ) : (
            // Options view - show both options with radio buttons
            <>
              <TouchableOpacity
                style={[
                  styles.fullAccessOptionCard,
                  tempSelectedOption === 'full' &&
                    styles.fullAccessOptionCardSelected,
                ]}
                onPress={() => handleOptionSelect('full')}
              >
                <View style={styles.optionHeaderRow}>
                  <View style={styles.radioButtonContainer}>
                    {tempSelectedOption === 'full' && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    style={styles.optionTitle}
                  >
                    {strings('card.change_asset.full_spending_access')}
                  </Text>
                </View>
                <Text
                  variant={TextVariant.BodySM}
                  style={styles.optionDescription}
                >
                  {strings('card.change_asset.full_spending_description')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.restrictedOptionCard,
                  tempSelectedOption === 'restricted' &&
                    styles.restrictedOptionCardSelected,
                ]}
                onPress={() => handleOptionSelect('restricted')}
              >
                <View style={styles.optionHeaderRow}>
                  <View style={styles.radioButtonContainer}>
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

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          {showOptions ? (
            <>
              <Button
                variant={ButtonVariants.Primary}
                label={strings('card.card_spending_limit.confirm_new_limit')}
                size={ButtonSize.Lg}
                onPress={handleConfirm}
                width={ButtonWidthTypes.Full}
                disabled={isDelegationLoading}
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
            <>
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                onPress={handleEnableToken}
                label={strings('card.change_asset.confirm')}
                disabled={!selectedToken || isDelegationLoading}
                loading={isDelegationLoading}
              />
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                width={ButtonWidthTypes.Full}
                onPress={handleCancel}
                label={strings('card.change_asset.cancel')}
                disabled={isDelegationLoading}
              />
            </>
          )}
        </View>
      </ScrollView>

      {/* Asset Selection Bottom Sheet */}
      {showAssetSelectionBottomSheet && (
        <AssetSelectionBottomSheet
          onClose={() => setShowAssetSelectionBottomSheet(false)}
          onTokenSelect={(token) => {
            setSelectedToken(token);
            setShowAssetSelectionBottomSheet(false);
          }}
          navigateToCardHomeOnPriorityToken
        />
      )}
    </>
  );
};

export default ChangeAsset;
