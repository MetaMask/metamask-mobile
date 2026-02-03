import React, { useCallback, useState, useRef, useEffect } from 'react';
import { View, SafeAreaView, ScrollView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Clipboard from '@react-native-clipboard/clipboard';
import { captureException } from '@sentry/react-native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';

import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { useStyles } from '../../../component-library/hooks/useStyles';
import AppConstants from '../../../core/AppConstants';
import styleSheet from './SRPErrorScreen.styles';

interface SRPErrorScreenProps {
  error: Error;
}

const SRPErrorScreen = ({ error }: SRPErrorScreenProps) => {
  const navigation = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    },
    [],
  );

  const errorReport = `View: ChoosePassword\nError: ${error?.name || 'Unknown'}\n${error?.message || 'No message'}`;

  const handleTryAgain = useCallback(() => {
    navigation.reset({
      routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
    });
  }, [navigation]);

  const handleSendErrorReport = useCallback(() => {
    captureException(error, {
      tags: {
        view: 'WalletCreationError',
        context: 'User manually sent error report - SRP flow',
      },
    });

    navigation.reset({
      routes: [
        {
          name: Routes.ONBOARDING.ROOT_NAV,
          params: {
            screen: Routes.ONBOARDING.NAV,
            params: {
              screen: Routes.ONBOARDING.ONBOARDING,
              params: { showErrorReportSentToast: true },
            },
          },
        },
      ],
    });
  }, [navigation, error]);

  const handleCopyError = useCallback(() => {
    Clipboard.setString(errorReport);
    setCopied(true);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [errorReport]);

  const handleContactSupport = useCallback(() => {
    Linking.openURL(AppConstants.REVIEW_PROMPT.SUPPORT);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Icon
            name={IconName.Danger}
            size={IconSize.Xl}
            color={IconColor.Error}
            style={styles.warningIcon}
          />

          <Text variant={TextVariant.HeadingMD} style={styles.title}>
            {strings('wallet_creation_error.title')}
          </Text>

          <View style={styles.infoBanner}>
            <Icon
              name={IconName.Info}
              size={IconSize.Sm}
              color={IconColor.Info}
              style={styles.infoBannerIcon}
            />
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              style={styles.infoBannerText}
            >
              {strings('wallet_creation_error.srp_description_part1')}{' '}
              <Text
                variant={TextVariant.BodySM}
                color={TextColor.Primary}
                onPress={handleContactSupport}
              >
                {strings('wallet_creation_error.metamask_support')}
              </Text>
              {'.'}
            </Text>
          </View>

          <View style={styles.errorReportContainer}>
            <View style={styles.errorReportHeader}>
              <Text variant={TextVariant.BodyMDMedium}>
                {strings('wallet_creation_error.error_report')}
              </Text>
              <Button
                variant={ButtonVariants.Link}
                size={ButtonSize.Sm}
                label={
                  copied
                    ? strings('wallet_creation_error.copied')
                    : strings('wallet_creation_error.copy')
                }
                onPress={handleCopyError}
                startIconName={copied ? IconName.Check : IconName.Copy}
              />
            </View>
            <ScrollView
              style={styles.errorReportContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              <Text variant={TextVariant.BodySM} color={TextColor.Error}>
                {errorReport}
              </Text>
            </ScrollView>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('wallet_creation_error.send_error_report')}
            onPress={handleSendErrorReport}
            style={styles.button}
          />

          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('wallet_creation_error.try_again')}
            onPress={handleTryAgain}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SRPErrorScreen;
