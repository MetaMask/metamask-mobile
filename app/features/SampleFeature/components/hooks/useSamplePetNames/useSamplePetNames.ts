import { useState, useEffect } from 'react';
import Engine from '../../../../../core/Engine';
import { Hex } from '@metamask/utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';

/**
 * Custom hook to get pet names for a specific chain and subscribe to updates
 *
 * @param chainId - The chain ID to get pet names for
 * @returns Object containing pet names as array of {address, name} objects
 *
 * @sampleFeature do not use in production code
 */
export function useSamplePetNames(chainId: SupportedCaipChainId | Hex) {
  const [petNames, setPetNames] = useState<{ address: string; name: string }[]>(
    [],
  );

  useEffect(() => {
    const controller = Engine.context.SamplePetnamesController;

    // Function to update local state from controller state
    const updatePetNames = () => {
      const petNamesByAddress =
        controller.state.namesByChainIdAndAddress[chainId as Hex] || {};
      const petNamesArray = Object.entries(petNamesByAddress).map(
        ([address, name]) => ({
          address,
          name,
        }),
      );
      setPetNames(petNamesArray);
    };

    // Initial load
    updatePetNames();

    // Subscribe to state changes using the Engine's controller messenger
    Engine.controllerMessenger.subscribe(
      'SamplePetnamesController:stateChange',
      updatePetNames,
    );

    // Cleanup subscription on unmount
    return () => {
      Engine.controllerMessenger.unsubscribe(
        'SamplePetnamesController:stateChange',
        updatePetNames,
      );
    };
  }, [chainId]);

  return { petNames };
}
