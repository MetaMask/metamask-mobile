import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxJustifyContent,
  TextColor,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import { usePerpsConnection } from '../../providers/PerpsConnectionProvider';

interface PerpsLoadingSkeletonProps {
  testID?: string;
}

/**
 * PerpsLoadingSkeleton - Loading screen displayed while Perps connection is initializing
 *
 * This component shows a loading state that transitions after timeout:
 * - Initial: Spinner + "Connecting to Perps..." message
 * - After 10s timeout: Error message + "Retry Connection" button
 */
const PerpsLoadingSkeleton: React.FC<PerpsLoadingSkeletonProps> = ({
  testID = 'perps-loading-skeleton',
}) => {
  const { colors } = useTheme();
  const { reconnectWithNewContext } = usePerpsConnection();
  const [showTimeout, setShowTimeout] = useState(false);

  // Set timeout to show retry option after CONNECTION_TIMEOUT_MS
  // Restarts timer whenever showTimeout becomes false (i.e., when user retries)
  useEffect(() => {
    if (!showTimeout) {
      const timer = setTimeout(() => {
        setShowTimeout(true);
      }, PERPS_CONSTANTS.CONNECTION_TIMEOUT_MS);

      return () => clearTimeout(timer);
    }
  }, [showTimeout]);

  const handleRetry = async () => {
    // Reset timeout state and reconnect with new context
    setShowTimeout(false);

    try {
      await reconnectWithNewContext();
    } catch (error) {
      // Error is handled by connection manager
      // The loading skeleton will either disappear (on success) or timeout will restart
    }
  };

  return (
    <Box
      testID={testID}
      twClassName="flex-1 bg-default pt-20"
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Start}
    >
      {!showTimeout ? (
        <Box alignItems={BoxAlignItems.Center} twClassName="gap-6">
          {/* Loading Spinner */}
          <ActivityIndicator size="large" color={colors.text.alternative} />

          {/* Main Text */}
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('perps.connection.connecting_to_perps')}
          </Text>
        </Box>
      ) : (
        <Box alignItems={BoxAlignItems.Center} twClassName="gap-6">
          {/* Timeout Message */}
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {strings('perps.connection.timeout_title')}
          </Text>
          {/* Retry Button */}
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Md}
            onPress={handleRetry}
            testID={`${testID}-retry-button`}
          >
            {strings('perps.connection.retry_connection')}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default PerpsLoadingSkeleton;
