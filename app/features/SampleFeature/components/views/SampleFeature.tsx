import React from 'react';

import {strings} from '../../../../../locales/i18n';
import Text, {TextColor, TextVariant} from '../../../../component-library/components/Texts/Text';
import {SampleCounterPane} from './SampleCounterPane/SampleCounterPane';
import {SampleNetworkDisplay} from './SampleNetworkDisplay/SampleNetworkDisplay';
import {SamplePetNames} from './SamplePetNames/SamplePetNames';
import useSampleNetwork from '../hooks/useSampleNetwork/useSampleNetwork';
import {useStyles} from '../../../../component-library/hooks';
import styleSheet from './SampleFeature.styles';
import {baseStyles} from '../../../../styles/common';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

/**
 * Main view for app Sample Feature
 *
 * @sampleFeature do not use in production code
 */
const SampleFeature = () => {

    const {styles} = useStyles(styleSheet, {});
    const {networkName, networkImageSource} = useSampleNetwork();

    return (
        <KeyboardAwareScrollView
            style={[baseStyles.flexGrow, styles.wrapper]}
            resetScrollToCoords={{ x: 0, y: 0 }}
            keyboardShouldPersistTaps={'always'}
        >
            <Text
                color={TextColor.Default}
                variant={TextVariant.HeadingLG}
                style={styles.heading}
            >
                {strings('sample_feature.title')}
            </Text>
            <Text
                color={TextColor.Alternative}
                variant={TextVariant.BodyMD}
                style={styles.desc}
            >
                {strings('sample_feature.description')}
            </Text>
            <SampleNetworkDisplay
                name={networkName}
                imageSource={networkImageSource}
            />
            <SampleCounterPane/>
            <SamplePetNames/>
        </KeyboardAwareScrollView>
    );
};

export default SampleFeature;
