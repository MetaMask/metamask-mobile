import React, { useCallback, useEffect, useState } from 'react';
import { View, Switch, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { useStyles } from '../../../../component-library/hooks';
import {
  selectIsIpfsGatewayEnabled,
  selectIpfsGateway,
} from '../../../../selectors/preferencesController';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import ipfsGateways from '../../../../util/ipfs-gateways.json';
import { timeoutFetch } from '../../../../util/general';
import PickerBase from '../../../../component-library/components/Pickers/PickerBase';
import styleSheet from './index.styles';
import {
  IPFS_GATEWAY_SECTION,
  HASH_TO_TEST,
  HASH_STRING,
  IPFS_GATEWAY_SELECTED,
} from './index.constants';
import { Gateway } from './index.types';

interface IPFSGatewaySettingsProps {
  openOptionSheet?: (config: {
    title: string;
    options: { key: string | number; label: string; value: string }[];
    selectedValue: string;
    onSelect: (value: string) => void;
  }) => void;
}

const IPFSGatewaySettings = ({ openOptionSheet }: IPFSGatewaySettingsProps) => {
  const { PreferencesController } = Engine.context;
  const theme = useTheme();
  const { colors } = theme;
  const { styles } = useStyles(styleSheet, colors);

  const [onlineIpfsGateways, setOnlineIpfsGateways] = useState<Gateway[]>([]);
  const [gotAvailableGateways, setGotAvailableGateways] = useState(false);

  const ipfsGateway = useSelector(selectIpfsGateway);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);

  const handleAvailableIpfsGateways = useCallback(async () => {
    if (!isIpfsGatewayEnabled) return;
    const ipfsGatewaysPromises = ipfsGateways.map(async (gateway: Gateway) => {
      const testUrl =
        gateway.value + HASH_TO_TEST + '#x-ipfs-companion-no-redirect';
      try {
        const res = await timeoutFetch(
          testUrl,
          {
            headers: {
              'User-Agent': 'MetaMask Mobile Browser',
            },
          },
          1200,
        );
        const text = await res.text();
        const available = text.trim() === HASH_STRING.trim();
        return { ...gateway, available };
      } catch (e) {
        return { ...gateway, available: false };
      }
    });
    const ipfsGatewaysAvailability = await Promise.all(ipfsGatewaysPromises);
    const onlineGateways = ipfsGatewaysAvailability.filter(
      (gateway) => gateway.available,
    );

    const sortedOnlineIpfsGateways = [...onlineGateways].sort(
      (a, b) => a.key - b.key,
    );

    setGotAvailableGateways(true);
    setOnlineIpfsGateways(sortedOnlineIpfsGateways);
  }, [isIpfsGatewayEnabled]);

  const setIsIpfsGatewayEnabled = (isIpfsGatewatEnabled: boolean) => {
    PreferencesController.setIsIpfsGatewayEnabled(isIpfsGatewatEnabled);
  };

  const setIpfsGateway = (gateway: string) => {
    PreferencesController.setIpfsGateway(gateway);
  };

  const selectedGateway =
    onlineIpfsGateways.find((gateway) => gateway.value === ipfsGateway) ??
    onlineIpfsGateways[0];

  const openSheet = () =>
    openOptionSheet?.({
      title: strings('app_settings.ipfs_gateway'),
      options: onlineIpfsGateways,
      selectedValue: ipfsGateway,
      onSelect: setIpfsGateway,
    });

  useEffect(() => {
    handleAvailableIpfsGateways();
  }, [handleAvailableIpfsGateways]);

  return (
    <View style={styles.setting}>
      <View style={styles.titleContainer}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          style={styles.title}
        >
          {strings('app_settings.ipfs_gateway')}
        </Text>
        <View style={styles.switchElement}>
          <Switch
            value={isIpfsGatewayEnabled}
            onValueChange={setIsIpfsGatewayEnabled}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            thumbColor={theme.brandColors.white}
            style={styles.switch}
            ios_backgroundColor={colors.border.muted}
            testID={IPFS_GATEWAY_SECTION}
          />
        </View>
      </View>
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        style={styles.desc}
      >
        {strings('app_settings.ipfs_gateway_content')}
      </Text>
      {isIpfsGatewayEnabled && (
        <View style={styles.accessory}>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            style={styles.desc}
          >
            {strings('app_settings.ipfs_gateway_desc')}
          </Text>
          <View style={styles.picker}>
            {gotAvailableGateways ? (
              <PickerBase
                testID={IPFS_GATEWAY_SELECTED}
                onPress={openSheet}
                style={styles.pickerTrigger}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  style={styles.selectedLabel}
                  numberOfLines={1}
                >
                  {selectedGateway?.label ??
                    strings('app_settings.ipfs_gateway_down')}
                </Text>
              </PickerBase>
            ) : (
              <View>
                <ActivityIndicator size="small" />
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default IPFSGatewaySettings;
