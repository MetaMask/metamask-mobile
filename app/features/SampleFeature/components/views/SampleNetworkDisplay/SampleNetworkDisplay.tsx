import React from 'react';
import { ImageSourcePropType, Text, View } from 'react-native';
import AvatarNetwork from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './SampleNetworkDisplay.styles';

/**
 * Props interface for the SampleNetworkDisplay component
 *
 * @interface SampleNetworkDisplayProps
 * @property name - The name of the network to display
 * @property imageSource - The image source for the network avatar
 *
 * @sampleFeature do not use in production code
 */
interface SampleNetworkDisplayProps {
  readonly name: string;
  readonly imageSource: ImageSourcePropType;
}

/**
 * SampleNetworkDisplay Component
 *
 * A demonstration component that displays a network avatar and name.
 * This component showcases the use of the AvatarNetwork component and
 * basic layout patterns in the MetaMask mobile app.
 *
 * @component
 * @example
 * ```tsx
 * <SampleNetworkDisplay
 *   name="Ethereum Mainnet"
 *   imageSource={require('path/to/ethereum.png')}
 * />
 * ```
 *
 * @remarks
 * This is a sample feature and should not be used in production code.
 * It demonstrates:
 * - Component composition
 * - Props typing
 * - Styling patterns
 * - Avatar component usage
 *
 * @sampleFeature do not use in production code
 *
 * @param props - The component props
 * @returns A view containing the network avatar and name
 */
export function SampleNetworkDisplay({
  name,
  imageSource,
}: Readonly<SampleNetworkDisplayProps>) {
  const { styles } = useStyles(styleSheet, {});
  return (
    <View style={styles.container}>
      <AvatarNetwork name={name} imageSource={imageSource} />
      <Text style={styles.text}>{name}</Text>
    </View>
  );
}
