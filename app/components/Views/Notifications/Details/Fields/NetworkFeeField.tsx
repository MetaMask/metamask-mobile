import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';

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
import { type INotification } from '../../../../../util/notifications';
import onChainAnalyticProperties from '../../../../../util/notifications/methods/notification-analytics';
import { useMetrics } from '../../../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import NetworkFeeFieldSkeleton from './Skeletons/NetworkFeeField';

export const NETWORK_FEE_FIELD_TESTID = 'network-fee-field';

type NetworkFeeFieldProps = ModalFieldNetworkFee & {
  notification: INotification;
  isCollapsed: boolean;
  setIsCollapsed: (newVal: boolean) => void;
};

type NetworkFee = Awaited<ReturnType<ModalFieldNetworkFee['getNetworkFees']>>;

export function useNetworkFee({ getNetworkFees }: NetworkFeeFieldProps) {
  const [data, setData] = useState<NetworkFee | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  useEffect(() => {
    setIsLoading(true);
    getNetworkFees()
      .then((result) => {
        setData(result);
        setIsLoading(false);
      })
      .catch(() => {
        setData(undefined);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [getNetworkFees]);

  return { data, isLoading };
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
  const { data: networkFee, isLoading } = useNetworkFee(props);
  const { trackEvent, createEventBuilder } = useMetrics();

  if (isLoading && !networkFee) {
    return (
      <View style={styles.row}>
        <NetworkFeeFieldSkeleton />
      </View>
    );
  }

  const renderNetworkFeeDetails = () => {
    if (!networkFee) {
      return (
        <View style={styles.boxLeft}>
          <Text variant={TextVariant.BodyLGMedium}>
            {strings('notifications.network_fee_not_available')}
          </Text>
        </View>
      );
    }

    const ticker = CURRENCY_SYMBOL_BY_CHAIN_ID[networkFee.chainId];
    const collapsedIcon = isCollapsed ? IconName.ArrowDown : IconName.ArrowUp;
    return (
      <>
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
      </>
    );
  };

  const onPress = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTIFICATION_DETAIL_CLICKED)
          .addProperties({
            notification_id: notification.id,
            notification_type: notification.type,
            ...onChainAnalyticProperties(notification),
            clicked_item: 'fee_details',
          })
          .build(),
      );
    }
  };

  return (
    <>
      <TouchableOpacity testID={NETWORK_FEE_FIELD_TESTID} onPress={onPress}>
        <View style={styles.row}>
          <Avatar
            variant={AvatarVariant.Icon}
            size={AvatarSize.Md}
            style={styles.badgeWrapper}
            name={IconName.Gas}
            backgroundColor={theme.colors.info.muted}
            iconColor={IconColor.Info}
          />
          {renderNetworkFeeDetails()}
        </View>
      </TouchableOpacity>

      {!isCollapsed && networkFee && (
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
