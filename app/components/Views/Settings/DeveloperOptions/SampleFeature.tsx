import React from 'react';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';
import {strings} from '../../../../../locales/i18n';
import Button, {
    ButtonSize,
    ButtonVariants,
    ButtonWidthTypes
} from '../../../../component-library/components/Buttons/Button';
import {MetaMetricsEvents} from '../../../../core/Analytics';
import {useMetrics} from '../../../hooks/useMetrics';
import {useNavigation} from '@react-navigation/native';

function NavigateToSampleFeature() {
    const theme = useTheme();
    const { styles } = useStyles(styleSheet, { theme });
    const { trackEvent, createEventBuilder } = useMetrics();
    const navigation = useNavigation();

    const onPressNavigate = () => {
        trackEvent(
            createEventBuilder(MetaMetricsEvents.SETTINGS_SAMPLE_FEATURE).build(),
        );
        navigation.navigate('SampleFeature');
    };

    return (
        <>
            <Text
                color={TextColor.Alternative}
                variant={TextVariant.BodyMD}
                style={styles.desc}
            >
                {strings('app_settings.developer_options.sample_feature_desc')}
            </Text>
            <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                label={strings('app_settings.developer_options.navigate_to_sample_feature')}
                onPress={onPressNavigate}
                width={ButtonWidthTypes.Full}
                style={styles.accessory}
            />
        </>
    );
}

export default function SampleFeature() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  return (
    <>
        <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={styles.heading}
        >
            {strings('sample_feature.title')}
        </Text>
        <NavigateToSampleFeature />
    </>
  );
}
