import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';
import { useTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      minHeight: Device.isIos() ? '50%' : '60%',
    },
    title: {
      textAlign: 'center',
      fontSize: 18,
      marginVertical: 12,
      marginHorizontal: 20,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    text: {
      ...fontStyles.normal,
      fontSize: 16,
      paddingTop: 25,
      paddingHorizontal: 10,
      color: colors.text.default,
    },
    tokenInformation: {
      flexDirection: 'row',
      marginHorizontal: 40,
      flex: 1,
      alignItems: 'flex-start',
      marginVertical: 30,
    },
    tokenInfo: {
      flex: 1,
      flexDirection: 'column',
    },
    infoTitleWrapper: {
      alignItems: 'center',
    },
    infoTitle: {
      ...fontStyles.bold,
      color: colors.text.default,
    },
    infoBalance: {
      alignItems: 'center',
    },
    infoToken: {
      alignItems: 'center',
    },
    token: {
      flexDirection: 'row',
    },
    identicon: {
      paddingVertical: 10,
    },
    signText: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.text.default,
    },
    addMessage: {
      flexDirection: 'row',
      margin: 20,
    },
    children: {
      alignItems: 'center',
      borderTopColor: colors.border.muted,
      borderTopWidth: 1,
    },
  });

const ApprovalFlow = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.root}>
      <View style={styles.titleWrapper}>
        <Text style={styles.title}>{'LOADING...'}</Text>
      </View>
    </View>
  );
};

ApprovalFlow.propTypes = {};

export default ApprovalFlow;
