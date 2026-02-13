import React, { useCallback, useRef } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  TextVariant,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../../component-library/components/BottomSheets/BottomSheet';
import TextField from '../../../../../../../component-library/components/Form/TextField';
import { strings } from '../../../../../../../../locales/i18n';
import {
  useValidateBonusCode,
  BONUS_CODE_MIN_LENGTH,
  BONUS_CODE_MAX_LENGTH,
} from '../../../../hooks/useValidateBonusCode';
import { useApplyBonusCode } from '../../../../hooks/useApplyBonusCode';
import useRewardsToast from '../../../../hooks/useRewardsToast';
import { useTheme } from '../../../../../../../util/theme';

interface BonusCodeBottomSheetProps {
  route: {
    params: {
      title: string | React.ReactNode;
      description: string | React.ReactNode;
      ctaLabel: string;
    };
  };
}

const BonusCodeBottomSheet: React.FC<BonusCodeBottomSheetProps> = ({
  route,
}) => {
  const { title, description, ctaLabel } = route.params;
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { showToast, RewardsToastOptions } = useRewardsToast();

  const {
    bonusCode,
    setBonusCode,
    isValidating,
    isValid,
    isUnknownError,
    error,
  } = useValidateBonusCode();

  const {
    applyBonusCode,
    isApplyingBonusCode,
    applyBonusCodeError,
    clearApplyBonusCodeError,
    applyBonusCodeSuccess,
  } = useApplyBonusCode();

  const handleSubmit = useCallback(async () => {
    clearApplyBonusCodeError();
    try {
      await applyBonusCode(bonusCode);
      showToast(
        RewardsToastOptions.success(
          strings('rewards.bonus_code.apply_success'),
        ),
      );
      navigation.goBack();
    } catch {
      // Error is handled by the hook
    }
  }, [
    applyBonusCode,
    bonusCode,
    clearApplyBonusCodeError,
    navigation,
    showToast,
    RewardsToastOptions,
  ]);

  const isSubmitDisabled =
    !isValid || isApplyingBonusCode || isValidating || applyBonusCodeSuccess;

  const showValidationError =
    bonusCode.length >= BONUS_CODE_MIN_LENGTH &&
    !isValid &&
    !isValidating &&
    !isUnknownError;

  const renderInputIcon = () => {
    if (isValidating) {
      return <ActivityIndicator color={colors.icon.default} />;
    }

    if (isValid) {
      return (
        <Icon
          name={IconName.Confirmation}
          size={IconSize.Lg}
          color={IconColor.SuccessDefault}
        />
      );
    }

    if (
      bonusCode.length >= BONUS_CODE_MIN_LENGTH &&
      !isValid &&
      !isUnknownError
    ) {
      return (
        <Icon
          name={IconName.Error}
          size={IconSize.Lg}
          color={IconColor.ErrorDefault}
        />
      );
    }

    return null;
  };

  return (
    <BottomSheet ref={sheetRef}>
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        twClassName="p-4"
        testID="bonus-code-bottom-sheet"
      >
        <Box
          alignItems={
            typeof title === 'string'
              ? BoxAlignItems.Center
              : BoxAlignItems.Start
          }
          twClassName="mb-3 w-full"
        >
          {typeof title === 'string' ? (
            <Text variant={TextVariant.HeadingMd}>{title}</Text>
          ) : (
            title
          )}
        </Box>
        <Box
          alignItems={
            typeof description === 'string'
              ? BoxAlignItems.Center
              : BoxAlignItems.Start
          }
          twClassName="mb-3 w-full"
        >
          {typeof description === 'string' ? (
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-alternative text-center"
            >
              {description}
            </Text>
          ) : (
            description
          )}
        </Box>

        <Box twClassName="w-full mb-6">
          <TextField
            testID="bonus-code-input"
            placeholder={strings('rewards.bonus_code.input_placeholder')}
            value={bonusCode}
            onChangeText={(text: string) => {
              clearApplyBonusCodeError();
              setBonusCode(text);
            }}
            maxLength={BONUS_CODE_MAX_LENGTH}
            autoCapitalize="characters"
            endAccessory={renderInputIcon()}
            isError={showValidationError || Boolean(applyBonusCodeError)}
          />
          {showValidationError && (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-error-default mt-1"
              testID="bonus-code-invalid-code"
            >
              {error}
            </Text>
          )}
        </Box>

        {applyBonusCodeError && (
          <Box twClassName="w-full mb-4">
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-error-default"
              testID="bonus-code-apply-error"
            >
              {applyBonusCodeError}
            </Text>
          </Box>
        )}

        <Box twClassName="w-full">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleSubmit}
            isDisabled={isSubmitDisabled}
            isLoading={isApplyingBonusCode}
            twClassName="w-full"
            testID="bonus-code-submit-button"
          >
            {ctaLabel}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default BonusCodeBottomSheet;
