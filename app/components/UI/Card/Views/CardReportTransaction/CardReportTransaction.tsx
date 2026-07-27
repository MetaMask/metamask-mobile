import React, { useCallback, useContext, useMemo, useState } from 'react';
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
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import type { CardScreensStackParamList } from '../../types/navigation';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import {
  selectCardActiveProviderId,
  selectCardUserLocation,
} from '../../../../../selectors/cardController';
import { useCardHeaderHandlers } from '../../hooks/useCardHeaderHandlers';
import { useCardCapabilities } from '../../hooks/useCardCapabilities';
import useRegistrationSettings from '../../hooks/useRegistrationSettings';
import { CARD_SUPPORT_EMAIL, IMMERSVE_SUPPORT_EMAIL } from '../../constants';
import { getCardSupportEmail } from '../../util/registrationSettings';

type CardReportTransactionRouteProp = RouteProp<
  CardScreensStackParamList,
  'CardReportTransaction'
>;

const CardReportTransaction = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<CardReportTransactionRouteProp>();
  const tw = useTailwind();
  const theme = useTheme();
  const headerHandlers = useCardHeaderHandlers('back');
  const capabilities = useCardCapabilities();
  const { toastRef } = useContext(ToastContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const providerId = useSelector(selectCardActiveProviderId);
  const userLocation = useSelector(selectCardUserLocation);
  const { data: registrationSettings } = useRegistrationSettings();

  const isImmersve = providerId === 'immersve';
  const supportEmail = useMemo(
    () =>
      isImmersve
        ? IMMERSVE_SUPPORT_EMAIL
        : getCardSupportEmail(registrationSettings, userLocation),
    [isImmersve, registrationSettings, userLocation],
  );

  const { transactionId } = route.params;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleFileReport = useCallback(async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (capabilities?.supportsTransactionReporting) {
        await Engine.context.CardController.reportTransaction(transactionId, {
          reason: 'unspecified',
          contactedMerchant: false,
        });
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings('card.transactions.report_file'),
            },
          ],
          iconName: IconName.Confirmation,
          iconColor: theme.colors.success.default,
          hasNoTimeout: false,
        });
        navigation.goBack();
        return;
      }

      const mailto = `mailto:${supportEmail || CARD_SUPPORT_EMAIL}`;
      const canOpen = await Linking.canOpenURL(mailto);
      if (canOpen) {
        await Linking.openURL(mailto);
      } else {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            {
              label: strings('card.transactions.report_file'),
            },
          ],
          iconName: IconName.Info,
          hasNoTimeout: false,
        });
      }
    } catch {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          {
            label: strings('card.transactions.load_error'),
          },
        ],
        iconName: IconName.Warning,
        hasNoTimeout: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    capabilities?.supportsTransactionReporting,
    isSubmitting,
    navigation,
    supportEmail,
    theme.colors.success.default,
    toastRef,
    transactionId,
  ]);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['bottom']}
    >
      <HeaderStandard
        title={strings('card.transactions.report_title')}
        includesTopInset
        twClassName="bg-background-default"
        {...headerHandlers}
      />
      <Box twClassName="flex-1 px-4 pt-4">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('card.transactions.report_body')}
        </Text>
      </Box>
      <Box twClassName="flex-row gap-3 px-4 pb-4">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={handleBack}
          twClassName="flex-1"
        >
          {strings('card.transactions.report_back')}
        </Button>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleFileReport}
          isLoading={isSubmitting}
          twClassName="flex-1"
        >
          {strings('card.transactions.report_file')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default CardReportTransaction;
