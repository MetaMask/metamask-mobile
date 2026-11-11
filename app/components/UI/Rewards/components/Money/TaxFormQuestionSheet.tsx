import React, { useCallback, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { selectSessionProfileId } from '../../../../../selectors/identity';
import { useTaxDocumentation } from '../../hooks/useTaxDocumentation';
import { TAX_FORM_QUESTION_SHEET_TEST_IDS } from './TaxFormQuestionSheet.testIds';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';

export interface TaxFormQuestionSheetParams {
  question: 'attestation' | 'us_activity';
  title: string;
  description: string;
  yesLabel: string;
  noLabel: string;
  profileId: string;
}

const TaxFormQuestionSheet: React.FC = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const params = route.params as TaxFormQuestionSheetParams;
  const sessionProfileId = useSelector(selectSessionProfileId) ?? '';
  const profileId = params.profileId || sessionProfileId;
  const { submitAnswer } = useTaxDocumentation(profileId);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const answer = useCallback(
    (value: boolean) => {
      if (submitting) {
        return;
      }
      setSubmitting(true);
      void submitAnswer(params.question, value).finally(() => {
        setSubmitting(false);
      });
    },
    [params.question, submitAnswer, submitting],
  );

  return (
    <BottomSheet
      goBack={navigation.goBack}
      testID={TAX_FORM_QUESTION_SHEET_TEST_IDS.CONTAINER}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={handleClose}
        testID={TAX_FORM_QUESTION_SHEET_TEST_IDS.TITLE}
      >
        {params.title}
      </BottomSheetHeaderGlass>
      <Box twClassName="gap-4 px-4">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={TAX_FORM_QUESTION_SHEET_TEST_IDS.DESCRIPTION}
        >
          {params.description}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={submitting}
          onPress={() => answer(true)}
          testID={TAX_FORM_QUESTION_SHEET_TEST_IDS.YES}
        >
          {params.yesLabel}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={submitting}
          onPress={() => answer(false)}
          testID={TAX_FORM_QUESTION_SHEET_TEST_IDS.NO}
        >
          {params.noLabel}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default TaxFormQuestionSheet;
