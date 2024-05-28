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

const AesCryptoTestForm = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);

  const [encryptor, setEncryptor] = useState<Encryptor | undefined>();

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

  const keyFromPassword = useCallback(
    async (args: any[]) => {
      const response = await encryptor?.keyFromPassword(args[0], args[1]);
      return response?.key;
    },
    [encryptor],
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
      return JSON.stringify(response);
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
        JSON.parse(args[1]),
      );
      return JSON.stringify(response);
    },
    [encryptor],
  );

  return (
    <ScrollView>
      <SafeAreaView style={styles.container}>
        {encryptor && (
          <>
            <TestForm
              title="Generate salt"
              buttonLabel="Generate"
              textFields={[{ placeholder: 'Salt bytes count' }]}
              callback={encryptor.generateSalt}
              styles={{ ...styles }}
            />
            <TestForm
              title="Generate encryption key from password"
              buttonLabel="Generate"
              textFields={[
                { placeholder: 'Password' },
                { placeholder: 'Salt' },
              ]}
              callback={keyFromPassword}
              styles={{ ...styles }}
            />
            <TestForm
              title="Encrypt"
              buttonLabel="Encrypt"
              textFields={[
                { placeholder: 'Data' },
                { placeholder: 'Encryption key' },
                { placeholder: 'IV' },
              ]}
              callback={encryptor.encrypt}
              styles={{ ...styles }}
            />
            <TestForm
              title="Decrypt"
              buttonLabel="Decrypt"
              textFields={[
                { placeholder: 'Data' },
                { placeholder: 'Encryption key' },
                { placeholder: 'IV' },
              ]}
              callback={encryptor.decrypt}
              styles={{ ...styles }}
            />
            <TestForm
              title="Encrypt with key"
              buttonLabel="Encrypt"
              textFields={[
                { placeholder: 'Encryption Key' },
                { placeholder: 'Data' },
              ]}
              callback={encryptWithKey}
              styles={{ ...styles }}
            />
            <TestForm
              title="Decrypt with key"
              buttonLabel="Decrypt"
              textFields={[
                { placeholder: 'Encryption Key' },
                { placeholder: 'Data' },
              ]}
              callback={decryptWithKey}
              styles={{ ...styles }}
            />
          </>
        )}
      </SafeAreaView>
    </ScrollView>
  );
};

export default AesCryptoTestForm;
