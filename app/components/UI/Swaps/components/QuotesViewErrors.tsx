import React from 'react';
import { swapsUtils } from '@metamask/swaps-controller';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getErrorMessage,
} from '../utils';
import { ThemeColors } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    errorIcon: {
      fontSize: 46,
      marginVertical: 4,
      color: colors.error.default,
    },
    expiredIcon: {
      color: colors.icon.default,
    },
  });

export const ErrorIcon = ({ errorKey }: { errorKey: string }) => {
  const {colors} = useTheme();
  const styles = createStyles(colors);

  return errorKey === swapsUtils.SwapsError.QUOTES_EXPIRED_ERROR ? (
    <MaterialCommunityIcons
      name="clock-outline"
      style={[styles.errorIcon, styles.expiredIcon]}
      testID="clock-outline"
    />
  ) : (
    <MaterialCommunityIcons
      name="alert-outline"
      style={[styles.errorIcon]}
      testID="alert-outline"
    />
  );
};


export const getErrorItems = (isInPolling: boolean, errorKey: string) => {
  let errorIcon;
  let errorTitle;
  let errorMessage;
  let errorAction;
  if (!isInPolling && errorKey) {
    [errorTitle, errorMessage, errorAction] = getErrorMessage(errorKey);
    errorIcon = <ErrorIcon errorKey={errorKey} />;
  }
  return { errorIcon, errorTitle, errorMessage, errorAction };
};
