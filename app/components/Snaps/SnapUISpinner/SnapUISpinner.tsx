import React, { FunctionComponent } from 'react';
import { ActivityIndicator } from 'react-native';
import { lightTheme } from '@metamask/design-tokens';

export const SnapUISpinner: FunctionComponent = () => (
  <ActivityIndicator
    size="large"
    color={lightTheme.colors.primary.default}
    /* eslint-disable-next-line react-native/no-inline-styles */
    style={{ alignItems: 'flex-start' }}
  />
);
