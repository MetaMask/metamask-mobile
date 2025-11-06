import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { forwardRef, useImperativeHandle } from 'react';
import { Linking } from 'react-native';
import { strings } from '../../../../../../locales/i18n';

// Internal dependencies.
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader/BottomSheetHeader';
import { ButtonVariants } from '../../../../../component-library/components/Buttons/Button/Button.types';
import { usePredictAgreement } from '../../hooks/usePredictAgreement';
import { ButtonsAlignment } from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import {
  usePredictBottomSheet,
  type PredictBottomSheetRef,
} from '../../hooks/usePredictBottomSheet';

interface PredictConsentSheetProps {
  providerId: string;
  onDismiss?: () => void;
  onAgree?: () => void;
}

export type PredictConsentSheetRef = PredictBottomSheetRef;

const PredictConsentSheet = forwardRef<
  PredictConsentSheetRef,
  PredictConsentSheetProps
>(({ providerId, onDismiss, onAgree }, ref) => {
  const tw = useTailwind();
  const { acceptAgreement } = usePredictAgreement({ providerId });
  const { sheetRef, isVisible, closeSheet, handleSheetClosed, getRefHandlers } =
    usePredictBottomSheet({ onDismiss });

  const handleAgree = () => {
    acceptAgreement();
    closeSheet();
    onAgree?.();
  };

  const handleDisagree = () => {
    closeSheet();
  };

  useImperativeHandle(ref, getRefHandlers, [getRefHandlers]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      isInteractable
      onClose={handleSheetClosed}
    >
      <BottomSheetHeader style={tw.style('px-6 py-4')}>
        <Text variant={TextVariant.HeadingMD} style={tw.style('font-bold')}>
          {strings('predict.consent_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <Box twClassName="px-6 pb-6">
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('predict.consent_sheet.description')}{' '}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          style={tw.style('text-info-default')}
          onPress={() => {
            Linking.openURL('https://polymarket.com/tos');
          }}
          suppressHighlighting
        >
          {strings('predict.consent_sheet.learn_more')}
        </Text>
      </Box>
      <BottomSheetFooter
        buttonPropsArray={[
          {
            variant: ButtonVariants.Primary,
            label: strings('predict.consent_sheet.agree'),
            onPress: handleAgree,
          },
          {
            variant: ButtonVariants.Secondary,
            label: strings('predict.consent_sheet.disagree'),
            onPress: handleDisagree,
          },
        ]}
        style={tw.style('px-6')}
        buttonsAlignment={ButtonsAlignment.Vertical}
      />
    </BottomSheet>
  );
});

export default PredictConsentSheet;
