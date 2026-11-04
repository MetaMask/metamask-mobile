import React from 'react';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarAccountVariant,
  Box,
  ListItem,
} from '@metamask/design-system-react-native';
import { renderShortAddress } from '../../../../../util/address';
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
 * - List rendering with the design-system ListItem
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
  const { petNames } = useSamplePetNames(chainId);

  return (
    <Box>
      {petNames.map(({ address, name }) => (
        <ListItem
          key={address}
          isInteractive
          onPress={() =>
            onAccountPress({
              address,
              name,
            })
          }
          avatar={
            <AvatarAccount
              address={address}
              // Legacy AvatarAccount defaulted to Maskicon. Keep that art.
              variant={AvatarAccountVariant.Maskicon}
              size={AvatarAccountSize.Md}
            />
          }
          title={name}
          description={renderShortAddress(address)}
        />
      ))}
    </Box>
  );
}
