import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import {
  Text,
  TextVariant,
  IconName,
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';

// eslint-disable-next-line import-x/no-restricted-paths
import MoonpayDemo from '../MoonpayDemo/';
// eslint-disable-next-line import-x/no-restricted-paths
import SumSubDemo from '../SumSubDemo/';
// eslint-disable-next-line import-x/no-restricted-paths
import useSumSubDemo from '../SumSubDemo/useSumSubDemo';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    marginLeft: 8,
  },
});

const KYCDemo = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  // Single shared SumSub instance: MoonpayDemo triggers `launchSumSubSDK` once
  // KYC is required, and SumSubDemo renders that same instance's progress.
  const { isLoading, launchSumSubSDK, sdkResult, status } = useSumSubDemo();

  // Switch to the SumSub view as soon as it is launched, and keep it visible
  // through completion (status/result persist after loading finishes).
  const showSumSubDemo = isLoading || status !== null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.default }]}
    >
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={() => navigation.goBack()}
        />
        <Text variant={TextVariant.HeadingSm} style={styles.headerTitle}>
          KYC Demo
        </Text>
      </View>
      {!showSumSubDemo && <MoonpayDemo launchSumSubSDK={launchSumSubSDK} />}
      {showSumSubDemo && <SumSubDemo sdkResult={sdkResult} status={status} />}
    </SafeAreaView>
  );
};

export default KYCDemo;
