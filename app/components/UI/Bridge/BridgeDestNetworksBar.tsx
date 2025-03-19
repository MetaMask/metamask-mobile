import React, { useCallback } from 'react';
import { Box } from '../Box/Box';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../component-library/components/Texts/Text';
import Routes from '../../../constants/navigation/Routes';
import Button, { ButtonVariants } from '../../../component-library/components/Buttons/Button';
import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { StyleSheet } from 'react-native';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { AlignItems, FlexDirection } from '../Box/box.types';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    networksButton: {
      borderColor: theme.colors.border.muted,
    },
  });
};

export const BridgeDestNetworksBar = () => {
  const navigation = useNavigation();
  const { styles } = useStyles(createStyles, {});

  const navigateToNetworkSelector = useCallback(() => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BRIDGE_DEST_NETWORK_SELECTOR,
    });
  }, [navigation]);

  return (
    <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center} gap={4}>
      <Button
        onPress={navigateToNetworkSelector}
        variant={ButtonVariants.Secondary}
        label={<Text>{strings('bridge.see_all')}</Text>}
        style={styles.networksButton}
        endIconName={IconName.ArrowDown}
      />
    </Box>
  );};
