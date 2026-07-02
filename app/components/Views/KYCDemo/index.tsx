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
  const { isLoading: isLoadingSumSubDemo } = useSumSubDemo();

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
      {!isLoadingSumSubDemo && <MoonpayDemo />}
      {isLoadingSumSubDemo && <SumSubDemo />}
    </SafeAreaView>
  );
};

export default KYCDemo;
