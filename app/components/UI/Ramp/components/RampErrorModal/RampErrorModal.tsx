import React, { useCallback, useRef } from 'react';
import { View, Linking } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';

import styleSheet from './RampErrorModal.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

const SUPPORT_URL = 'https://support.metamask.io';

export type RampErrorType =
  | 'quote_fetch'
  | 'no_quotes'
  | 'widget_url_failed'
  | 'widget_url_missing';

export interface RampErrorModalParams {
  errorType: RampErrorType;
  isCritical: boolean;
  onRetry?: () => void;
}

type RampErrorModalRouteProp = RouteProp<
  { RampErrorModal: RampErrorModalParams },
  'RampErrorModal'
>;

export const createRampErrorModalNavigationDetails =
  createNavigationDetails<RampErrorModalParams>(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.RAMP_ERROR_MODAL,
  );

/**
 * Gets the localized title for the error modal based on error type.
 *
 * @param errorType - The type of error to display
 * @returns The localized error title string
 */
function getErrorTitle(errorType: RampErrorType): string {
  switch (errorType) {
    case 'quote_fetch':
      return strings(
        'fiat_on_ramp_aggregator.ramp_error_modal.quote_fetch_failed_title',
      );
    case 'no_quotes':
      return strings(
        'fiat_on_ramp_aggregator.ramp_error_modal.no_quotes_available_title',
      );
    case 'widget_url_failed':
      return strings(
        'fiat_on_ramp_aggregator.ramp_error_modal.widget_url_failed_title',
      );
    case 'widget_url_missing':
      return strings(
        'fiat_on_ramp_aggregator.ramp_error_modal.widget_url_missing_title',
      );
    default:
      return strings('fiat_on_ramp_aggregator.error');
  }
}

/**
 * Gets the localized description for the error modal based on error type.
 *
 * @param errorType - The type of error to display
 * @returns The localized error description string
 */
function getErrorDescription(errorType: RampErrorType): string {
  switch (errorType) {
    case 'quote_fetch':
      return strings(
        'fiat_on_ramp_aggregator.ramp_error_modal.quote_fetch_failed_description',
      );
    case 'no_quotes':
      return strings(
        'fiat_on_ramp_aggregator.ramp_error_modal.no_quotes_available_description',
      );
    case 'widget_url_failed':
      return strings(
        'fiat_on_ramp_aggregator.ramp_error_modal.widget_url_failed_description',
      );
    case 'widget_url_missing':
      return strings(
        'fiat_on_ramp_aggregator.ramp_error_modal.widget_url_missing_description',
      );
    default:
      return strings('fiat_on_ramp_aggregator.something_went_wrong');
  }
}

function RampErrorModal() {
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});
  const route = useRoute<RampErrorModalRouteProp>();

  const { errorType, isCritical, onRetry } = route.params || {};

  const title = getErrorTitle(errorType);
  const description = getErrorDescription(errorType);

  const navigateToContactSupport = useCallback(() => {
    Linking.openURL(SUPPORT_URL).catch((error: unknown) => {
      console.error('Failed to open support URL:', error);
    });
  }, []);

  const handleRetry = useCallback(() => {
    onRetry?.();
    sheetRef.current?.onCloseBottomSheet();
  }, [onRetry]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack
      isInteractable={false}
      testID="ramp-error-modal"
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: 'ramp-error-modal-close-button' }}
      >
        <Text variant={TextVariant.HeadingMD}>{title}</Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {description}
        </Text>
      </View>

      <View style={styles.footer}>
        {isCritical ? (
          <>
            <Button
              size={ButtonSize.Lg}
              onPress={navigateToContactSupport}
              label={strings(
                'fiat_on_ramp_aggregator.ramp_error_modal.contact_support',
              )}
              variant={ButtonVariants.Secondary}
              width={ButtonWidthTypes.Full}
              testID="ramp-error-modal-contact-support-button"
            />
            <Button
              size={ButtonSize.Lg}
              onPress={handleClose}
              label={strings('fiat_on_ramp_aggregator.ramp_error_modal.got_it')}
              variant={ButtonVariants.Primary}
              width={ButtonWidthTypes.Full}
              testID="ramp-error-modal-got-it-button"
            />
          </>
        ) : (
          <>
            <Button
              size={ButtonSize.Lg}
              onPress={handleRetry}
              label={strings(
                'fiat_on_ramp_aggregator.ramp_error_modal.try_again',
              )}
              variant={ButtonVariants.Primary}
              width={ButtonWidthTypes.Full}
              testID="ramp-error-modal-try-again-button"
            />
            <Button
              size={ButtonSize.Lg}
              onPress={handleClose}
              label={strings('fiat_on_ramp_aggregator.ramp_error_modal.got_it')}
              variant={ButtonVariants.Secondary}
              width={ButtonWidthTypes.Full}
              testID="ramp-error-modal-got-it-button"
            />
          </>
        )}
      </View>
    </BottomSheet>
  );
}

export default RampErrorModal;
