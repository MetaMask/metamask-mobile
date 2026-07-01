import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
  IconName,
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';
// eslint-disable-next-line import-x/no-restricted-paths
import MoonpayDemo from '../MoonpayDemo/';
// import useSumSubDemo from '../SumSubDemo/useSumSubDemo';

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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  statusContainer: {
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  bold: {
    fontWeight: 'bold',
  },
});

const KYCDemo = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  // const { sdkResult, isLoading, status, launchSumSubSDK } = useSumSubDemo();

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
      <MoonpayDemo />

    </SafeAreaView>
  );
};

export default KYCDemo;
