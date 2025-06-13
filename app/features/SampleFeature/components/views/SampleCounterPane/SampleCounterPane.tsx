import React from 'react';
import Text, {TextVariant} from '../../../../../component-library/components/Texts/Text';
import Button, {ButtonVariants} from '../../../../../component-library/components/Buttons/Button';
import styleSheet from './SampleCounterPane.styles';
import { useSampleCounter } from '../../hooks/useSampleCounter/useSampleCounter';
import {strings} from '../../../../../../locales/i18n';
import Card from '../../../../../component-library/components/Cards/Card';
import {useStyles} from '../../../../../component-library/hooks';

/**
 * Sample SampleCounterPane component
 *
 * @sampleFeature do not use in production code
 */
export function SampleCounterPane() {

    const {styles} = useStyles(styleSheet, {});

    const counter = useSampleCounter();

    return (
        <Card style={styles.card}>
            <Text
                variant={TextVariant.HeadingSM}
                testID="sample-counter-pane-title"
            >
                {strings('sample_feature.counter.title')}
            </Text>
            <Text testID="sample-counter-pane-value">
                {strings('sample_feature.counter.value', {value: counter.count})}
            </Text>

            <Button
                variant={ButtonVariants.Primary}
                style={styles.button}
                onPress={() => {
                    counter.incrementCount();
                }}
                testID="sample-counter-pane-increment-button"
                label={strings('sample_feature.counter.increment')}
            />
        </Card>
    );
}
