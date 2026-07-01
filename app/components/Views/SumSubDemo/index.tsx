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
import useSumSubDemo from './useSumSubDemo';

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

const SumSubDemo = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { sdkResult, isLoading, status, launchSumSubSDK } = useSumSubDemo();

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
          SumSub Demo
        </Text>
      </View>

      <View style={styles.content}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          Launch the SumSub identity verification flow. This will create a UKYC
          session and retrieve an access token to start the SumSub verification.
        </Text>

        {status && (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {status}
          </Text>
        )}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={launchSumSubSDK}
          isDisabled={isLoading}
        >
          {isLoading ? 'Launching...' : 'Start SumSub Verification'}
        </Button>

        {sdkResult && (
          <View
            style={[
              styles.statusContainer,
              { backgroundColor: colors.background.alternative },
            ]}
          >
            <Text variant={TextVariant.BodySm} style={styles.bold}>SDK Result</Text>
            {Object.entries(sdkResult).map(([key, value]) => (
              <View key={key} style={styles.statusRow}>
                <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
                  {key}
                </Text>
                <Text variant={TextVariant.BodySm}>{String(value)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default SumSubDemo;
