import React, { useCallback, useRef } from 'react';
import { Linking } from 'react-native';
import {
  Text,
  TextVariant,
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
} from '@metamask/design-system-react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import { RecurringFeeModalSelectors } from '../../../../../../e2e/selectors/Card/RecurringFeeModal.selectors';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';

// TODO: Update this to the actual URL
const LEARN_MORE_URL = 'https://support.metamask.io/metamask-card';

const RecurringFeeModal = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { trackEvent, createEventBuilder } = useMetrics();

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleGotIt = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.RECURRING_FEE_GOT_IT,
          screen: CardScreens.REVIEW_ORDER,
        })
        .build(),
    );
    sheetRef.current?.onCloseBottomSheet();
  }, [trackEvent, createEventBuilder]);

  const handleLearnMore = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.RECURRING_FEE_LEARN_MORE,
          screen: CardScreens.REVIEW_ORDER,
        })
        .build(),
    );
    Linking.openURL(LEARN_MORE_URL);
  }, [trackEvent, createEventBuilder]);

  return (
    <BottomSheet ref={sheetRef} testID={RecurringFeeModalSelectors.CONTAINER}>
      <BottomSheetHeader
        onClose={handleClose}
        testID={RecurringFeeModalSelectors.CLOSE_BUTTON}
      >
        <Text
          variant={TextVariant.HeadingSm}
          testID={RecurringFeeModalSelectors.TITLE}
        >
          {strings('card.recurring_fee_modal.title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-4">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName="text-alternative"
          testID={RecurringFeeModalSelectors.DESCRIPTION}
        >
          {strings('card.recurring_fee_modal.description')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="text-primary-default"
          onPress={handleLearnMore}
          testID={RecurringFeeModalSelectors.LEARN_MORE_LINK}
        >
          {strings('card.recurring_fee_modal.learn_more')}
        </Text>

        <Box twClassName="mt-4">
          <Button
            onPress={handleGotIt}
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            twClassName="w-full"
            testID={RecurringFeeModalSelectors.GOT_IT_BUTTON}
          >
            {strings('card.recurring_fee_modal.got_it')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default RecurringFeeModal;
