import React from 'react';
import { View } from 'react-native';
import Label from '../../../../../component-library/components/Form/Label';
import TextField from '../../../../../component-library/components/Form/TextField';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './SamplePetNamesForm.styles';
import { strings } from '../../../../../../locales/i18n';
import { SamplePetNamesFormContentProps } from './SamplePetNamesForm.types';
import { useSamplePetNamesForm } from '../../hooks/useSamplePetNamesForm';

/**
 * SamplePetNamesForm Component
 *
 * A demonstration component that implements a form for adding and editing pet names.
 * This component showcases form handling, validation, and custom hook usage
 * in the MetaMask mobile app.
 *
 * @component
 * @example
 * ```tsx
 * <SamplePetNamesForm
 *   chainId="0x1"
 *   initialAddress="0x123..."
 *   initialName="My Pet Name"
 * />
 * ```
 *
 * @remarks
 * This is a sample feature and should not be used in production code.
 * It demonstrates:
 * - Form handling
 * - Input validation
 * - Custom hook usage
 * - Internationalization
 * - Component composition
 *
 * @sampleFeature do not use in production code
 *
 * @param props - The component props
 * @returns A form for adding and editing pet names
 */
export function SamplePetNamesForm({
  chainId,
  initialAddress,
  initialName,
}: SamplePetNamesFormContentProps) {
  const { styles } = useStyles(styleSheet, {});

  const { onSubmit, isValid, name, setName, setAddress, address } =
    useSamplePetNamesForm(chainId, initialAddress, initialName);

  return (
    <View style={styles.formContainer}>
      <View style={styles.inputContainer}>
        <Label>{strings('sample_feature.pet_name.address')}</Label>
        <TextField
          value={address}
          onChangeText={setAddress}
          placeholder={strings('sample_feature.pet_name.address_placeholder')}
          autoCapitalize="none"
          testID="pet-name-address-input"
        />
      </View>

      <View style={styles.inputContainer}>
        <Label>{strings('sample_feature.pet_name.name')}</Label>
        <TextField
          value={name}
          onChangeText={setName}
          placeholder={strings('sample_feature.pet_name.name_placeholder')}
          testID="pet-name-name-input"
        />
      </View>

      <Button
        variant={ButtonVariants.Primary}
        style={styles.button}
        onPress={() => onSubmit()}
        disabled={!isValid}
        testID="add-pet-name-button"
        label={strings('sample_feature.pet_name.add_pet_name_button')}
      />
    </View>
  );
}
