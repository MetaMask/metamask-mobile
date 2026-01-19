import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import {
  Encryptor,
  ENCRYPTION_LIBRARY,
  DERIVATION_OPTIONS_DEFAULT_OWASP2023,
} from '../../../core/Encryptor';
import { useTheme } from '../../../util/theme';

import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';
import { strings } from '../../../../locales/i18n';

import TestForm from './Form';
import createStyles from './styles';
import {
  aesCryptoFormInputs,
  aesCryptoFormResponses,
  aesCryptoFormButtons,
  aesCryptoFormScrollIdentifier,
  accountAddress,
  responseText,
} from './AesCrypto.testIds';
import Text, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { useSelector } from 'react-redux';

const AesCryptoTestForm = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  const [encryptor, setEncryptor] = useState<Encryptor | undefined>();

  const [passwordEncryptedData, setPasswordEncryptedData] =
    useState<string>('');
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [keyEncryptedData, setKeyEncryptedData] = useState<any>();

  const selectedFormattedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  useEffect(() => {
    const encryptorInstance = new Encryptor({
      keyDerivationOptions: DERIVATION_OPTIONS_DEFAULT_OWASP2023,
    });
    setEncryptor(encryptorInstance);
  }, []);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const generateSalt = useCallback(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (args: any[]) => await encryptor?.generateSalt(args[0]),
    [encryptor],
  );

  const generateEncryptionKey = useCallback(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (args: any[]) => {
      const response = await encryptor?.keyFromPassword(args[0], args[1]);
      return response?.key;
    },
    [encryptor],
  );

  const encrypt = useCallback(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (args: any[]) => {
      const response = await encryptor?.decrypt(args[0], passwordEncryptedData);
      return response;
    },
    [encryptor, passwordEncryptedData],
  );

  const encryptWithKey = useCallback(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (args: any[]) => {
      const response = await encryptor?.encryptWithKey(
        {
          key: args[0],
          lib: ENCRYPTION_LIBRARY.original,
          exportable: true,
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
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    <>
      <HeaderCenter
        title={strings('app_settings.aes_crypto_test_form_title')}
        onBack={() => navigation.goBack()}
        includesTopInset
      />
      <SafeAreaView edges={{ bottom: 'additive' }} style={styles.container}>
        <ScrollView
        contentContainerStyle={styles.scrollContainer}
        testID={aesCryptoFormScrollIdentifier}
      >
        <Text variant={TextVariant.HeadingSM} style={styles.formTitle}>
          Current selected address
        </Text>
        <Text variant={TextVariant.HeadingSM} testID={accountAddress}>
          {selectedFormattedAddress}
        </Text>
        <TestForm
          title={strings('aes_crypto_test_form.generate_random_salt')}
          buttonLabel={strings('aes_crypto_test_form.generate')}
          textFields={[
            {
              placeholder: strings('aes_crypto_test_form.salt_bytes_count'),
              testId: aesCryptoFormInputs.saltBytesCountInput,
            },
          ]}
          callback={generateSalt}
          callbackTestId={aesCryptoFormButtons.generateSaltButton}
          responseTestId={aesCryptoFormResponses.saltResponse}
          responseTextTestId={responseText}
          styles={{ ...styles }}
        />
        <TestForm
          title={strings('aes_crypto_test_form.generate_encryption_key')}
          buttonLabel={strings('aes_crypto_test_form.generate')}
          textFields={[
            {
              placeholder: strings('aes_crypto_test_form.password'),
              testId: aesCryptoFormInputs.passwordInput,
            },
            {
              placeholder: strings('aes_crypto_test_form.salt'),
              testId: aesCryptoFormInputs.saltInputForEncryptionKey,
            },
          ]}
          callback={generateEncryptionKey}
          callbackTestId={aesCryptoFormButtons.generateEncryptionKeyButton}
          responseTestId={aesCryptoFormResponses.generateEncryptionKeyResponse}
          responseTextTestId={responseText}
          styles={{ ...styles }}
        />
        <TestForm
          title={strings('aes_crypto_test_form.encrypt_with_key')}
          buttonLabel={strings('aes_crypto_test_form.encrypt')}
          textFields={[
            {
              placeholder: strings('aes_crypto_test_form.encryption_key'),
              testId:
                aesCryptoFormInputs.encryptionKeyInputForEncryptionWithKey,
            },
            {
              placeholder: strings('aes_crypto_test_form.data'),
              testId: aesCryptoFormInputs.dataInputForEncryptionWithKey,
            },
          ]}
          callback={encryptWithKey}
          callbackTestId={aesCryptoFormButtons.encryptWithKeyButton}
          responseTestId={aesCryptoFormResponses.encryptionWithKeyResponse}
          responseTextTestId={responseText}
          styles={{ ...styles }}
        />
        <TestForm
          title={strings('aes_crypto_test_form.decrypt_with_key')}
          buttonLabel={strings('aes_crypto_test_form.decrypt')}
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
          responseTextTestId={responseText}
          styles={{ ...styles }}
        />
        <TestForm
          title={strings('aes_crypto_test_form.encrypt')}
          buttonLabel={strings('aes_crypto_test_form.encrypt')}
          textFields={[
            {
              placeholder: strings('aes_crypto_test_form.data'),
              testId: aesCryptoFormInputs.dataInputForEncryption,
            },
            {
              placeholder: strings('aes_crypto_test_form.password'),
              testId: aesCryptoFormInputs.passwordInputForEncryption,
            },
          ]}
          callback={encrypt}
          callbackTestId={aesCryptoFormButtons.encryptButton}
          responseTestId={aesCryptoFormResponses.encryptionResponse}
          responseTextTestId={responseText}
          styles={{ ...styles }}
        />
        <TestForm
          title={strings('aes_crypto_test_form.decrypt')}
          buttonLabel={strings('aes_crypto_test_form.decrypt')}
          textFields={[
            {
              placeholder: strings('aes_crypto_test_form.password'),
              testId: aesCryptoFormInputs.passwordInputForDecryption,
            },
          ]}
          callback={decrypt}
          callbackTestId={aesCryptoFormButtons.decryptButton}
          responseTestId={aesCryptoFormResponses.decryptionResponse}
          responseTextTestId={responseText}
          styles={{ ...styles }}
        />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default AesCryptoTestForm;
