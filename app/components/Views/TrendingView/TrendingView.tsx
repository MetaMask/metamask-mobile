import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';

const TrendingView: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <Box twClassName="flex-1 bg-default" style={{ paddingTop: insets.top }}>
      <Box twClassName="px-4 pt-4">
        <Text variant={TextVariant.HeadingLg} twClassName="text-default">
          {strings('trending.title')}
        </Text>
      </Box>
      <Box twClassName="flex-1 items-center justify-center px-4">
        <Text variant={TextVariant.BodyMd} twClassName="text-muted text-center">
          {strings('trending.coming_soon')}
        </Text>
      </Box>
    </Box>
  );
};

export default TrendingView;
