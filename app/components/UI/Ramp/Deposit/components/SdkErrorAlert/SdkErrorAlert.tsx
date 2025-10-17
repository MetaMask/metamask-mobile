import React from 'react';
import BannerAlert from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { ButtonVariants } from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';

interface SdkErrorAlertProps {
  error: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  errorType: 'regions' | 'tokens' | 'paymentMethods';
}

const SdkErrorAlert: React.FC<SdkErrorAlertProps> = ({
  error,
  onRetry,
  isRetrying = false,
  errorType,
}) => {
  if (!error) return null;

  const getErrorMessage = () => {
    switch (errorType) {
      case 'regions':
        return strings('deposit.errors.fetch_regions');
      case 'tokens':
        return strings('deposit.errors.fetch_tokens');
      case 'paymentMethods':
        return strings('deposit.errors.fetch_payment_methods');
      default:
        return error;
    }
  };

  return (
    <BannerAlert
      description={
        <Text variant={TextVariant.BodySM}>{getErrorMessage()}</Text>
      }
      severity={BannerAlertSeverity.Error}
      actionButtonProps={
        onRetry
          ? {
              variant: ButtonVariants.Link,
              label: strings('deposit.errors.try_again'),
              labelTextVariant: TextVariant.BodySM,
              onPress: onRetry,
              isDisabled: isRetrying,
              loading: isRetrying,
            }
          : undefined
      }
    />
  );
};

export default SdkErrorAlert;
