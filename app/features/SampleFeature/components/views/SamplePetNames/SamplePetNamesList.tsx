import React from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../../components/Base/TouchableOpacity';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import ListItem from '../../../../../component-library/components/List/ListItem';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import { renderShortAddress } from '../../../../../util/address';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './SamplePetNamesList.styles';
import { SamplePetNamesListProps } from './SamplePetNamesList.types';
import { useSamplePetNames } from '../../hooks/useSamplePetNames';

/**
 * SamplePetNamesList Component
 *
 * A demonstration component that displays a list of pet names from the SamplePetnamesController.
 * This component showcases controller integration, list rendering, and avatar usage
 * in the MetaMask mobile app.
 *
 * @component
 * @example
 * ```tsx
 * <SamplePetNamesList
 *   chainId="0x1"
 *   onAccountPress={(params) => console.log(params)}
 * />
 * ```
 *
 * @remarks
 * This is a sample feature and should not be used in production code.
 * It demonstrates:
 * - Controller integration with reactive updates
 * - List rendering
 * - Avatar component usage
 * - Address formatting
 * - Event handling
 *
 * @sampleFeature do not use in production code
 *
 * @param props - The component props
 * @returns A view containing a list of pet names with avatars
 */
export function SamplePetNamesList({
  chainId,
  onAccountPress,
}: Readonly<SamplePetNamesListProps>) {
  const { styles } = useStyles(styleSheet, {});
  const { petNames } = useSamplePetNames(chainId);

  return (
    <View>
      {petNames.map(({ address, name }) => (
        <TouchableOpacity
          key={address}
          onPress={() =>
            onAccountPress({
              address,
              name,
            })
          }
        >
          <ListItem>
            <Avatar
              variant={AvatarVariant.Account}
              accountAddress={address}
              size={AvatarSize.Md}
            />
            <View style={styles.listItemTextContainer}>
              <Text variant={TextVariant.HeadingMD}>{name}</Text>
              <Text variant={TextVariant.BodySM}>
                {renderShortAddress(address)}
              </Text>
            </View>
          </ListItem>
        </TouchableOpacity>
      ))}
    </View>
  );
}
