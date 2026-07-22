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
import useKycFlow from '../MoonpayDemo/useKycFlow';
// eslint-disable-next-line import-x/no-restricted-paths
import SumSubDemo from '../SumSubDemo/';

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

// Human-readable label for each SumSub sub-flow status.
const SUMSUB_STATUS_LABEL: Record<string, string> = {
  creatingSession: 'Creating UKYC session...',
  fetchingToken: 'Fetching access token...',
  launching: 'Launching SumSub SDK...',
  inProgress: 'Verification in progress...',
  complete: 'Complete',
  failed: 'Failed',
};

const KYCDemo = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  // Single shared KYC flow bound to the platform-agnostic KycController.
  // MoonpayDemo drives the identity flow and triggers the SumSub hand-off;
  // SumSubDemo renders the sub-flow's progress/result from controller state.
  const flow = useKycFlow();
  const { sumsub } = flow;

  // Switch to the SumSub view as soon as the sub-flow starts, and keep it
  // visible through completion.
  const showSumSubDemo = sumsub.status !== 'idle';

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
      {!showSumSubDemo && <MoonpayDemo flow={flow} />}
      {showSumSubDemo && (
        <SumSubDemo
          sdkResult={sumsub.result as Record<string, unknown> | null}
          status={SUMSUB_STATUS_LABEL[sumsub.status] ?? sumsub.status}
        />
      )}
    </SafeAreaView>
  );
};

export default KYCDemo;
