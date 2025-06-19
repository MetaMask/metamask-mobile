import { useEffect, useState, useCallback } from 'react';
import { toChecksumAddress } from 'ethereumjs-util';
import Engine from '../../../../../core/Engine';
import { Hex } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { UseSamplePetNamesFormReturn } from './useSamplePetNamesForm.types';

/**
 * Sample useSamplePetNamesForm hook
 *
 * @sampleFeature do not use in production code
 */
function useSamplePetNamesForm(
  chainId: SupportedCaipChainId | Hex,
  initialAddress: string,
  initialName: string,
): UseSamplePetNamesFormReturn {
  const [address, setAddress] = useState(initialAddress);
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setAddress(initialAddress);
    setName(initialName);
  }, [initialAddress, initialName]);

  const isValid = !!address && !!name;

  const onSubmit = useCallback(() => {
    if (!isValid) return;
    const { SamplePetnamesController } = Engine.context;
    SamplePetnamesController.assignPetname(chainId as Hex, toChecksumAddress(address) as Hex, name);
  }, [address, name, chainId, isValid]);

  const reset = useCallback(() => {
    setAddress(initialAddress);
    setName(initialName);
  }, [initialAddress, initialName]);

  return {
    address,
    setAddress,
    name,
    setName,
    isValid,
    onSubmit,
    reset,
  };
}

export default useSamplePetNamesForm;
