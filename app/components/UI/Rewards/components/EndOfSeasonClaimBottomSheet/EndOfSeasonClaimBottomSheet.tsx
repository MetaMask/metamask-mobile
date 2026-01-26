import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import useRewardsToast from '../../hooks/useRewardsToast';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import { TouchableOpacity } from 'react-native';
import Routes from '../../../../../constants/navigation/Routes';
import {
  BoxFlexDirection,
  ButtonVariant,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  Text,
  TextVariant,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import {
  ClaimRewardDto,
  SeasonRewardType,
} from '../../../../../core/Engine/controllers/rewards-controller/types';
import { useSelector } from 'react-redux';
import { selectSelectedAccountGroup } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectIconSeedAddressByAccountGroupId } from '../../../../../selectors/multichainAccounts/accounts';
import { selectAvatarAccountType } from '../../../../../selectors/settings';
import { RootState } from '../../../../../reducers';
import AvatarAccount from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import useClaimReward from '../../hooks/useClaimReward';
import useLineaSeasonOneTokenReward from '../../hooks/useLineaSeasonOneTokenReward';
import { validateEmail } from '../../utils/formatUtils';
import { formatAssetAmount } from '../../utils/eventDetailsUtils';

export interface ModalAction {
  label: string;
  onPress: (input?: string) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export type InputFieldConfig = 'required' | 'optional' | false;

interface EndOfSeasonClaimBottomSheetProps {
  route: {
    params: {
      seasonRewardId: string;
      url?: string;
      title: string;
      description?: string;
      contactInfo?: string;
      rewardType: SeasonRewardType;
      showAccount?: boolean;
      /** Configuration for email input: 'required', 'optional', or false to hide */
      showEmail?: InputFieldConfig;
      /** Configuration for telegram input: 'required', 'optional', or false to hide */
      showTelegram?: InputFieldConfig;
      /** The reward ID needed for claiming rewards via API (e.g., METAL_CARD) */
      rewardId?: string;
    };
  };
}

/**
 * Bottom sheet modal for claiming end of season rewards.
 */

const EndOfSeasonClaimBottomSheet = ({
  route,
}: EndOfSeasonClaimBottomSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const tw = useTailwind();
  const { showToast: showRewardsToast, RewardsToastOptions } =
    useRewardsToast();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { claimReward, isClaimingReward } = useClaimReward();
  const { lineaTokenReward } = useLineaSeasonOneTokenReward();
  const {
    seasonRewardId,
    title,
    description,
    contactInfo,
    url,
    rewardType,
    showAccount = false,
    showEmail = false,
    showTelegram = false,
    rewardId,
  } = route.params;
  const navigation = useNavigation();
  const hasTrackedRewardViewed = useRef(false);

  // Email and telegram state
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [emailValidationError, setEmailValidationError] = useState(false);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    setEmailValidationError(false);
  }, []);

  // Check if we need keyboard avoiding behavior
  const needsKeyboardAvoiding = showEmail || showTelegram;

  // Account group selectors
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);
  const avatarAccountType = useSelector(selectAvatarAccountType);

  // Get EVM address for avatar using the account group ID
  const evmAddress = useSelector((state: RootState) => {
    if (!selectedAccountGroup?.id) return undefined;
    try {
      const selector = selectIconSeedAddressByAccountGroupId(
        selectedAccountGroup.id,
      );
      return selector(state);
    } catch {
      return undefined;
    }
  });

  const handleModalClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const showSuccessToastIfNeeded = useCallback(() => {
    if (rewardType === SeasonRewardType.METAL_CARD) {
      showRewardsToast(
        RewardsToastOptions.success(
          strings('rewards.end_of_season_rewards.metal_card_claim_success'),
        ),
      );
    } else if (rewardType === SeasonRewardType.LINEA_TOKENS) {
      showRewardsToast(
        RewardsToastOptions.success(
          strings('rewards.end_of_season_rewards.linea_tokens_claim_success'),
        ),
      );
    }
  }, [RewardsToastOptions, rewardType, showRewardsToast]);

  useEffect(() => {
    if (!hasTrackedRewardViewed.current) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_REWARD_VIEWED)
          .addProperties({
            reward_id: seasonRewardId,
            reward_name: title,
          })
          .build(),
      );
      hasTrackedRewardViewed.current = true;
    }
  }, [trackEvent, createEventBuilder, seasonRewardId, title]);

  const handleClaimReward = useCallback(async () => {
    // Validate email if required
    if (showEmail === 'required' && !validateEmail(email.trim())) {
      setEmailValidationError(true);
      return;
    }

    // Validate email format if provided (for optional case)
    if (
      showEmail === 'optional' &&
      email.trim() &&
      !validateEmail(email.trim())
    ) {
      setEmailValidationError(true);
      return;
    }

    try {
      switch (rewardType) {
        case SeasonRewardType.NANSEN:
        case SeasonRewardType.OTHERSIDE:
          if (!url) return;
          navigation.navigate(Routes.BROWSER.HOME, {
            screen: Routes.BROWSER.VIEW,
            params: {
              newTabUrl: url,
              timestamp: Date.now(),
            },
          });
          break;
        case SeasonRewardType.LINEA_TOKENS: {
          if (!rewardId) return;

          const claimData: ClaimRewardDto = {
            data: {
              recipientAddress: evmAddress || '',
            },
          };

          await claimReward(rewardId, claimData);
          break;
        }
        case SeasonRewardType.METAL_CARD: {
          if (!rewardId) return;

          const metalCardClaimData: ClaimRewardDto = {
            data: {
              email: email.trim(),
            },
          };

          if (telegram.trim()) {
            metalCardClaimData.data = {
              ...metalCardClaimData.data,
              telegramHandle: telegram.trim(),
            };
          }

          await claimReward(rewardId, metalCardClaimData);
          break;
        }
      }

      trackEvent(
        createEventBuilder(MetaMetricsEvents.REWARDS_REWARD_CLAIMED)
          .addProperties({
            reward_id: seasonRewardId,
            reward_name: title,
          })
          .build(),
      );

      handleModalClose();
      showSuccessToastIfNeeded();
    } catch {
      showRewardsToast(
        RewardsToastOptions.error(
          strings('rewards.end_of_season_rewards.redeem_failure_title'),
          strings('rewards.end_of_season_rewards.redeem_failure_description'),
        ),
      );
    }
  }, [
    showEmail,
    email,
    rewardType,
    trackEvent,
    createEventBuilder,
    seasonRewardId,
    title,
    handleModalClose,
    showSuccessToastIfNeeded,
    url,
    rewardId,
    evmAddress,
    telegram,
    claimReward,
    showRewardsToast,
    RewardsToastOptions,
    navigation,
  ]);

  const confirmAction = useMemo(() => {
    const label =
      rewardType === SeasonRewardType.LINEA_TOKENS ||
      rewardType === SeasonRewardType.METAL_CARD
        ? strings('rewards.end_of_season_rewards.confirm_label_default')
        : strings('rewards.end_of_season_rewards.confirm_label_access');

    return {
      label,
      onPress: handleClaimReward,
      variant: ButtonVariant.Primary,
      loading: isClaimingReward,
      disabled: isClaimingReward,
    };
  }, [rewardType, handleClaimReward, isClaimingReward]);

  const renderActions = () => (
    <Box twClassName="w-full">
      <Button
        variant={confirmAction.variant || ButtonVariant.Primary}
        size={ButtonSize.Lg}
        onPress={confirmAction.onPress}
        disabled={confirmAction.disabled}
        isLoading={confirmAction.loading}
        twClassName="w-full"
        testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_CONFIRM_BUTTON}
      >
        {confirmAction.label}
      </Button>
    </Box>
  );

  const renderEmailInput = () => {
    if (!showEmail) {
      return null;
    }

    return (
      <Box twClassName="w-full">
        <Text variant={TextVariant.BodyMd}>
          {strings('rewards.metal_card_claim.email_label')}
        </Text>
        <TextField
          textAlignVertical="center"
          textAlign="left"
          onChangeText={handleEmailChange}
          value={email}
          isError={emailValidationError}
          size={TextFieldSize.Lg}
          style={tw.style('bg-background-pressed')}
          keyboardType="email-address"
          autoCapitalize="none"
          isDisabled={isClaimingReward}
          testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_EMAIL_INPUT}
        />
        {emailValidationError && (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-error-default mt-1"
          >
            {strings('rewards.metal_card_claim.email_validation_error')}
          </Text>
        )}
      </Box>
    );
  };

  const renderTelegramInput = () => {
    if (!showTelegram) {
      return null;
    }

    return (
      <Box twClassName="w-full mb-2">
        <Text variant={TextVariant.BodyMd}>
          {strings('rewards.metal_card_claim.telegram_label')}
        </Text>
        <TextField
          textAlignVertical="center"
          textAlign="left"
          placeholder={strings('rewards.metal_card_claim.telegram_placeholder')}
          onChangeText={setTelegram}
          value={telegram}
          size={TextFieldSize.Lg}
          style={tw.style('bg-background-pressed')}
          autoCapitalize="none"
          isDisabled={isClaimingReward}
          testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_TELEGRAM_INPUT}
        />
      </Box>
    );
  };

  const renderTitle = () => {
    if (rewardType === SeasonRewardType.LINEA_TOKENS) {
      // If we have a balance amount > 0, show "You earned XXX $LINEA"
      const parsedAmount = BigInt(lineaTokenReward?.amount || '0');
      if (parsedAmount > 0n) {
        // Format the amount with 18 decimals (standard ERC-20 decimals for LINEA)
        const formattedAmount = formatAssetAmount(
          lineaTokenReward?.amount || '0',
          18,
        ); // TODO: check if this is correct in how we want to display (i.e. very low amounts show up as lower than 0.00001)
        return (
          <Box
            twClassName="flex-col items-center justify-center w-full"
            testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_LINEA_TOKENS_LOADED}
          >
            <Text variant={TextVariant.HeadingLg} twClassName="text-center">
              {strings('rewards.linea_tokens.title_earned', {
                amount: formattedAmount,
              })}
            </Text>
          </Box>
        );
      }

      // Otherwise, show default title (for loading, error, or zero balance cases)
      return (
        <Box
          twClassName="flex-col items-center justify-center w-full"
          testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_LINEA_TOKENS_DEFAULT_TITLE}
        >
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            {strings('rewards.linea_tokens.default_title')}
          </Text>
        </Box>
      );
    }

    // default return title
    return (
      <Box
        twClassName="flex-col items-center justify-center w-full"
        testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_TITLE}
      >
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
          {title}
        </Text>
      </Box>
    );
  };

  const renderDescription = () => (
    <Box twClassName="w-full">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="text-text-alternative"
        testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_DESCRIPTION}
      >
        {description}
      </Text>
    </Box>
  );

  const handleOpenAccountSelector = useCallback(() => {
    navigation.navigate(
      ...createAccountSelectorNavDetails({
        disablePrivacyMode: true,
        disableAddAccountButton: true,
      }),
    );
  }, [navigation]);

  const renderAccountSection = () => {
    if (!showAccount || !selectedAccountGroup) {
      return null;
    }

    return (
      <Box
        twClassName="w-full"
        testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL_ACCOUNT_SELECTOR}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-text-alternative mb-2"
        >
          {strings('rewards.end_of_season_rewards.select_account_description')}
        </Text>
        <TouchableOpacity
          onPress={handleOpenAccountSelector}
          style={tw.style(
            'flex-row items-center rounded-lg bg-background-muted p-4',
          )}
        >
          <AvatarAccount
            accountAddress={
              evmAddress || '0x0000000000000000000000000000000000000000'
            }
            type={avatarAccountType}
            size={AvatarSize.Md}
          />
          <Box
            flexDirection={BoxFlexDirection.Column}
            twClassName="flex-1 ml-4"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
            >
              {selectedAccountGroup.metadata.name}
            </Text>
          </Box>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Lg}
            color={IconColor.IconAlternative}
          />
        </TouchableOpacity>
      </Box>
    );
  };

  const renderContent = () => (
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Start}
      justifyContent={BoxJustifyContent.Center}
      twClassName="px-4 w-full gap-4"
    >
      {renderTitle()}
      {description && renderDescription()}
      {contactInfo && (
        <Box twClassName="w-full">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="text-text-alternative"
          >
            {contactInfo}
          </Text>
        </Box>
      )}
      {renderEmailInput()}
      {renderTelegramInput()}
      {renderAccountSection()}
      {renderActions()}
    </Box>
  );

  return (
    <BottomSheet
      ref={sheetRef}
      testID={REWARDS_VIEW_SELECTORS.CLAIM_MODAL}
      keyboardAvoidingViewEnabled={!needsKeyboardAvoiding}
    >
      <BottomSheetHeader onClose={handleModalClose}>
        {strings('rewards.end_of_season_rewards.reward_details')}
      </BottomSheetHeader>
      {needsKeyboardAvoiding ? (
        <KeyboardAwareScrollView
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={20}
        >
          {renderContent()}
        </KeyboardAwareScrollView>
      ) : (
        renderContent()
      )}
    </BottomSheet>
  );
};

export default EndOfSeasonClaimBottomSheet;
