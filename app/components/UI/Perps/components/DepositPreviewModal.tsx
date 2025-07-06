import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter from '../../../../component-library/components/BottomSheets/BottomSheetFooter';
import Text, {
  TextVariant,
  TextColor
} from '../../../../component-library/components/Texts/Text';
import {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import Card from '../../../../component-library/components/Cards/Card';
import { useTheme } from '../../../../util/theme';
import type { Colors } from '../../../../util/theme/models';
import Routes from '../../../../constants/navigation/Routes';

interface DepositPreviewModalProps {
  route: {
    params: {
      amount: string;
      selectedToken: {
        symbol: string;
        address: string;
        decimals: number;
      };
      tokenAmountNeeded: string;
    };
  };
}

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    amountText: {
      fontSize: 32,
      lineHeight: 40,
      fontWeight: '300',
    },
    iconContainer: {
      alignSelf: 'center',
      marginVertical: 24,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary.muted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailCard: {
      padding: 16,
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    detailLabel: {
      flex: 1,
    },
    payWithRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginBottom: 16,
    },
    tokenAmount: {
      marginLeft: 8,
    },
    footer: {
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
  });

const DepositPreviewModal: React.FC<DepositPreviewModalProps> = ({ route }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const { amount, selectedToken, tokenAmountNeeded } = route.params || {};

  const handleClose = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  const handleConfirm = () => {
    bottomSheetRef.current?.onCloseBottomSheet(() => {
      navigation.navigate(Routes.PERPS.DEPOSIT_PROCESSING as never, {
        amount,
        selectedToken,
      });
    });
  };

  // TODO: Calculate real network fee from gas estimates
  const networkFee = '$4.83';
  const estimatedTime = '2 minutes';

  const footerButtonProps = [
    {
      label: 'Confirm deposit',
      variant: ButtonVariants.Primary,
      size: ButtonSize.Lg,
      onPress: handleConfirm,
      testID: 'confirm-deposit-button',
    },
  ];

  return (
    <BottomSheet ref={bottomSheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          DEPOSITING
        </Text>
      </BottomSheetHeader>

      <View style={styles.content}>
        {/* Amount Display */}
        <View style={styles.header}>
          <Text
            variant={TextVariant.DisplayMD}
            style={styles.amountText}
            testID="amount-display"
          >
            {amount || '0'} USDC
          </Text>
        </View>

        {/* Pay With Row */}
        <View style={styles.payWithRow}>
          <Text variant={TextVariant.BodySM} color={TextColor.Muted}>
            Pay with
          </Text>
          <Text variant={TextVariant.BodyMDMedium} style={styles.tokenAmount}>
            {tokenAmountNeeded || '0'} {selectedToken?.symbol || 'ETH'}
          </Text>
        </View>

        {/* Transaction Details */}
        <Card style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
              Network fee
            </Text>
            <Text variant={TextVariant.BodyMD}>
              {networkFee}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text variant={TextVariant.BodyMD} style={styles.detailLabel}>
              Estimated time
            </Text>
            <Text variant={TextVariant.BodyMD}>
              {estimatedTime}
            </Text>
          </View>
        </Card>
      </View>

      <BottomSheetFooter
        buttonPropsArray={footerButtonProps}
        style={styles.footer}
      />
    </BottomSheet>
  );
};

export default DepositPreviewModal;
