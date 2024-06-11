import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  Encryptor,
  ENCRYPTION_LIBRARY,
  DERIVATION_OPTIONS_DEFAULT_OWASP2023,
} from '../../../core/Encryptor';
import { useTheme } from '../../../util/theme';

import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { strings } from '../../../../locales/i18n';

import TestForm from './Form';
import createStyles from './styles';
import {
  aesCryptoFormInputs,
  aesCryptoFormResponses,
  aesCryptoFormButtons,
  aesCryptoFormScrollIdentifier,
} from '../../../../e2e/selectors/AesCrypto.selectors';

const AesCryptoTestForm = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  const [encryptor, setEncryptor] = useState<Encryptor | undefined>();

  const [passwordEncryptedData, setPasswordEncryptedData] =
    useState<string>('');
  const [keyEncryptedData, setKeyEncryptedData] = useState<any>();

  useEffect(() => {
    const encryptorInstance = new Encryptor({
      keyDerivationOptions: DERIVATION_OPTIONS_DEFAULT_OWASP2023,
    });
    setEncryptor(encryptorInstance);
  }, []);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.aes_crypto_test_form_title'),
        navigation,
        false,
        colors,
        null,
      ),
    );
  }, [colors, navigation]);

  const generateSalt = useCallback(
    async (args: any[]) => await encryptor?.generateSalt(args[0]),
    [encryptor],
  );

  const generateEncryptionKey = useCallback(
    async (args: any[]) => {
      const response = await encryptor?.keyFromPassword(args[0], args[1]);
      return response?.key;
    },
    [encryptor],
  );

  const encrypt = useCallback(
    async (args: any[]) => {
      const response = await encryptor?.encrypt(args[1], args[0]);
      if (!response) {
        throw new Error('Encryption failed');
      }

      setPasswordEncryptedData(response);
      return JSON.parse(response).cipher;
    },
    [encryptor],
  );

  const decrypt = useCallback(
    async (args: any[]) => {
      const response = await encryptor?.decrypt(args[0], passwordEncryptedData);
      return response;
    },
    [encryptor, passwordEncryptedData],
  );

  const encryptWithKey = useCallback(
    async (args: any[]) => {
      const response = await encryptor?.encryptWithKey(
        {
          key: args[0],
          lib: ENCRYPTION_LIBRARY.original,
          exportable: false,
          keyMetadata: DERIVATION_OPTIONS_DEFAULT_OWASP2023,
        },
        args[1],
      );
      setKeyEncryptedData(response);
      return response?.cipher;
    },
    [encryptor],
  );

  const decryptWithKey = useCallback(
    async (args: any[]) => {
      const response = await encryptor?.decryptWithKey(
        {
          key: args[0],
          lib: ENCRYPTION_LIBRARY.original,
          exportable: false,
          keyMetadata: DERIVATION_OPTIONS_DEFAULT_OWASP2023,
        },
        keyEncryptedData,
      );
      return response;
    },
    [encryptor, keyEncryptedData],
  );

  return (
    <ScrollView testID={aesCryptoFormScrollIdentifier}>
      <SafeAreaView style={styles.container}>
        <TestForm
          title="Generate salt"
          buttonLabel="Generate"
          textFields={[
            {
              placeholder: 'Salt bytes count',
              testId: aesCryptoFormInputs.saltBytesCountInput,
            },
          ]}
          callback={generateSalt}
          callbackTestId={aesCryptoFormButtons.generateSaltButton}
          responseTestId={aesCryptoFormResponses.saltResponse}
          styles={{ ...styles }}
        />
        <TestForm
          title="Generate encryption key from password"
          buttonLabel="Generate"
          textFields={[
            {
              placeholder: 'Password',
              testId: aesCryptoFormInputs.passwordInput,
            },
            {
              placeholder: 'Salt',
              testId: aesCryptoFormInputs.saltInputForEncryptionKey,
            },
          ]}
          callback={generateEncryptionKey}
          callbackTestId={aesCryptoFormButtons.generateEncryptionKeyButton}
          responseTestId={aesCryptoFormResponses.generateEncryptionKeyResponse}
          styles={{ ...styles }}
        />
        <TestForm
          title="Encrypt with key"
          buttonLabel="Encrypt"
          textFields={[
            {
              placeholder: 'Encryption Key',
              testId:
                aesCryptoFormInputs.encryptionKeyInputForEncryptionWithKey,
            },
            {
              placeholder: 'Data',
              testId: aesCryptoFormInputs.dataInputForEncryptionWithKey,
            },
          ]}
          callback={encryptWithKey}
          callbackTestId={aesCryptoFormButtons.encryptWithKeyButton}
          responseTestId={aesCryptoFormResponses.encryptionWithKeyResponse}
          styles={{ ...styles }}
        />
        <TestForm
          title="Decrypt with key"
          buttonLabel="Decrypt"
          textFields={[
            {
              placeholder: 'Encryption Key',
              testId:
                aesCryptoFormInputs.encryptionKeyInputForDecryptionWithKey,
            },
          ]}
          callback={decryptWithKey}
          callbackTestId={aesCryptoFormButtons.decryptWithKeyButton}
          responseTestId={aesCryptoFormResponses.decryptionWithKeyResponse}
          styles={{ ...styles }}
        />
        <TestForm
          title="Encrypt"
          buttonLabel="Encrypt"
          textFields={[
            {
              placeholder: 'Data',
              testId: aesCryptoFormInputs.dataInputForEncryption,
            },
            {
              placeholder: 'Password',
              testId: aesCryptoFormInputs.passwordInputForEncryption,
            },
          ]}
          callback={encrypt}
          callbackTestId={aesCryptoFormButtons.encryptButton}
          responseTestId={aesCryptoFormResponses.encryptionResponse}
          styles={{ ...styles }}
        />
        <TestForm
          title="Decrypt"
          buttonLabel="Decrypt"
          textFields={[
            {
              placeholder: 'Password',
              testId: aesCryptoFormInputs.passwordInputForDecryption,
            },
          ]}
          callback={decrypt}
          callbackTestId={aesCryptoFormButtons.decryptButton}
          responseTestId={aesCryptoFormResponses.decryptionResponse}
          styles={{ ...styles }}
        />
      </SafeAreaView>
    </ScrollView>
  );
};

export default AesCryptoTestForm;
