import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Text, { TextVariant } from '../../../../../component-library/components/Texts/Text';
import ListItem from '../../../../../component-library/components/List/ListItem';
import Avatar, { AvatarSize, AvatarVariant } from '../../../../../component-library/components/Avatars/Avatar';
import { renderShortAddress } from '../../../../../util/address';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './SamplePetNamesList.styles';
import {useSelector} from 'react-redux';
import {RootState} from '../../../../../reducers';
import {selectAddressBookByChain} from '../../../../../selectors/addressBookController';
import {Hex} from '@metamask/utils';
import {SamplePetNamesListProps} from './SamplePetNamesList.types';

/**
 * SamplePetNamesList Component
 * 
 * A demonstration component that displays a list of pet names from the address book.
 * This component showcases Redux integration, list rendering, and avatar usage
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
 * - Redux integration
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
export function SamplePetNamesList({ chainId, onAccountPress }: SamplePetNamesListProps) {
  const { styles } = useStyles(styleSheet, {});


  const addressBook = useSelector((state: RootState) =>
      selectAddressBookByChain(
          state,
          chainId as Hex,
      ),
  );

  return (
    <View>
      {Object.entries(addressBook).map(([addressBookKey, addressBookEntry]) => (
        <TouchableOpacity key={addressBookKey} onPress={() => onAccountPress({address: addressBookEntry.address, name: addressBookEntry.name})}>
          <ListItem>
            <Avatar
              variant={AvatarVariant.Account}
              accountAddress={addressBookEntry.address}
              size={AvatarSize.Md}
            />
            <View style={styles.textStack}>
              <Text variant={TextVariant.HeadingMD}>{addressBookEntry.name}</Text>
              <Text variant={TextVariant.BodySM}>
                {renderShortAddress(addressBookEntry.address)}
              </Text>
            </View>
          </ListItem>
        </TouchableOpacity>
      ))}
    </View>
  );
}
