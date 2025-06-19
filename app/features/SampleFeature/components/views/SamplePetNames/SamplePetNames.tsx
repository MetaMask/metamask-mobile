import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Card from '../../../../../component-library/components/Cards/Card';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './SamplePetNames.styles';
import { strings } from '../../../../../../locales/i18n';
import { SamplePetNamesList } from './SamplePetNamesList';
import { SamplePetNamesForm } from './SamplePetNamesForm';
import useSampleNetwork from '../../hooks/useSampleNetwork/useSampleNetwork';

/**
 * SamplePetNames Component
 *
 * A demonstration component that implements a pet names management system.
 * This component showcases form handling, list management, and keyboard
 * interaction patterns in the MetaMask mobile app.
 *
 * @component
 * @example
 * ```tsx
 * <SamplePetNames />
 * ```
 *
 * @remarks
 * This is a sample feature and should not be used in production code.
 * It demonstrates:
 * - Form handling
 * - List management
 * - Keyboard interaction
 * - State management
 * - Component composition
 * - Internationalization
 *
 * @sampleFeature do not use in production code
 *
 * @returns A view containing a list of pet names and a form to add/edit them
 */
export function SamplePetNames() {
  const { styles } = useStyles(styleSheet, {});
  const { chainId } = useSampleNetwork();

  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedName, setSelectedName] = useState('');

  /**
   * Handles the selection of an account from the list
   * Updates the selected address and name state
   *
   * @param params - The parameters object
   * @param params.address - The selected account address
   * @param params.name - The selected account name
   */
  const onAccountPress = (params: { address: string; name: string }) => {
    setSelectedAddress(params.address);
    setSelectedName(params.name);
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Card style={styles.card}>
          <Text variant={TextVariant.HeadingSM}>
            {strings('sample_feature.pet_name.list_count_text')}
          </Text>
          <SamplePetNamesList
            chainId={chainId}
            onAccountPress={onAccountPress}
          />
          <SamplePetNamesForm
            chainId={chainId}
            initialAddress={selectedAddress}
            initialName={selectedName}
          />
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// useReducer
