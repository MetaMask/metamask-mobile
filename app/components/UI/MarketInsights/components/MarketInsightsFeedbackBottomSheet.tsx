import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, TextInput } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../locales/i18n';
import { MarketInsightsSelectorsIDs } from '../MarketInsights.testIds';

const MAX_FEEDBACK_LENGTH = 255;

export enum MarketInsightsFeedbackReason {
  NotRelevant = 'not_relevant',
  NotAccurate = 'not_accurate',
  HardToUnderstand = 'hard_to_understand',
  HarmfulOrOffensive = 'harmful_or_offensive',
  SomethingElse = 'something_else',
}

interface FeedbackOption {
  reason: MarketInsightsFeedbackReason;
  label: string;
  testID: string;
}

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  {
    reason: MarketInsightsFeedbackReason.NotRelevant,
    label: strings('market_insights.feedback.not_relevant'),
    testID: MarketInsightsSelectorsIDs.FEEDBACK_OPTION_NOT_RELEVANT,
  },
  {
    reason: MarketInsightsFeedbackReason.NotAccurate,
    label: strings('market_insights.feedback.not_accurate'),
    testID: MarketInsightsSelectorsIDs.FEEDBACK_OPTION_NOT_ACCURATE,
  },
  {
    reason: MarketInsightsFeedbackReason.HardToUnderstand,
    label: strings('market_insights.feedback.hard_to_understand'),
    testID: MarketInsightsSelectorsIDs.FEEDBACK_OPTION_HARD_TO_UNDERSTAND,
  },
  {
    reason: MarketInsightsFeedbackReason.HarmfulOrOffensive,
    label: strings('market_insights.feedback.harmful_or_offensive'),
    testID: MarketInsightsSelectorsIDs.FEEDBACK_OPTION_HARMFUL_OR_OFFENSIVE,
  },
  {
    reason: MarketInsightsFeedbackReason.SomethingElse,
    label: strings('market_insights.feedback.something_else'),
    testID: MarketInsightsSelectorsIDs.FEEDBACK_OPTION_SOMETHING_ELSE,
  },
];

export interface MarketInsightsFeedbackSubmitPayload {
  reason: MarketInsightsFeedbackReason;
  feedbackText?: string;
}

interface MarketInsightsFeedbackBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (payload: MarketInsightsFeedbackSubmitPayload) => void;
}

const MarketInsightsFeedbackBottomSheet: React.FC<
  MarketInsightsFeedbackBottomSheetProps
> = ({ isVisible, onClose, onSubmit }) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [selectedReason, setSelectedReason] =
    useState<MarketInsightsFeedbackReason | null>(null);
  const [additionalFeedback, setAdditionalFeedback] = useState('');

  useEffect(() => {
    const sheet = bottomSheetRef.current;
    if (isVisible) {
      sheet?.onOpenBottomSheet();
      return;
    }
    sheet?.onCloseBottomSheet();
    setSelectedReason(null);
    setAdditionalFeedback('');
  }, [isVisible]);

  const isSomethingElse =
    selectedReason === MarketInsightsFeedbackReason.SomethingElse;

  const remainingChars = useMemo(
    () => MAX_FEEDBACK_LENGTH - additionalFeedback.length,
    [additionalFeedback],
  );

  const handleSubmit = useCallback(() => {
    if (!selectedReason) {
      return;
    }

    const trimmedFeedback = additionalFeedback.trim();
    const shouldIncludeFeedbackText =
      selectedReason === MarketInsightsFeedbackReason.SomethingElse &&
      Boolean(trimmedFeedback);

    onSubmit({
      reason: selectedReason,
      ...(shouldIncludeFeedbackText ? { feedbackText: trimmedFeedback } : {}),
    });
  }, [selectedReason, additionalFeedback, onSubmit]);

  const handleReasonPress = useCallback(
    (reason: MarketInsightsFeedbackReason) => {
      setSelectedReason(reason);
      if (reason !== MarketInsightsFeedbackReason.SomethingElse) {
        setAdditionalFeedback('');
      }
    },
    [],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
      style={tw.style('max-h-[700px]')}
      testID={MarketInsightsSelectorsIDs.FEEDBACK_BOTTOM_SHEET}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Medium}>
          {strings('market_insights.feedback.title')}
        </Text>
      </BottomSheetHeader>

      <ScrollView
        style={tw.style('px-4')}
        contentContainerStyle={tw.style('pb-10')}
        showsVerticalScrollIndicator={false}
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          twClassName="mb-4"
        >
          {strings('market_insights.feedback.description')}
        </Text>

        <Box gap={4}>
          {FEEDBACK_OPTIONS.map((option) => {
            const isSelected = option.reason === selectedReason;

            return (
              <Pressable
                key={option.reason}
                onPress={() => handleReasonPress(option.reason)}
                style={({ pressed }) => tw.style(pressed && 'opacity-70')}
                testID={option.testID}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={3}
                  twClassName="py-1"
                >
                  <Box
                    twClassName={`h-6 w-6 rounded-full border ${
                      isSelected ? 'border-primary-default' : 'border-muted'
                    }`}
                    alignItems={BoxAlignItems.Center}
                    justifyContent={BoxJustifyContent.Center}
                  >
                    {isSelected ? (
                      <Box twClassName="h-3 w-3 rounded-full bg-primary-default" />
                    ) : null}
                  </Box>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Regular}
                  >
                    {option.label}
                  </Text>
                </Box>
              </Pressable>
            );
          })}
        </Box>

        {isSomethingElse ? (
          <Box twClassName="mt-5">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              twClassName="mb-2"
            >
              {strings('market_insights.feedback.additional_feedback_label')}
            </Text>
            <TextInput
              value={additionalFeedback}
              onChangeText={setAdditionalFeedback}
              maxLength={MAX_FEEDBACK_LENGTH}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholder={strings(
                'market_insights.feedback.additional_feedback_placeholder',
              )}
              style={tw.style(
                'min-h-[96px] rounded-xl border border-muted bg-muted px-3 py-3 text-default',
              )}
              testID={MarketInsightsSelectorsIDs.FEEDBACK_ADDITIONAL_INPUT}
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextMuted}
              twClassName="mt-2"
            >
              {strings('market_insights.feedback.characters_remaining', {
                count: String(remainingChars),
              })}
            </Text>
          </Box>
        ) : null}

        <Box twClassName="mt-6">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!selectedReason}
            onPress={handleSubmit}
            testID={MarketInsightsSelectorsIDs.FEEDBACK_SUBMIT_BUTTON}
          >
            {strings('market_insights.feedback.submit')}
          </Button>
        </Box>
      </ScrollView>
    </BottomSheet>
  );
};

export default MarketInsightsFeedbackBottomSheet;
