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
import { SolScope } from '@metamask/keyring-api';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import {
  AllowanceState,
  CardTokenAllowance,
  DelegationSettingsResponse,
  CardExternalWalletDetailsResponse,
} from '../../types';
import AssetSelectionBottomSheet from '../../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { mapCaipChainIdToChainName } from '../../util/mapCaipChainIdToChainName';

const getNetworkFromCaipChainId = (
  caipChainId: string,
): 'linea' | 'linea-us' | 'solana' => {
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
      selectedToken?: CardTokenAllowance;
      priorityToken?: CardTokenAllowance | null;
      allTokens?: CardTokenAllowance[];
      delegationSettings?: DelegationSettingsResponse | null;
      externalWalletDetailsData?:
        | {
            walletDetails: never[];
            mappedWalletDetails: never[];
            priorityWalletDetail: null;
          }
        | {
            walletDetails: CardExternalWalletDetailsResponse;
            mappedWalletDetails: CardTokenAllowance[];
            priorityWalletDetail: CardTokenAllowance | undefined;
          }
        | null;
    };
  };
}) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { sdk } = useCardSDK();
  const [openAssetSelectionBottomSheet, setOpenAssetSelectionBottomSheet] =
    useState(false);
  const assetSelectionSheetRef = React.useRef<BottomSheetRef>(null);

  const flow = route?.params?.flow || 'manage';
  const selectedTokenFromRoute = route?.params?.selectedToken;
  const priorityToken = route?.params?.priorityToken;
  const allTokens = route?.params?.allTokens;
  const delegationSettings = route?.params?.delegationSettings ?? null;
  const externalWalletDetailsData = route?.params?.externalWalletDetailsData;
  const [showOptions, setShowOptions] = useState(false);
  const [selectedToken, setSelectedToken] = useState<CardTokenAllowance | null>(
    null,
  );
  const [tempSelectedOption, setTempSelectedOption] = useState<
    'full' | 'restricted'
  >('full');
  const { submitDelegation, isLoading: isDelegationLoading } =
    useCardDelegation(selectedToken);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen:
            flow === 'enable'
              ? CardScreens.ENABLE_TOKEN
              : CardScreens.SPENDING_LIMIT,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, flow]);

  // Derive spending limit settings from priority token
  const spendingLimitSettings = useMemo(() => {
    if (!priorityToken) {
      return { isFullAccess: false, limitAmount: '0' };
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
      limitAmount: isFullAccess ? undefined : priorityToken.allowance || '0',
    };
  }, [priorityToken]);

  useEffect(() => {
    // If a token was passed from AssetSelectionBottomSheet (any flow), use it
    if (selectedTokenFromRoute) {
      setSelectedToken(selectedTokenFromRoute);
      return;
    }

    // For both flows, pre-select the priority token if no token is selected yet
    // and no token was passed from the route
    if (!selectedToken && priorityToken) {
      // Check if priority token is Solana
      const isPriorityTokenSolana =
        priorityToken?.caipChainId === SolScope.Mainnet ||
        priorityToken?.caipChainId?.startsWith('solana:');

      // Only pre-select if it's NOT Solana (Solana delegation is not supported)
      if (!isPriorityTokenSolana) {
        setSelectedToken({
          address: priorityToken.address ?? '',
          symbol: priorityToken.symbol ?? '',
          name: priorityToken.name ?? '',
          decimals: priorityToken.decimals ?? 0,
          caipChainId: priorityToken.caipChainId,
          allowanceState: priorityToken.allowanceState,
          allowance: priorityToken.allowance,
        });
      }
    }
  }, [flow, selectedTokenFromRoute, priorityToken, allTokens, selectedToken]);

  const handleOptionSelect = useCallback((option: 'full' | 'restricted') => {
    setTempSelectedOption(option);

    // If switching to full access, return to initial view
    if (option === 'full') {
      setShowOptions(false);
    }
  }, []);

  const handleEditLimit = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.ENABLE_TOKEN_SET_LIMIT_BUTTON,
        })
        .build(),
    );
    // When "Set a limit" is clicked, show both options and default to restricted
    setTempSelectedOption('restricted');

    setShowOptions(true);
  }, [trackEvent, createEventBuilder]);

  const handleConfirm = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.ENABLE_TOKEN_CONFIRM_BUTTON,
        })
        .build(),
    );
    const isFullAccess = tempSelectedOption === 'full';

    try {
      if (sdk && isFullAccess) {
        const currentLimit = parseFloat(
          spendingLimitSettings.limitAmount || '0',
        );
        const newLimit = parseFloat(BAANX_MAX_LIMIT);

        const isSwitchingFromFullAccess =
          spendingLimitSettings.isFullAccess && !isFullAccess;

        const isLimitChange = Math.abs(newLimit - currentLimit) > 0.01;

        if (isSwitchingFromFullAccess || isLimitChange) {
          // Always use BAANX_MAX_LIMIT for full access delegation
          // Use selectedToken if available, otherwise fall back to priorityToken
          const tokenToUse = selectedToken || priorityToken;
          const currency = tokenToUse?.symbol;
          const network = tokenToUse?.caipChainId
            ? getNetworkFromCaipChainId(tokenToUse.caipChainId)
            : 'linea';

          await submitDelegation({
            amount: BAANX_MAX_LIMIT,
            currency: currency || '',
            network,
          });

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
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tempSelectedOption,
    sdk,
    spendingLimitSettings.isFullAccess,
    spendingLimitSettings.limitAmount,
    submitDelegation,
    selectedToken,
    priorityToken,
    trackEvent,
    createEventBuilder,
    toastRef,
    theme.colors.success.default,
    theme.colors.success.muted,
    theme.colors.error.default,
    theme.colors.error.muted,
  ]);

  const handleCancel = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.ENABLE_TOKEN_CANCEL_BUTTON,
        })
        .build(),
    );

    if (showOptions) {
      setShowOptions(false);
    } else {
      navigation.goBack();
    }
  }, [navigation, showOptions, trackEvent, createEventBuilder]);

  const handleTokenSelection = useCallback((token: CardTokenAllowance) => {
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
            {mapCaipChainIdToChainName(selectedToken.caipChainId)}
          </Text>
        </View>
        <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
      </View>
    );
  };

  // Check if selected token is Solana
  const isSolanaSelected =
    selectedToken?.caipChainId === SolScope.Mainnet ||
    selectedToken?.caipChainId?.startsWith('solana:');

  const isConfirmDisabled = useMemo(
    () => tempSelectedOption === 'restricted' || isSolanaSelected,
    [tempSelectedOption, isSolanaSelected],
  );

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
              onPress={handleEditLimit}
            >
              <Text variant={TextVariant.BodySM} style={styles.editLimitText}>
                {strings('card.card_spending_limit.set_new_limit')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Options view - show both options with radio buttons in a single container
          <View style={styles.optionCard}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                handleOptionSelect('full');
                trackEvent(
                  createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
                    .addProperties({
                      action: CardActions.ENABLE_TOKEN_FULL_ACCESS_BUTTON,
                    })
                    .build(),
                );
              }}
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
              style={styles.optionItem}
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
                  <TextInput
                    style={styles.limitInput}
                    value={'0'}
                    onChangeText={() => {
                      // Do nothing
                    }}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.buttonsContainer}>
        {isSolanaSelected && (
          <View style={styles.warningContainer}>
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={theme.colors.warning.default}
              style={styles.warningIcon}
            />
            <Text
              variant={TextVariant.BodySM}
              style={[
                styles.warningText,
                { color: theme.colors.warning.default },
              ]}
            >
              {strings('card.card_spending_limit.solana_not_supported')}
            </Text>
          </View>
        )}
        <Button
          variant={ButtonVariants.Primary}
          label={strings('card.card_spending_limit.confirm_new_limit')}
          size={ButtonSize.Lg}
          onPress={handleConfirm}
          width={ButtonWidthTypes.Full}
          disabled={isConfirmDisabled || isDelegationLoading}
          style={
            isConfirmDisabled || isDelegationLoading
              ? styles.disabledButton
              : undefined
          }
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
      </View>
      {openAssetSelectionBottomSheet && (
        <AssetSelectionBottomSheet
          sheetRef={assetSelectionSheetRef}
          setOpenAssetSelectionBottomSheet={setOpenAssetSelectionBottomSheet}
          tokensWithAllowances={allTokens ?? []}
          delegationSettings={delegationSettings}
          cardExternalWalletDetails={externalWalletDetailsData}
          selectionOnly
          onTokenSelect={handleTokenSelection}
          hideSolanaAssets
        />
      )}
    </ScrollView>
  );
};

export default SpendingLimit;
