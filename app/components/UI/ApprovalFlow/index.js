import React from 'react';
import { StyleSheet, View } from 'react-native';
import Device from '../../../util/device';
import { useTheme } from '../../../util/theme';
import Spinner from '../AnimatedSpinner';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
      minHeight: 100,
    },
    spinnerWrapper: {
      alignItems: 'center',
      marginVertical: 12,
    },
  });

const ApprovalFlow = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.root}>
      <View style={styles.spinnerWrapper}>
        <Spinner />
      </View>
    </View>
  );
};

ApprovalFlow.propTypes = {};

export default ApprovalFlow;
