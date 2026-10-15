import React, { useCallback, useContext, useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconSize,
  Spinner,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import useAuthentication from '../../../../../core/Authentication/hooks/useAuthentication';
import { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import useCardReissue from '../../hooks/useCardReissue';
import { withBiometricAuth } from '../../util/withBiometricAuth';
import { CardActions, withCardProvider } from '../../util/metrics';
import {
  CardProviderError,
  CardProviderIds,
} from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { ImmersveReissueCardSheetTestIds } from './ImmersveReissueCardSheet.testIds';

export interface ImmersveReissueCardSheetRouteParams {
  cardId: string;
}

const ImmersveReissueCardSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { reauthenticate } = useAuthentication();
  const cardId = (
    route.params as ImmersveReissueCardSheetRouteParams | undefined
  )?.cardId;
  const reissueCard = useCardReissue(cardId);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const showToast = useCallback(
    (label: string, tone: 'pending' | 'success' | 'error') => {
      const isPending = tone === 'pending';
      const isError = tone === 'error';
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [{ label }],
        iconName: isError
          ? IconName.Error
          : isPending
            ? IconName.Loading
            : IconName.Confirmation,
        iconColor: isError
          ? theme.colors.error.default
          : isPending
            ? undefined
            : theme.colors.success.default,
        hasNoTimeout: isPending,
        startAccessory: isPending ? (
          <Spinner
            color={IconColor.IconDefault}
            spinnerIconProps={{ size: IconSize.Lg }}
          />
        ) : (
          <Icon
            name={isError ? IconName.Error : IconName.Confirmation}
            color={isError ? IconColor.ErrorDefault : IconColor.SuccessDefault}
            size={IconSize.Lg}
          />
        ),
      });
    },
    [theme.colors.error.default, theme.colors.success.default, toastRef],
  );

  const handleConfirm = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.REISSUE_CARD_CONFIRM,
          }),
        )
        .build(),
    );

    await withBiometricAuth({
      reauthenticate,
      navigation,
      toastRef,
      passwordDescription: strings(
        'card.password_bottomsheet.description_reissue_card',
      ),
      onSuccess: () => {
        // The sheet unmounts on close and drops react-query callbacks.
        // Replace the no-timeout spinner from the mutation promise instead.
        sheetRef.current?.onCloseBottomSheet(() => {
          showToast(strings('card.reissue_card_sheet.pending'), 'pending');
          reissueCard
            .mutateAsync()
            .then((result) => {
              showToast(
                strings(
                  result === 'reissued'
                    ? 'card.reissue_card_sheet.success'
                    : 'card.reissue_card_sheet.in_progress',
                ),
                'success',
              );
            })
            .catch((error: unknown) => {
              const notAllowed =
                error instanceof CardProviderError &&
                error.errorCode === 'CARD_REISSUE_NOT_ALLOWED';
              showToast(
                strings(
                  notAllowed
                    ? 'card.reissue_card_sheet.not_allowed'
                    : 'card.reissue_card_sheet.error',
                ),
                'error',
              );
            });
        });
      },
    });
  }, [
    trackEvent,
    createEventBuilder,
    reauthenticate,
    navigation,
    toastRef,
    showToast,
    reissueCard,
  ]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={ImmersveReissueCardSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: ImmersveReissueCardSheetTestIds.CLOSE_BUTTON,
        }}
      >
        <Text
          variant={TextVariant.HeadingSm}
          numberOfLines={1}
          testID={ImmersveReissueCardSheetTestIds.TITLE}
        >
          {strings('card.reissue_card_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <Box twClassName="px-4">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName="text-alternative pb-4"
          testID={ImmersveReissueCardSheetTestIds.DESCRIPTION}
        >
          {strings('card.reissue_card_sheet.description')}
        </Text>
        <Box twClassName="gap-4 pt-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleClose}
            isFullWidth
            testID={ImmersveReissueCardSheetTestIds.KEEP_BUTTON}
          >
            {strings('card.reissue_card_sheet.keep_button')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleConfirm}
            isFullWidth
            testID={ImmersveReissueCardSheetTestIds.CONFIRM_BUTTON}
          >
            {strings('card.reissue_card_sheet.confirm_button')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default ImmersveReissueCardSheet;
