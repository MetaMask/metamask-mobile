import React from 'react';
import {View} from 'react-native';
import Label from '../../../../../component-library/components/Form/Label';
import TextField from '../../../../../component-library/components/Form/TextField';
import Button, {ButtonVariants} from '../../../../../component-library/components/Buttons/Button';
import {useStyles} from '../../../../../component-library/hooks';
import styleSheet from './SamplePetNamesForm.styles';
import {strings} from '../../../../../../locales/i18n';
import {SamplePetNamesFormContentProps} from './SamplePetNamesForm.types';
import {useSamplePetNamesForm} from '../../hooks/useSamplePetNamesForm';

/**
 * Sample PetNamesForm component
 *
 * @sampleFeature do not use in production code
 */
export function SamplePetNamesForm({
    chainId,
    initialAddress,
    initialName
}: SamplePetNamesFormContentProps) {

    const {styles} = useStyles(styleSheet, {});

    const {
        onSubmit,
        isValid,
        name,
        setName,
        setAddress,
        address
    } = useSamplePetNamesForm(chainId, initialAddress, initialName);

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
