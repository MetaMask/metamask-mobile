import React, { useMemo } from 'react';
import Modal from 'react-native-modal';
import { useTheme } from '../../../../../util/theme';
import Box from '../../../Ramp/Aggregator/components/Box';
import { StyleSheet, View } from 'react-native';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../../locales/i18n';
import Text from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { Colors } from '../../../../../util/theme/models';
import type { Hex } from '@metamask/utils';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    bottomModal: {
      justifyContent: 'flex-end',
      margin: 0,
    },
    box: {
      backgroundColor: colors.background.default,
      paddingHorizontal: 8,
      paddingBottom: 20,
      borderWidth: 0,
      padding: 0,
    },
    boxContent: {
      backgroundColor: colors.background.default,
      paddingBottom: 21,
      paddingTop: 0,
      borderWidth: 0,
    },
    editNetworkButton: {
      width: '100%',
    },
    notch: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border.muted,
      alignSelf: 'center',
      marginTop: 4,
    },
  });

interface ScamWarningModalProps {
  showScamWarningModal: string | null;
  setShowScamWarningModal: (chainId: string | null) => void;
}

export const ScamWarningModal = ({
  showScamWarningModal,
  setShowScamWarningModal,
}: ScamWarningModalProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  const networkConfig = useMemo(() => {
    if (!showScamWarningModal) return undefined;
    return networkConfigurations?.[showScamWarningModal as Hex];
  }, [showScamWarningModal, networkConfigurations]);

  const ticker = networkConfig?.nativeCurrency;

  const goToNetworkEdit = () => {
    if (!networkConfig) return;
    const defaultEndpoint =
      networkConfig.rpcEndpoints[networkConfig.defaultRpcEndpointIndex];
    if (!defaultEndpoint) return;

    const networkIdentifier = defaultEndpoint.networkClientId;

    setShowScamWarningModal(null);
    navigation.navigate(Routes.ADD_NETWORK, {
      network: networkIdentifier,
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });
  };

  return (
    <Modal
      isVisible={showScamWarningModal !== null}
      onBackdropPress={() => setShowScamWarningModal(null)}
      onSwipeComplete={() => setShowScamWarningModal(null)}
      swipeDirection="down"
      propagateSwipe
      avoidKeyboard
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
    >
      <Box style={styles.box}>
        <View style={styles.notch} />
        <SheetHeader title={strings('wallet.potential_scam')} />

        <Box style={styles.boxContent}>
          <Text>
            {strings('wallet.network_not_matching')}
            {` ${ticker ?? ''},`}
            {strings('wallet.target_scam_network')}
          </Text>
        </Box>
        <Box style={styles.boxContent}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('networks.edit_network_details')}
            onPress={goToNetworkEdit}
            style={styles.editNetworkButton}
            size={ButtonSize.Lg}
          />
        </Box>
      </Box>
    </Modal>
  );
};
