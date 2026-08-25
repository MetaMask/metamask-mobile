import React, { useCallback, useContext, useMemo } from 'react';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName as LegacyIconName } from '../../../../../component-library/components/Icons/Icon';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import type { CardScreensStackParamList } from '../../types/navigation';
import { strings } from '../../../../../../locales/i18n';
import {
  selectCardActiveProviderId,
  selectCardUserLocation,
} from '../../../../../selectors/cardController';
import { selectCardImmersveConfig } from '../../../../../selectors/featureFlagController/card';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import {
  CARD_SUPPORT_EMAIL,
  DEFAULT_IMMERSVE_REPORT_TRANSACTION_URL,
  IMMERSVE_REPORT_TRANSACTION_ID_PARAM,
} from '../../constants';
import { getCardSupportEmail } from '../../util/registrationSettings';
import { CardActions, withCardProvider } from '../../util/metrics';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';

type CardReportTransactionRouteProp = RouteProp<
  CardScreensStackParamList,
  'CardReportTransaction'
>;

export function buildReportTransactionUrl(
  baseUrl: string,
  transactionId: string,
): string {
  const url = new URL(baseUrl);
  url.searchParams.set(IMMERSVE_REPORT_TRANSACTION_ID_PARAM, transactionId);
  return url.toString();
}

const CardReportTransaction = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<CardReportTransactionRouteProp>();
  const tw = useTailwind();
  const headerHandlers = useCardHeaderHandlers('back');
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const providerId = useSelector(selectCardActiveProviderId);
  const userLocation = useSelector(selectCardUserLocation);
  const immersveConfig = useSelector(selectCardImmersveConfig);
  const { data: registrationSettings } = useRegistrationSettings();

  const isImmersve = providerId === CardProviderIds.Immersve;
  const supportEmail = useMemo(
    () => getCardSupportEmail(registrationSettings, userLocation),
    [registrationSettings, userLocation],
  );

  const { transactionId } = route.params;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleFileReport = useCallback(async () => {
    if (isImmersve) {
      const baseUrl =
        immersveConfig.reportTransactionUrl ||
        DEFAULT_IMMERSVE_REPORT_TRANSACTION_URL;
      const url = buildReportTransactionUrl(baseUrl, transactionId);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
          .addProperties(
            withCardProvider(providerId, {
              action: CardActions.NAVIGATE_TO_REPORT_TRANSACTION_PAGE,
            }),
          )
          .build(),
      );
      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: { url },
      });
      return;
    }

    try {
      await Linking.openURL(`mailto:${supportEmail || CARD_SUPPORT_EMAIL}`);
    } catch {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('card.transactions.report_open_error'),
          },
        ],
        iconName: LegacyIconName.Warning,
        hasNoTimeout: false,
      });
    }
  }, [
    createEventBuilder,
    immersveConfig.reportTransactionUrl,
    isImmersve,
    navigation,
    providerId,
    supportEmail,
    toastRef,
    trackEvent,
    transactionId,
  ]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
    >
      <HeaderStandard
        title=""
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
      />
      <Box twClassName="flex-1 gap-4 px-4 pt-2">
        <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
          {strings('card.transactions.report_title')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('card.transactions.report_body_merchant')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('card.transactions.report_body_continue')}
        </Text>
      </Box>
      <Box twClassName="gap-3 px-4 pb-4 pt-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleFileReport}
          isFullWidth
          testID="card-report-transaction-file-button"
        >
          {strings('card.transactions.report_file')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={handleBack}
          isFullWidth
        >
          {strings('card.transactions.report_back')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default CardReportTransaction;
