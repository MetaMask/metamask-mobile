import React, { useMemo } from 'react';
import {
  Image,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { RootStateOrAny, useDispatch, useSelector } from 'react-redux';
import {
  mockTheme,
  useAppThemeFromContext,
  useAssetFromTheme,
} from '../../../util/theme';
import Text from '../../Base/Text';
import { strings } from '../../../../locales/i18n';
import { Colors } from '../../../util/theme/models';
import Device from '../../../util/device';
import StyledButton from '../StyledButton';
import { closeLedgerDeviceErrorModal } from '../../../actions/modals';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      minHeight: Device.getDeviceHeight(),
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

const LedgerErrorModal = () => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dispatch = useDispatch();
  const {
    errorTitle,
    errorSubtitle,
    primaryButtonConfig,
    secondaryButtonConfig,
  } = useSelector(
    (state: RootStateOrAny) => state.modals.ledgerDeviceActionMetadata,
  );

  const onClosePress = () => {
    dispatch(closeLedgerDeviceErrorModal());
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <TouchableOpacity style={styles.closeButton} onPress={onClosePress}>
        <Text bold big>
          X
        </Text>
      </TouchableOpacity>
      <View style={styles.contentWrapper}>
        <Image
          source={useAssetFromTheme(
            ledgerConnectErrorLightImage,
            ledgerConnectErrorDarkImage,
          )}
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
    </SafeAreaView>
  );
};

export default LedgerErrorModal;
