import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ModalFieldNetworkFee } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import { NotificationDetailStyles } from '../styles';
import useStyles from '../useStyles';

type NetworkFeeFieldProps = ModalFieldNetworkFee;

type NetworkFee = Awaited<ReturnType<ModalFieldNetworkFee['getNetworkFees']>>;

function useNetworkFee({ getNetworkFees }: NetworkFeeFieldProps) {
  const [data, setData] = useState<NetworkFee | undefined>(undefined);
  useEffect(() => {
    getNetworkFees()
      .then((result) => setData(result))
      .catch(() => setData(undefined));
  }, [getNetworkFees]);

  return data;
}

function NetworkFeeLabelAndValue(props: {
  label: string;
  value?: string;
  styles: NotificationDetailStyles;
}) {
  const { label, value, styles } = props;
  return (
    <View style={styles.row}>
      <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
        {label}
      </Text>
      <Text
        color={TextColor.Alternative}
        style={styles.boxRight}
        variant={TextVariant.BodyMD}
      >
        {value || 'N/A'}
      </Text>
    </View>
  );
}

function NetworkFeeField(props: NetworkFeeFieldProps) {
  const { styles } = useStyles();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const sheetRef = useRef<BottomSheetRef>(null);
  const networkFee = useNetworkFee(props);

  if (!networkFee) {
    return null;
  }

  if (isCollapsed) {
    return null;
  }

  // TODO: Present an error screen when there is an error fetching the network fees
  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={false}
      onClose={() => setIsCollapsed(true)}
    >
      <View style={styles.gasDetails}>
        <NetworkFeeLabelAndValue
          label={strings('transactions.gas_limit')}
          value={`${networkFee.gasLimit}`}
          styles={styles}
        />
        <NetworkFeeLabelAndValue
          label={strings('transactions.gas_used')}
          value={`${networkFee.gasUsed}`}
          styles={styles}
        />
        <NetworkFeeLabelAndValue
          label={strings('transactions.base_fee')}
          value={`${networkFee.baseFee}`}
          styles={styles}
        />
        <NetworkFeeLabelAndValue
          label={strings('transactions.priority_fee')}
          value={`${networkFee.priorityFee}`}
          styles={styles}
        />
        <NetworkFeeLabelAndValue
          label={strings('transactions.max_fee')}
          value={`${networkFee.maxFeePerGas}`}
          styles={styles}
        />
      </View>
    </BottomSheet>
  );
}

export default NetworkFeeField;
