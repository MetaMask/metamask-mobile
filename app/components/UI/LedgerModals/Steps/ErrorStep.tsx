import React, { useMemo } from 'react';
import { Image, StyleSheet, View, Linking } from 'react-native';
import StyledButton from '../../StyledButton';
import Text from '../../../Base/Text';
import { strings } from '../../../../../locales/i18n';
import { useAssetFromTheme } from '../../../../util/theme';
import Device from '../../../../util/device';

import ledgerConnectErrorDarkImage from '../../../../images/ledger-connect-error-dark.png';
import ledgerConnectErrorLightImage from '../../../../images/ledger-connect-error-light.png';
import { ERROR_STEP, RETRY_BUTTON } from './Steps.constants';

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
  isRetryHide?: boolean;
}

const ErrorStep = ({
  onReject,
  onRetry,
  title,
  subTitle,
  showViewSettings = false,
  isRetryHide,
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
      <View style={styles.textContainer} testID={ERROR_STEP}>
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
        {!isRetryHide && (
          <View style={styles.buttonStyle}>
            <StyledButton type="normal" onPress={onRetry} testID={RETRY_BUTTON}>
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
