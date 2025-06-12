import React from 'react';
import {ImageSourcePropType, Text, View} from 'react-native';
import AvatarNetwork from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import {useStyles} from '../../../../../component-library/hooks';
import styleSheet from './SampleNetworkDisplay.styles';

/**
 * Sample interface for SampleNetworkDisplay component props
 *
 * @sampleFeature do not use in production code
 */
interface SampleNetworkDisplayProps {
  name: string;
  imageSource: ImageSourcePropType;
}

/**
 * Sample SampleNetworkDisplay component
 *
 * @sampleFeature do not use in production code
 */
export function SampleNetworkDisplay({ name, imageSource }: SampleNetworkDisplayProps) {
    const {styles} = useStyles(styleSheet,{});
    return (
      <View style={styles.container}>
        <AvatarNetwork name={name} imageSource={imageSource} />
        <Text style={styles.text}>{name}</Text>
      </View>
    );
}

