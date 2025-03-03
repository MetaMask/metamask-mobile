import React from 'react';
import Modal from 'react-native-modal';
import { useTheme } from '../../../../../util/theme';
import createStyles from '../../styles';
import Box from '../../../../UI/Ramp/components/Box';
import { View } from 'react-native';
import SheetHeader from '../../../../../../app/component-library/components/Sheet/SheetHeader';
import { strings } from '../../../../../../locales/i18n';
import Text from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import {
  selectEvmTicker,
  selectProviderConfig,
} from '../../../../../selectors/networkController';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';

interface ScamWarningModalProps {
  showScamWarningModal: boolean;
  setShowScamWarningModal: (arg: boolean) => void;
}

export const ScamWarningModal = ({
  showScamWarningModal,
  setShowScamWarningModal,
}: ScamWarningModalProps) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const ticker = useSelector(selectEvmTicker);
  const { rpcUrl } = useSelector(selectProviderConfig);

  const styles = createStyles(colors);

  const goToNetworkEdit = () => {
    navigation.navigate(Routes.ADD_NETWORK, {
      network: rpcUrl,
    });
    setShowScamWarningModal(false);
  };

  return (
    <Modal
      isVisible={showScamWarningModal}
      onBackdropPress={() => setShowScamWarningModal(false)}
      onSwipeComplete={() => setShowScamWarningModal(false)}
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
            {` ${ticker},`}
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
