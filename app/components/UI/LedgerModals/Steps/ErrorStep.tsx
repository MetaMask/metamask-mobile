/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
import React, { useMemo } from 'react';
import { Image, StyleSheet, View, Linking } from 'react-native';
import StyledButton from '../../StyledButton';
import Text from '../../../Base/Text';
import { strings } from '../../../../../locales/i18n';
import { useAssetFromTheme } from '../../../../util/theme';
import Device from '../../../../util/device';

const ledgerConnectErrorDarkImage = require('../../../../images/ledger-connect-error-dark.png');
const ledgerConnectErrorLightImage = require('../../../../images/ledger-connect-error-light.png');

const createStyles = () =>
  StyleSheet.create({
    buttonContainer: {
      width: '90%',
      position: 'absolute',
      bottom: 0,
    },
    buttonStyle: {
      marginTop: 10,
    },
    ledgerImageStyle: {
      height: 54,
      overflow: 'visible',
    },
    textContainer: {
      alignItems: 'center',
      marginTop: 20,
    },
    titleText: {
      fontSize: 22,
    },
    subtitleText: {
      marginTop: 20,
      marginHorizontal: 20,
    },
  });

export interface ErrorStepProps {
  onReject: () => void;
  onRetry: () => void;
  title?: string;
  subTitle?: string;
  showViewSettings: boolean;
  isRetry?: boolean;
}

const ErrorStep = ({
  onReject,
  onRetry,
  title,
  subTitle,
  showViewSettings = false,
  isRetry,
}: ErrorStepProps) => {
  const styles = useMemo(() => createStyles(), []);
  const ledgerErrorImage = useAssetFromTheme(
    ledgerConnectErrorLightImage,
    ledgerConnectErrorDarkImage,
  );

  const onViewSettings = async () => {
    Device.isIos()
      ? Linking.openURL('App-Prefs:Bluetooth')
      : Linking.openSettings();
  };

  return (
    <>
      <Image
        source={ledgerErrorImage}
        style={styles.ledgerImageStyle}
        resizeMode="contain"
      />
      <View style={styles.textContainer}>
        <Text big bold style={styles.titleText}>
          {title}
        </Text>
        <Text style={styles.subtitleText}>{subTitle}</Text>
      </View>
      <View style={styles.buttonContainer}>
        {showViewSettings && (
          <View style={styles.buttonStyle}>
            <StyledButton type="confirm" onPress={onViewSettings}>
              {strings('ledger.view_settings')}
            </StyledButton>
          </View>
        )}
        {isRetry && (
          <View style={styles.buttonStyle}>
            <StyledButton type="normal" onPress={onRetry}>
              {strings('ledger.try_again')}
            </StyledButton>
          </View>
        )}
        <View style={styles.buttonStyle}>
          <StyledButton type="cancel" onPress={onReject}>
            {strings('transaction.reject')}
          </StyledButton>
        </View>
      </View>
    </>
  );
};

export default React.memo(ErrorStep);
