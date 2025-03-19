import React, { useCallback } from 'react';
import { Box } from '../Box/Box';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../component-library/components/Texts/Text';
import Routes from '../../../constants/navigation/Routes';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';

export const BridgeDestNetworksBar = () => {
  const navigation = useNavigation();

  const navigateToNetworkSelector = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BRIDGE_DEST_NETWORK_SELECTOR,
    });
  }, [navigation]);

  return (
    <Box>
      <Button
        onPress={navigateToNetworkSelector}
        variant={ButtonVariants.Secondary}
        label={<Text>Dest Networks</Text>}
      />
    </Box>
  );};
