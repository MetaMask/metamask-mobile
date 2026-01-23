import React, { memo } from 'react';
import { ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  selectReferredByCode,
  selectReferralDetailsLoading,
} from '../../../../../reducers/rewards/selectors';
import TextField from '../../../../../component-library/components/Form/TextField';
import { useReferralDetails } from '../../hooks/useReferralDetails';
import { useValidateReferralCode } from '../../hooks/useValidateReferralCode';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useTheme } from '../../../../../util/theme';

const ReferredByCodeSection: React.FC = () => {
  const { colors } = useTheme();
  const referredByCode = useSelector(selectReferredByCode);
  const isLoading = useSelector(selectReferralDetailsLoading);

  // Fetch referral details when component mounts
  useReferralDetails();

  const {
    referralCode: inputCode,
    setReferralCode: setInputCode,
    isValidating,
    isValid,
    isUnknownError,
  } = useValidateReferralCode();

  const hasReferredByCode = Boolean(referredByCode);

  const renderIcon = () => {
    if (hasReferredByCode) {
      return null;
    }

    if (isValidating) {
      return <ActivityIndicator />;
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

    if (inputCode.length >= 6) {
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

  const showError =
    inputCode.length >= 6 && !isValid && !isValidating && !isUnknownError;

  if (isLoading) {
    return (
      <Box
        testID="referred-by-code-section-loading"
        twClassName="gap-4 flex-col py-4 px-4"
      >
        <Box twClassName="gap-2">
          <Skeleton height={20} width={100} />
          <Skeleton height={16} width={250} />
        </Box>
        <Skeleton height={48} width="100%" />
      </Box>
    );
  }

  return (
    <Box
      testID="referred-by-code-section"
      twClassName="gap-4 flex-col py-4 px-4 border-t border-muted"
    >
      <Box twClassName="gap-2">
        <Text variant={TextVariant.HeadingSm}>
          {strings('rewards.referred_by_code.title')}
        </Text>
        <Text variant={TextVariant.BodySm} twClassName="text-alternative">
          {hasReferredByCode
            ? strings('rewards.referred_by_code.description_linked')
            : strings('rewards.referred_by_code.description_not_linked')}
        </Text>
      </Box>

      <Box>
        <TextField
          testID="referred-by-code-input"
          placeholder={strings('rewards.referred_by_code.input_placeholder')}
          value={hasReferredByCode ? (referredByCode ?? '') : inputCode}
          onChangeText={hasReferredByCode ? undefined : setInputCode}
          isDisabled={hasReferredByCode}
          autoCapitalize="characters"
          style={{
            backgroundColor: colors.background.muted,
            borderColor: showError ? colors.error.default : colors.border.muted,
          }}
          endAccessory={renderIcon()}
          isError={showError}
        />
        {showError && (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-error-default mt-1"
          >
            {strings('rewards.referred_by_code.invalid_code')}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default memo(ReferredByCodeSection);
