import React, { FunctionComponent } from 'react';
import { ActivityIndicator } from 'react-native';
import { useTheme } from '../../../util/theme';

export const SnapUISpinner: FunctionComponent = () => {
  const theme = useTheme();

  return (
    <ActivityIndicator
      size="large"
      color={theme.colors.primary.default}
      /* eslint-disable-next-line react-native/no-inline-styles */
      style={{ alignItems: 'flex-start' }}
    />
  );
};
