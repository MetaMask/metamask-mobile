import React, { useCallback, useEffect, useState } from 'react';
import {
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import type { RootState } from '../../../../../reducers';
import { selectReferralMeLocalizedText } from '../../../../../reducers/rewardsMoney/selectors';
import { selectSessionProfileId } from '../../../../../selectors/identity';
import Routes from '../../../../../constants/navigation/Routes';
import { useTaxDocumentation } from '../../hooks/useTaxDocumentation';
import {
  mintRateLimitRemainingMs,
  readMintRateLimit,
  withMinutes,
} from '../../utils/taxDocumentation';
import { TAX_FORM_OPEN_FORM_SHEET_TEST_IDS } from './TaxFormOpenFormSheet.testIds';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

export interface TaxFormOpenFormSheetParams {
  title: string;
  description: string;
  continueLabel: string;
  notNowLabel: string;
  profileId: string;
  /**
   * Present only when `reason` is `NO_FORM` and `can_change_answer` is true.
   * Absent for every other open-form reason.
   */
  changeAnswerLabel?: string;
  reason: string | null;
}

const TaxFormOpenFormSheet: React.FC = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const params = route.params as TaxFormOpenFormSheetParams;
  const sessionProfileId = useSelector(selectSessionProfileId) ?? '';
  const profileId = params.profileId || sessionProfileId;
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const { mintTaxForm } = useTaxDocumentation(profileId);
  const [submitting, setSubmitting] = useState(false);
  const [limitTick, setLimitTick] = useState(0);
  const rateLimit = readMintRateLimit(profileId);
  const rateLimited = rateLimit !== null;
  const rateLimitMessage =
    rateLimit && localizedText
      ? withMinutes(
          localizedText.taxFormRateLimitedToast,
          rateLimit.retryAfterSeconds,
        )
      : null;

  useEffect(() => {
    const remaining = mintRateLimitRemainingMs(profileId);
    if (remaining <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setLimitTick((tick) => tick + 1);
    }, remaining);
    return () => clearTimeout(timer);
  }, [limitTick, profileId, rateLimited]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleContinue = useCallback(() => {
    if (submitting || mintRateLimitRemainingMs(profileId) > 0) {
      return;
    }
    setSubmitting(true);
    void mintTaxForm()
      .then((outcome) => {
        if (outcome === 'rate_limited') {
          setLimitTick((tick) => tick + 1);
        }
      })
      .finally(() => {
        setSubmitting(false);
      });
  }, [mintTaxForm, profileId, submitting]);

  const handleChangeAnswer = useCallback(() => {
    if (!localizedText) {
      return;
    }
    navigation.dispatch(
      StackActions.replace(Routes.MODAL.REWARDS_TAX_QUESTION_SHEET, {
        question: 'attestation',
        title: localizedText.taxAttestationTitle,
        description: localizedText.taxAttestationDescription,
        yesLabel: localizedText.taxAnswerYes,
        noLabel: localizedText.taxAnswerNo,
        profileId,
      }),
    );
  }, [localizedText, navigation, profileId]);

  return (
    <BottomSheet
      goBack={navigation.goBack}
      testID={TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTAINER}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={handleClose}
        testID={TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.TITLE}
      >
        {params.title}
      </BottomSheetHeaderGlass>
      <Box twClassName="gap-4 px-4">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.DESCRIPTION}
        >
          {params.description}
        </Text>
        <Box twClassName="gap-1">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={submitting || rateLimited}
            isLoading={submitting}
            endIconName={IconName.ArrowSquareOut}
            onPress={handleContinue}
            testID={TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CONTINUE}
          >
            {params.continueLabel}
          </Button>
          {rateLimitMessage ? (
            <Text
              variant={TextVariant.BodySm}
              twClassName="text-error-default"
              testID={TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.RATE_LIMIT}
            >
              {rateLimitMessage}
            </Text>
          ) : null}
        </Box>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={submitting}
          onPress={handleClose}
          testID={TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.NOT_NOW}
        >
          {params.notNowLabel}
        </Button>
        {params.changeAnswerLabel ? (
          <Button
            variant={ButtonVariant.Tertiary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={submitting}
            onPress={handleChangeAnswer}
            testID={TAX_FORM_OPEN_FORM_SHEET_TEST_IDS.CHANGE_ANSWER}
          >
            {params.changeAnswerLabel}
          </Button>
        ) : null}
      </Box>
    </BottomSheet>
  );
};

export default TaxFormOpenFormSheet;
