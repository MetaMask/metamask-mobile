import React from 'react';
import { ActivityIndicator } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';

interface PerpsLoadingSkeletonProps {
  testID?: string;
}

/**
 * PerpsLoadingSkeleton - Loading screen displayed while Perps connection is initializing
 *
 * This component shows a simple loading state with:
 * - A spinner/activity indicator
 * - "Connecting to Perps..." message
 * - "Perps will be available shortly" subtext
 */
const PerpsLoadingSkeleton: React.FC<PerpsLoadingSkeletonProps> = ({
  testID = 'perps-loading-skeleton',
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <Box
      testID={testID}
      twClassName="flex-1 bg-default"
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
    >
      {/* Loading Spinner */}
      <ActivityIndicator
        size="large"
        color={colors.text.alternative}
        style={tw.style('mb-6')}
      />

      {/* Main Text */}
      <Text variant={TextVariant.HeadingMd} twClassName="text-default mb-2">
        {strings('perps.connection.connecting_to_perps')}
      </Text>
    </Box>
  );
};

export default PerpsLoadingSkeleton;
