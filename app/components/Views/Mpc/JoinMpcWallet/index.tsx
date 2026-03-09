import React, { useCallback, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import Input from '../../../../component-library/components/Form/TextField/foundation/Input';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import { joinMpcWallet } from '../../../../core/Engine/controllers/mpc-controller/mpc';

/**
 * Generate a verifier ID for MPC wallet joining.
 * TODO: Replace with proper passkey implementation for React Native when available.
 */
const generateVerifierId = (): string =>
  // Generate a unique verifier ID for the MPC wallet
  // In the future, this should use proper passkey/WebAuthn APIs for React Native
   `metamask-mpc-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
;

export const JoinMpcWalletPage = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const [joinData, setJoinData] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoinWallet = useCallback(async () => {
    if (!joinData.trim()) {
      return;
    }
    setIsJoining(true);
    setError(null);
    try {
      // TODO: Replace with proper passkey implementation for React Native
      // For now, we generate a verifier ID. In the future, this should use
      // React Native passkey/WebAuthn APIs when available.
      const verifierId = generateVerifierId();

      // Join the wallet
      await joinMpcWallet(verifierId, joinData.trim());

      // Navigate to wallet home
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to join MPC wallet';
      setError(errorMessage);
      Logger.error(err as Error, 'Failed to join MPC wallet');
      setIsJoining(false);
    }
  }, [joinData, navigation]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(Routes.SHEET.ACCOUNT_SELECTOR);
    }
  }, [navigation]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-background-default')}>
      <SheetHeader
        title={strings('multichain_accounts.mpc_wallet.join_mpc_wallet')}
        onBack={handleBack}
      />
      <View style={tw.style('flex-1 px-4 py-6')}>
        <Box
          flexDirection={BoxFlexDirection.Column}
          gap={3}
          twClassName="flex-1"
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {strings(
              'multichain_accounts.mpc_wallet.join_mpc_wallet_description',
            )}
          </Text>

          {error && (
            <Box marginTop={2}>
              <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
                {error}
              </Text>
            </Box>
          )}

          <Box flexDirection={BoxFlexDirection.Column} gap={2}>
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              {strings('multichain_accounts.mpc_wallet.join_data_label')}
            </Text>
            <Input
              placeholder={strings(
                'multichain_accounts.mpc_wallet.enter_join_data',
              )}
              value={joinData}
              onChangeText={setJoinData}
              multiline
              testID="join-data-input"
              style={tw.style('min-h-[100px]')}
            />
            <Button
              variant={ButtonVariant.Primary}
              onPress={handleJoinWallet}
              isDisabled={isJoining || !joinData.trim()}
              style={tw.style('w-full')}
              testID="join-wallet-button"
            >
              {isJoining
                ? strings('multichain_accounts.mpc_wallet.joining_mpc_wallet')
                : strings('multichain_accounts.mpc_wallet.join_mpc_wallet')}
            </Button>
          </Box>
        </Box>
      </View>
    </SafeAreaView>
  );
};
