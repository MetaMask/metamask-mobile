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
import Engine from '../../../../../core/Engine';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { useImmersveFunding } from '../../hooks/useImmersveFunding';
import { useFundingAccountName } from '../../hooks/useFundingAccountName';
import { UserCancelledError } from '../../hooks/useCardDelegation';
import {
  CardActions,
  CardEntryPoint,
  withCardProvider,
} from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { ImmersveRevokeAllowanceSheetTestIds } from './ImmersveRevokeAllowanceSheet.testIds';

export interface ImmersveRevokeAllowanceSheetRouteParams {
  entrypoint?: CardEntryPoint | string;
}

const ImmersveRevokeAllowanceSheet = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const theme = useTheme();
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { revokeFunding } = useImmersveFunding();
  const fundingAccountName = useFundingAccountName();
  const routeParams = route.params as
    | ImmersveRevokeAllowanceSheetRouteParams
    | undefined;
  const entrypoint =
    routeParams?.entrypoint ?? CardEntryPoint.CARD_HOME_REVOKE_ALLOWANCE;

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const showPendingToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        {
          label: strings('card.revoke_allowance_sheet.pending_title', {
            accountName: fundingAccountName,
          }),
        },
      ],
      iconName: IconName.Loading,
      hasNoTimeout: true,
      startAccessory: (
        <Spinner
          color={IconColor.IconDefault}
          spinnerIconProps={{ size: IconSize.Lg }}
        />
      ),
    });
  }, [fundingAccountName, toastRef]);

  const showSuccessToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        {
          label: strings('card.revoke_allowance_sheet.success_title', {
            accountName: fundingAccountName,
          }),
        },
      ],
      iconName: IconName.Confirmation,
      iconColor: theme.colors.success.default,
      hasNoTimeout: false,
      startAccessory: (
        <Icon
          name={IconName.Confirmation}
          color={IconColor.SuccessDefault}
          size={IconSize.Lg}
        />
      ),
    });
  }, [fundingAccountName, theme.colors.success.default, toastRef]);

  const showErrorToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      labelOptions: [
        {
          label: strings('card.revoke_allowance_sheet.error'),
        },
      ],
      iconName: IconName.Error,
      iconColor: theme.colors.error.default,
      hasNoTimeout: false,
      startAccessory: (
        <Icon
          name={IconName.Error}
          color={IconColor.ErrorDefault}
          size={IconSize.Lg}
        />
      ),
    });
  }, [theme.colors.error.default, toastRef]);

  const handleRevoke = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties(
          withCardProvider(CardProviderIds.Immersve, {
            action: CardActions.REVOKE_ALLOWANCE_CONFIRM,
            entrypoint,
          }),
        )
        .build(),
    );

    // Close first so the approve confirmation is not stacked behind the sheet.
    sheetRef.current?.onCloseBottomSheet(() => {
      showPendingToast();
      revokeFunding()
        .then(() => {
          showSuccessToast();
          Engine.context.CardController.fetchCardHomeData({
            force: true,
          }).catch(() => undefined);
        })
        .catch((error: unknown) => {
          if (error instanceof UserCancelledError) {
            // Nothing to report, but the pending toast has no timeout — it
            // would otherwise stay on screen forever.
            toastRef?.current?.closeToast();
            return;
          }
          showErrorToast();
        });
    });
  }, [
    trackEvent,
    createEventBuilder,
    entrypoint,
    revokeFunding,
    showPendingToast,
    showSuccessToast,
    showErrorToast,
    toastRef,
  ]);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      testID={ImmersveRevokeAllowanceSheetTestIds.CONTAINER}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: ImmersveRevokeAllowanceSheetTestIds.CLOSE_BUTTON,
        }}
      >
        <Text
          variant={TextVariant.HeadingSm}
          numberOfLines={1}
          testID={ImmersveRevokeAllowanceSheetTestIds.TITLE}
        >
          {strings('card.revoke_allowance_sheet.title')}
        </Text>
      </BottomSheetHeader>
      <Box twClassName="px-4">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          twClassName="text-alternative pb-4"
          testID={ImmersveRevokeAllowanceSheetTestIds.DESCRIPTION}
        >
          {strings('card.revoke_allowance_sheet.description')}
        </Text>
        <Box twClassName="gap-4 pt-4">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={handleClose}
            isFullWidth
            testID={ImmersveRevokeAllowanceSheetTestIds.KEEP_BUTTON}
          >
            {strings('money.metamask_card.unlink_card_sheet_keep_linked')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleRevoke}
            isFullWidth
            testID={ImmersveRevokeAllowanceSheetTestIds.REVOKE_BUTTON}
          >
            {strings('card.revoke_allowance_sheet.unlink_button')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default ImmersveRevokeAllowanceSheet;
