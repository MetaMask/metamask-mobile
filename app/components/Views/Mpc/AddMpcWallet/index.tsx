import React, { useCallback, useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import Logger from '../../../../util/Logger';
import { createMpcKeyring } from '../../../../core/Engine/controllers/mpc-controller/mpc';

/**
 * Generate a verifier ID for MPC wallet creation.
 * TODO: Replace with proper passkey implementation for React Native when available.
 */
const generateVerifierId = (): string =>
  // Generate a unique verifier ID for the MPC wallet
  // In the future, this should use proper passkey/WebAuthn APIs for React Native
   `metamask-mpc-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
;

export const AddMpcWalletPage = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = useCallback(async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with proper passkey implementation for React Native
      // For now, we generate a verifier ID. In the future, this should use
      // React Native passkey/WebAuthn APIs when available.
      const verifierId = generateVerifierId();

      // Create the keyring
      await createMpcKeyring(verifierId);

      // Navigate to wallet home
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });
    } catch (error) {
      Logger.error(error as Error, 'Failed to create MPC wallet');
      // TODO: Show error message to user
    } finally {
      setIsLoading(false);
    }
  }, [navigation]);

  const handleJoin = useCallback(() => {
    navigation.navigate(Routes.MPC_WALLET.JOIN);
  }, [navigation]);

  const handleClose = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
  }, [navigation]);

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
        title={strings('multichain_accounts.mpc_wallet.add_mpc_wallet')}
        onBack={handleBack}
        actionButtonOptions={
          handleClose
            ? {
                label: strings('multichain_accounts.mpc_wallet.close'),
                onPress: handleClose,
              }
            : undefined
        }
      />
      <View style={tw.style('flex-1 px-4 py-6')}>
        <Box marginBottom={4}>
          <Text variant={TextVariant.BodyLg}>
            {strings(
              'multichain_accounts.mpc_wallet.add_mpc_wallet_description',
            )}
          </Text>
        </Box>
        <Button
          variant={ButtonVariant.Primary}
          onPress={handleCreate}
          isDisabled={isLoading}
          style={tw.style('w-full')}
        >
          {strings('multichain_accounts.mpc_wallet.create_mpc_wallet')}
        </Button>
        <Box marginTop={3}>
          <Button
            variant={ButtonVariant.Secondary}
            onPress={handleJoin}
            isDisabled={isLoading}
            style={tw.style('w-full')}
          >
            {strings('multichain_accounts.mpc_wallet.join_mpc_wallet')}
          </Button>
        </Box>
      </View>
    </SafeAreaView>
  );
};
