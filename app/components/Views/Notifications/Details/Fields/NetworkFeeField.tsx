import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { ModalFieldNetworkFee } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';
import useStyles from '../useStyles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { NotificationDetailStyles } from '../styles';
import { CURRENCY_SYMBOL_BY_CHAIN_ID } from '../../../../../constants/network';
import {
  type Notification,
  TRIGGER_TYPES,
} from '../../../../../util/notifications';
import { useMetrics } from '../../../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

type NetworkFeeFieldProps = ModalFieldNetworkFee & {
  notification: Notification;
  isCollapsed: boolean;
  setIsCollapsed: (newVal: boolean) => void;
};

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
  const { setIsCollapsed, isCollapsed, notification } = props;
  const { styles, theme } = useStyles();
  const sheetRef = useRef<BottomSheetRef>(null);
  const networkFee = useNetworkFee(props);
  const { trackEvent } = useMetrics();

  if (!networkFee) {
    return null;
  }

  const collapsedIcon = isCollapsed ? IconName.ArrowDown : IconName.ArrowUp;
  const ticker = CURRENCY_SYMBOL_BY_CHAIN_ID[networkFee.chainId];

  const onPress = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      trackEvent(MetaMetricsEvents.NOTIFICATION_DETAIL_CLICKED, {
        notification_id: notification.id,
        notification_type: notification.type,
        ...(notification.type !== TRIGGER_TYPES.FEATURES_ANNOUNCEMENT
          ? { chain_id: notification?.chain_id }
          : {}),
        clicked_item: 'fee_details',
      });
    }
  };

  return (
    <>
      <TouchableOpacity onPress={onPress}>
        <View style={styles.row}>
          <Avatar
            variant={AvatarVariant.Icon}
            size={AvatarSize.Md}
            style={styles.badgeWrapper}
            name={IconName.Gas}
            backgroundColor={theme.colors.info.muted}
            iconColor={IconColor.Info}
          />

          <View style={styles.boxLeft}>
            <Text variant={TextVariant.BodyLGMedium}>
              {strings('asset_details.network_fee')}
            </Text>

            <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
              {networkFee.transactionFeeInEth} {ticker} ($
              {networkFee.transactionFeeInUsd})
            </Text>
          </View>
          <View style={styles.copyContainer}>
            <Text variant={TextVariant.BodyMD} style={styles.copyTextBtn}>
              {strings('transaction.details')}
            </Text>
            <Icon
              name={collapsedIcon}
              size={IconSize.Md}
              color={IconColor.Info}
            />
          </View>
        </View>
      </TouchableOpacity>

      {!isCollapsed && (
        <BottomSheet
          ref={sheetRef}
          shouldNavigateBack={false}
          onClose={() => props.setIsCollapsed(true)}
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
      )}
    </>
  );
}

export default NetworkFeeField;
