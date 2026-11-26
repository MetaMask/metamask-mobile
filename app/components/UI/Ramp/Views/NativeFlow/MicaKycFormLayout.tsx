/**
 * Shared layout for the MiCA KYC screens (consent, source of income,
 * employment and nationality): header, progress, title, error and
 * missing-fields banners, and the privacy + continue footer.
 */

import React, { useCallback } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Text,
  TextVariant,
  Button,
  ButtonVariant,
  ButtonSize,
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import PoweredByTransak from '../../components/PoweredByTransak';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import DepositProgressBar from '../../components/DepositProgressBar';
import PrivacySection from '../../components/PrivacySection';
import { getKycProgress, type KycStep } from '../../utils/kycProgress';
import styleSheet from './SourceOfIncome.styles';

export interface MicaKycFormMissingFields {
  title: string;
  description: string;
  retryLabel: string;
  retrying: boolean;
  onRetry: () => Promise<void>;
}

export interface MicaKycFormErrorRetry {
  label: string;
  onRetry: () => void;
}

interface MicaKycFormLayoutProps {
  headerTitle: string;
  title: string;
  subtitle: string;
  /** Omit to hide the KYC progress bar. */
  step?: KycStep;
  error: string | null;
  /** Retry action shown on the error banner. */
  errorRetry?: MicaKycFormErrorRetry;
  /** Set when the form options are missing and must be refetched. */
  missingFields?: MicaKycFormMissingFields;
  loading: boolean;
  isSubmitDisabled: boolean;
  onSubmit: () => Promise<void>;
  submitLabel?: string;
  showPrivacyNotice?: boolean;
  children: React.ReactNode;
}

const MicaKycFormLayout = ({
  headerTitle,
  title,
  subtitle,
  step,
  error,
  errorRetry,
  missingFields,
  loading,
  isSubmitDisabled,
  onSubmit,
  submitLabel = strings('deposit.source_of_income.continue_button'),
  showPrivacyNotice = true,
  children,
}: MicaKycFormLayoutProps): React.JSX.Element => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled);
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet, {});

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          title={headerTitle}
          onBack={handleGoBack}
          onClose={handleGoBack}
          backButtonProps={{ testID: 'deposit-back-navbar-button' }}
          closeButtonProps={{ testID: 'deposit-close-navbar-button' }}
          includesTopInset
        />
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          enableAutomaticScroll
          showsVerticalScrollIndicator={false}
        >
          <ScreenLayout.Content>
            {step && <DepositProgressBar {...getKycProgress(step, true)} />}

            <View style={styles.section}>
              <Text variant={TextVariant.HeadingMd} style={styles.title}>
                {title}
              </Text>
              <Text variant={TextVariant.BodyMd} style={styles.subtitle}>
                {subtitle}
              </Text>
            </View>

            {error &&
              (errorRetry ? (
                <BannerAlert
                  severity={BannerAlertSeverity.Danger}
                  title={strings('deposit.mica.errorTitle')}
                  description={error}
                  twClassName="mb-4"
                  actionButtonLabel={errorRetry.label}
                  actionButtonOnPress={errorRetry.onRetry}
                  actionButtonProps={{ isDisabled: loading }}
                />
              ) : (
                <BannerAlert
                  severity={BannerAlertSeverity.Danger}
                  title={strings('deposit.mica.errorTitle')}
                  description={error}
                  twClassName="mb-4"
                />
              ))}

            {missingFields && (
              <BannerAlert
                severity={BannerAlertSeverity.Danger}
                title={missingFields.title}
                description={missingFields.description}
                actionButtonLabel={missingFields.retryLabel}
                actionButtonOnPress={() => {
                  void missingFields.onRetry();
                }}
                actionButtonProps={{ isDisabled: missingFields.retrying }}
                twClassName="mb-4"
              />
            )}

            <View style={styles.fields}>{children}</View>
          </ScreenLayout.Content>
        </KeyboardAwareScrollView>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          {showPrivacyNotice && (
            <PrivacySection>
              <Text variant={TextVariant.BodySm}>
                {strings('deposit.source_of_income.privacy_text')}
              </Text>
            </PrivacySection>
          )}

          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            onPress={() => {
              void onSubmit();
            }}
            isLoading={loading}
            isDisabled={isSubmitDisabled || loading}
            isFullWidth
          >
            {submitLabel}
          </Button>

          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default MicaKycFormLayout;
