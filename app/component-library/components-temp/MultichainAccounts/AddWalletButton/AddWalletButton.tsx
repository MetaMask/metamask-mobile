import React from 'react';
import { ActivityIndicator } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useAccountsOperationsLoadingStates } from '../../../../util/accounts/useAccountsOperationsLoadingStates';

export interface AddWalletButtonProps {
  onPress: () => void;
  testID?: string;
}

const AddWalletButton = ({ onPress, testID }: AddWalletButtonProps) => {
  const { isAccountSyncingInProgress, loadingMessage } =
    useAccountsOperationsLoadingStates();
  const label = isAccountSyncingInProgress
    ? loadingMessage
    : strings('multichain_accounts.add_wallet');

  return (
    <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4 pt-6 pb-5">
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={onPress}
        isDisabled={isAccountSyncingInProgress}
        testID={testID}
        twClassName="flex-1"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          gap={2}
        >
          {isAccountSyncingInProgress ? (
            <ActivityIndicator size="small" />
          ) : null}
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {label}
          </Text>
        </Box>
      </Button>
    </Box>
  );
};

export default AddWalletButton;
