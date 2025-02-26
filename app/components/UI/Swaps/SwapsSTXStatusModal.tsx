import React from 'react';
import { StyleSheet, View } from 'react-native';
import Modal from 'react-native-modal';
import { useTheme } from '../../../util/theme';
import Device from '../../../util/device';
import { ThemeColors } from '@metamask/design-tokens';
import SmartTransactionStatus from '../../Views/SmartTransactionStatus/SmartTransactionStatus';
import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import { useSelector } from 'react-redux';
import { selectSmartTransactionsForCurrentChain } from '../../../selectors/smartTransactionsController';
import { useNavigation } from '@react-navigation/native';

interface Props {
  isVisible: boolean;
  dismiss: () => void;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  bottomModal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  root: {
    backgroundColor: colors.background.default,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 200,
    maxHeight: '100%',
    paddingTop: 12,
    paddingBottom: Device.isIphoneX() ? 32 : 24,
  },
});

export const SwapsSTXStatusModal = ({ isVisible, dismiss }: Props) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const smartTransactions = useSelector(selectSmartTransactionsForCurrentChain);
  const latestSmartTransaction = smartTransactions[smartTransactions.length - 1];

  return (
    <Modal
      isVisible={isVisible}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      style={styles.bottomModal}
      backdropColor={colors.overlay.default}
      backdropOpacity={1}
      animationInTiming={600}
      animationOutTiming={600}
      onBackdropPress={dismiss}
      onBackButtonPress={dismiss}
      onSwipeComplete={dismiss}
      swipeDirection={'down'}
      propagateSwipe
      >
      <View style={styles.root}>
        <SmartTransactionStatus
          requestState={{
            smartTransaction: latestSmartTransaction,
            isDapp: false,
            isInSwapFlow: true,
          }}
          origin={ORIGIN_METAMASK}
          onConfirm={dismiss}
          handleCreateNewSwap={() => {
            navigation.goBack();
          }}
        />
      </View>
    </Modal>
  );
};
