import React, { useCallback, useState } from 'react';
import { Modal, SafeAreaView, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { selectPendingMpcSigningMfaRequestId } from '../../../selectors/mpcSigningMfaController';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const MpcSigningMfaConfirmation = () => {
  const requestId = useSelector(selectPendingMpcSigningMfaRequestId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const respond = useCallback((accepted: boolean) => {
    setIsSubmitting(true);
    try {
      if (accepted) {
        Engine.context.MpcSigningMfaController.acceptSigningConfirmation();
      } else {
        Engine.context.MpcSigningMfaController.rejectSigningConfirmation();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <Modal
      animationType="slide"
      visible={Boolean(requestId)}
      onRequestClose={() => respond(false)}
    >
      <SafeAreaView style={styles.container}>
        <Box twClassName="flex-1 bg-background-default p-6">
          <Text variant={TextVariant.HeadingMd}>
            {strings('mpc_signing_mfa.title')}
          </Text>
          <Text variant={TextVariant.BodyMd} twClassName="mt-2">
            {strings('mpc_signing_mfa.description')}
          </Text>
          <Box twClassName="mt-auto gap-3">
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isDisabled={isSubmitting}
              onPress={() => respond(true)}
            >
              {strings('mpc_signing_mfa.confirm')}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              isDisabled={isSubmitting}
              onPress={() => respond(false)}
            >
              {strings('mpc_signing_mfa.cancel')}
            </Button>
          </Box>
        </Box>
      </SafeAreaView>
    </Modal>
  );
};

export default MpcSigningMfaConfirmation;
