import React, { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  ButtonSemantic,
  ButtonSemanticSeverity,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getMfaErrorCode } from '@metamask/profile-sync-controller/sdk';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { useMfa } from '../../../../../util/identity/mfa';
import { selectKycSessionStatus } from '../../../../../selectors/kycController';
import { selectMoneyMovementNeobank } from '../../../../../selectors/featureFlagController/moneyAccount';
import { SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON } from '../SecuritySettings.constants';

/**
 * Security settings section that deletes the encrypted identity data MetaMask
 * stores. Hidden until the customer has started verification, since there is
 * nothing to delete otherwise.
 */
const DeleteIdentityData = () => {
  const { isEnabled: isNeobankEnabled } = useSelector(
    selectMoneyMovementNeobank,
  );
  const kycSessionStatus = useSelector(selectKycSessionStatus);
  const [isDeleting, setIsDeleting] = useState(false);
  const { verifyOrEnroll } = useMfa();

  const deleteIdentityData = useCallback(async () => {
    setIsDeleting(true);
    try {
      const result = await verifyOrEnroll({
        methods: ['email_otp'],
        verifyWith: 'email_otp',
        reason: { operation: 'ukyc.deleteData' },
      });
      const aal2Token = result.token?.accessToken;
      if (!aal2Token) {
        throw new Error('DeleteIdentityData: MFA returned no AAL2 token');
      }

      await Engine.context.KycController.deleteEncryptedStorage({ aal2Token });
      Alert.alert(
        strings('identity_verification.delete_success_title'),
        strings('identity_verification.delete_success_message'),
      );
    } catch (error) {
      if (getMfaErrorCode(error) === 'flow_cancelled') {
        return;
      }

      Logger.error(
        error as Error,
        'DeleteIdentityData: failed to delete identity data',
      );
      Alert.alert(
        strings('identity_verification.delete_error_title'),
        strings('identity_verification.delete_error_message'),
      );
    } finally {
      setIsDeleting(false);
    }
  }, [verifyOrEnroll]);

  const handleDeletePress = useCallback(() => {
    Alert.alert(
      strings('identity_verification.delete_confirm_title'),
      strings('identity_verification.delete_confirm_message'),
      [
        { text: strings('navigation.cancel'), style: 'cancel' },
        {
          text: strings('identity_verification.delete_identity_data'),
          style: 'destructive',
          onPress: deleteIdentityData,
        },
      ],
    );
  }, [deleteIdentityData]);

  if (!isNeobankEnabled || !kycSessionStatus) {
    return null;
  }

  return (
    <Box twClassName="mt-6">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {strings('identity_verification.delete_section_title')}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        twClassName="mt-2"
      >
        {strings('identity_verification.delete_section_description')}
      </Text>
      <Box twClassName="mt-4">
        <ButtonSemantic
          severity={ButtonSemanticSeverity.Danger}
          twClassName="w-full"
          onPress={handleDeletePress}
          isLoading={isDeleting}
          isDisabled={isDeleting}
          testID={SECURITY_SETTINGS_DELETE_IDENTITY_DATA_BUTTON}
        >
          {strings('identity_verification.delete_identity_data')}
        </ButtonSemantic>
      </Box>
    </Box>
  );
};

export default DeleteIdentityData;
