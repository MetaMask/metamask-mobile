import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  Button,
  ButtonVariant,
  ButtonSize,
  Icon,
  IconName,
  IconSize,
  TextVariant,
  TextColor,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Engine from '../../../core/Engine';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';

export const createTangemSigningModalNavDetails =
  createNavigationDetails<TangemSigningModalParams>(
    Routes.TANGEM_SIGNING_MODAL,
  );

export interface TangemSigningModalParams {
  onConfirmationComplete: (confirmed: boolean) => void;
  transactionId: string;
}

enum SigningState {
  Pending = 'pending',
  Signing = 'signing',
  Success = 'success',
  Error = 'error',
}

const TangemSigningModal = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { transactionId, onConfirmationComplete } =
    useParams<TangemSigningModalParams>();

  const [signingState, setSigningState] = useState<SigningState>(
    SigningState.Pending,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasNavigatedRef = useRef(false);

  const goBack = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const handleSign = useCallback(async () => {
    setSigningState(SigningState.Signing);
    setErrorMessage(null);
    try {
      const { ApprovalController } = Engine.context;
      await ApprovalController.acceptRequest(transactionId, undefined, {
        waitForResult: true,
      });
      setSigningState(SigningState.Success);
      onConfirmationComplete(true);
      goBack();
    } catch (e) {
      setSigningState(SigningState.Error);
      setErrorMessage(
        e instanceof Error ? e.message : 'Signing failed. Please try again.',
      );
    }
  }, [transactionId, onConfirmationComplete, goBack]);

  const handleReject = useCallback(() => {
    try {
      Engine.rejectPendingApproval(
        transactionId,
        new Error('User rejected the transaction'),
      );
    } catch {
      // approval may already be consumed
    }
    onConfirmationComplete(false);
    goBack();
  }, [transactionId, onConfirmationComplete, goBack]);

  useEffect(() => {
    handleSign();
  }, [handleSign]);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <Box
        twClassName="flex-1 px-6"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={6}
      >
        {signingState === SigningState.Signing && (
          <>
            <Box twClassName="w-24 h-24 rounded-full bg-primary-muted items-center justify-center">
              <Icon name={IconName.Scan} size={IconSize.Xl} />
            </Box>
            <Text variant={TextVariant.HeadingMd} twClassName="text-center">
              Tap Your Tangem Card
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.Alternative}
              twClassName="text-center"
            >
              Hold your Tangem card against the back of your phone to sign this
              transaction. Keep the card steady until signing is complete.
            </Text>
          </>
        )}

        {signingState === SigningState.Error && (
          <>
            <Box twClassName="w-24 h-24 rounded-full bg-error-muted items-center justify-center">
              <Icon name={IconName.Danger} size={IconSize.Xl} />
            </Box>
            <Text variant={TextVariant.HeadingMd} twClassName="text-center">
              Signing Failed
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.Alternative}
              twClassName="text-center"
            >
              {errorMessage}
            </Text>
            <Box twClassName="w-full" gap={3}>
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonSize.Lg}
                label="Try Again"
                onPress={handleSign}
                twClassName="w-full"
              />
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Lg}
                label="Cancel"
                onPress={handleReject}
                twClassName="w-full"
              />
            </Box>
          </>
        )}

        {signingState === SigningState.Pending && (
          <>
            <Box twClassName="w-24 h-24 rounded-full bg-muted items-center justify-center">
              <Icon name={IconName.Scan} size={IconSize.Xl} />
            </Box>
            <Text variant={TextVariant.HeadingMd} twClassName="text-center">
              Preparing Transaction
            </Text>
          </>
        )}
      </Box>
    </SafeAreaView>
  );
};

export default React.memo(TangemSigningModal);
