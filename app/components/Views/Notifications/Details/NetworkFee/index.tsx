import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import type { HalRawNotificationsWithNetworkFields } from '../../../../../util/notifications/types/halNotification';
import {
  getNetworkFees,
  networkFeeDetails,
} from '../../../../../util/notifications';
import { NotificationDetailStyles } from '../styles';

type NetworkFees = {
  transactionFee: {
    transactionFeeInEther: string;
    transactionFeeInUsd: string;
  };
  gasLimitUnits: number;
  gasUsedUnits: number;
  baseFee: string | null;
  priorityFee: string | null;
  maxFeePerGas: string | null;
} | null;

interface NotificationModalNetworkFeeProps {
  notification: HalRawNotificationsWithNetworkFields;
  sheetRef: React.RefObject<BottomSheetRef>;

  styles: NotificationDetailStyles;
  onClosed: () => void;
}

const NetworkFee = ({
  notification,
  sheetRef,
  styles,
  onClosed,
}: NotificationModalNetworkFeeProps) => {
  const [networkFees, setNetworkFees] = useState<NetworkFees>(null);
  const [networkFeesError, setNetworkFeesError] = useState<boolean>(false);

  const fetchNetworkFees = useCallback(async () => {
    try {
      const fees = await getNetworkFees(notification);
      if (fees) {
        setNetworkFees({
          transactionFee: {
            transactionFeeInEther: fees.transactionFeeInEth,
            transactionFeeInUsd: fees.transactionFeeInUsd,
          },
          gasLimitUnits: fees.gasLimit,
          gasUsedUnits: fees.gasUsed,
          baseFee: fees.baseFee,
          priorityFee: fees.priorityFee,
          maxFeePerGas: fees.maxFeePerGas,
        });
      }
    } catch (err) {
      setNetworkFeesError(true);
    }
  }, [notification]);

  useEffect(() => {
    fetchNetworkFees();
  }, [fetchNetworkFees]);

  // TODO: Present an error screen when there is an error fetching the network fees
  return (
    <BottomSheet ref={sheetRef} shouldNavigateBack={false} onClose={onClosed}>
      {!networkFeesError && (
        <View style={styles.gasDetails}>
          {Object.keys(networkFeeDetails).map((key, value) => (
            <View key={key} style={styles.row}>
              <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
                {strings(key)}
              </Text>
              <Text
                color={TextColor.Alternative}
                style={styles.boxRight}
                variant={TextVariant.BodyMD}
              >
                {networkFees?.[networkFeeDetails[value] as keyof NetworkFees] ||
                  'N/A'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </BottomSheet>
  );
};

export default NetworkFee;
