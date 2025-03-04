import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  CaipAccountAddress,
  CaipAccountId,
  CaipNamespace,
  KnownCaipNamespace,
  parseCaipAccountId,
  stringToBytes,
} from '@metamask/utils';
import { Image } from 'react-native';
import Jazzicon from 'react-native-jazzicon';
import { toDataUrl } from '../../../../util/blockies';
import { RootState } from '../../../../reducers';

export const DIAMETERS: Record<string, number> = {
  xs: 16,
  sm: 24,
  md: 32,
  lg: 40,
};

export interface SnapUIAvatarProps {
  // The address must be a CAIP-10 string.
  address: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

function getJazziconSeed(
  namespace: CaipNamespace,
  address: CaipAccountAddress,
) {
  if (namespace === KnownCaipNamespace.Eip155) {
    // Default behaviour for EIP155 namespace to match existing Jazzicons
    return parseInt(address.slice(2, 10), 16);
  }
  return Array.from(stringToBytes(address.normalize('NFKC').toLowerCase()));
}

export const SnapUIAvatar: React.FunctionComponent<SnapUIAvatarProps> = ({
  address,
  size = 'md',
}) => {
  const parsed = useMemo(
    () => parseCaipAccountId(address as CaipAccountId),
    [address],
  );
  const useBlockie = useSelector(
    (state: RootState) => state.settings.useBlockieIcon,
  );

  const diameter = DIAMETERS[size];

  if (useBlockie) {
    return (
      <Image
        source={{ uri: toDataUrl(parsed.address) }}
        height={diameter}
        width={diameter}
        borderRadius={diameter / 2}
      />
    );
  }

  const seed = getJazziconSeed(parsed.chain.namespace, parsed.address);

  return (
    <Jazzicon
      // @ts-expect-error The underlying PRNG supports the seed being an array but the component is typed wrong.
      seed={seed}
      size={diameter}
    />
  );
};
