import React from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import Device from '../../../util/device';
import ScreenView from '../../Base/ScreenView';
import { useTheme } from '../../../util/theme';
import Text from '../../../component-library/components/Texts/Text';

const createStyles = (colors) =>
  StyleSheet.create({
    container: { backgroundColor: colors.background.default },
    screen: {
      flexGrow: 1,
      justifyContent: 'space-between',
      backgroundColor: colors.background.default,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    accountSelector: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 16,
    },
    keypad: {
      flexGrow: 1,
      justifyContent: 'space-around',
    },
    tokenButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      margin: Device.isIphone5() ? 5 : 10,
    },
    amountContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 25,
    },
    amount: {
      textAlignVertical: 'center',
      fontSize: Device.isIphone5() ? 30 : 40,
      height: Device.isIphone5() ? 40 : 50,
    },
    amountInvalid: {
      color: colors.error.default,
    },
    verifyToken: {
      marginHorizontal: 40,
    },
    tokenAlert: {
      marginTop: 10,
      marginHorizontal: 30,
    },
    linkText: {
      color: colors.primary.default,
    },
    horizontalRuleContainer: {
      flexDirection: 'row',
      paddingHorizontal: 30,
      marginVertical: Device.isIphone5() ? 5 : 10,
      alignItems: 'center',
    },
    horizontalRule: {
      flex: 1,
      borderBottomWidth: StyleSheet.hairlineWidth,
      height: 1,
      borderBottomColor: colors.border.muted,
    },
    arrowDown: {
      color: colors.primary.default,
      fontSize: 25,
      marginHorizontal: 15,
    },
    buttonsContainer: {
      marginTop: Device.isIphone5() ? 10 : 30,
      marginBottom: 5,
      paddingHorizontal: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    column: {
      flex: 1,
    },
    ctaContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    cta: {
      paddingHorizontal: Device.isIphone5() ? 10 : 20,
    },
    disabled: {
      opacity: 0.4,
    },
  });

const BridgeView = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <ScreenView
      style={styles.container}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <Text>Bridge</Text>
      </View>
    </ScreenView>
  );
}

export default BridgeView;
