import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, SafeAreaView} from 'react-native';
import Text, {TextVariant} from '../../../../../component-library/components/Texts/Text';
import Card from '../../../../../component-library/components/Cards/Card';
import {useStyles} from '../../../../../component-library/hooks';
import styleSheet from './SamplePetNames.styles';
import {strings} from '../../../../../../locales/i18n';
import {SamplePetNamesList} from './SamplePetNamesList';
import {SamplePetNamesForm} from './SamplePetNamesForm';
import useSampleNetwork from '../../hooks/useSampleNetwork/useSampleNetwork';

/**
 * Sample PetNames component
 *
 * @sampleFeature do not use in production code
 */
export function SamplePetNames() {
    const {styles} = useStyles(styleSheet, {});
    const {chainId} = useSampleNetwork();

    // TODO - maybe use a reducer here instead of useState
    const [selectedAddress, setSelectedAddress] = useState('');
    const [selectedName, setSelectedName] = useState('');

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
                    <Text variant={TextVariant.HeadingSM}>{strings('sample_feature.pet_name.list_count_text')}</Text>
                    <SamplePetNamesList chainId={chainId} onAccountPress={onAccountPress}/>
                    <SamplePetNamesForm chainId={chainId} initialAddress={selectedAddress} initialName={selectedName}/>
                </Card>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}


// useReducer
