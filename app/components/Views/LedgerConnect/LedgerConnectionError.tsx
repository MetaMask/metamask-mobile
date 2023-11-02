/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  mockTheme,
  useAppThemeFromContext,
  useAssetFromTheme,
} from '../../../util/theme';
import Text from '../../Base/Text';
import { strings } from '../../../../locales/i18n';
import { Colors } from '../../../util/theme/models';
import Device from '../../../util/device';
import StyledButton from '../../UI/StyledButton';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      position: 'absolute',
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      height: '100%',
    },
    contentWrapper: {
      flex: 1,
      alignItems: 'center',
      marginTop: Device.getDeviceHeight() * 0.1,
    },
    errorHasOccuredTextContainer: {
      alignItems: 'center',
      marginTop: Device.getDeviceHeight() * 0.05,
      marginHorizontal: Device.getDeviceWidth() * 0.1,
    },
    errorHasOccuredText: {
      fontSize: 24,
    },
    errorTitle: {
      color: colors.text.muted,
    },
    errorSubtitleContainer: {
      marginTop: Device.getDeviceHeight() * 0.05,
    },
    buttonsContainer: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'flex-end',
      paddingBottom: '5.5%',
    },
    buttonStyle: {
      width: Device.getDeviceWidth() * 0.8,
    },
    closeButton: {
      position: 'absolute',
      top: Device.getDeviceHeight() * 0.05,
      right: 0,
      padding: 20,
    },
  });

const ledgerConnectErrorDarkImage = require('../../../images/ledger-connect-error-dark.png');
const ledgerConnectErrorLightImage = require('../../../images/ledger-connect-error-light.png');

export interface LedgerConnectionErrorProps {
  errorTitle: string;
  errorSubtitle: string;
  primaryButtonConfig?: {
    title: string;
    onPress: () => void;
  };
  secondaryButtonConfig?: {
    title: string;
    onPress: () => void;
  };
}

const LedgerConnectionError = ({
  errorTitle,
  errorSubtitle,
  primaryButtonConfig,
  secondaryButtonConfig,
}: LedgerConnectionErrorProps) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.wrapper}>
      <View style={styles.contentWrapper}>
        <Image
          source={useAssetFromTheme(
            ledgerConnectErrorLightImage,
            ledgerConnectErrorDarkImage,
          )}
          resizeMode="contain"
        />
        <View style={styles.errorHasOccuredTextContainer}>
          <Text bold big style={styles.errorHasOccuredText}>
            {strings('ledger.error_occured')}
          </Text>
          <Text style={styles.errorTitle}>{errorTitle}</Text>
          <View style={styles.errorSubtitleContainer}>
            <Text>{errorSubtitle}</Text>
          </View>
        </View>
        <View style={styles.buttonsContainer}>
          <StyledButton
            onPress={primaryButtonConfig?.onPress}
            type="confirm"
            style={styles.buttonStyle}
          >
            {primaryButtonConfig?.title}
          </StyledButton>
          {secondaryButtonConfig && (
            <StyledButton
              onPress={secondaryButtonConfig?.onPress}
              type="inverse"
              style={styles.buttonStyle}
            >
              {secondaryButtonConfig?.title}
            </StyledButton>
          )}
        </View>
      </View>
    </View>
  );
};

export default React.memo(LedgerConnectionError);
