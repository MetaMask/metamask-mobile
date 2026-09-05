import React, { useCallback, useEffect, useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import {
  getLastUnlockSummary,
  getUnlockWindowLiveCount,
  isUnlockWindowActive,
  subscribeUnlockNetworkMeter,
  type UnlockNetworkSummary,
} from '../../../../core/UnlockNetworkMeter';
import styleSheet from './DeveloperOptions.styles';

const UnlockNetworkMeterDeveloperOptionsSection = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const [summary, setSummary] = useState<UnlockNetworkSummary | null>(
    getLastUnlockSummary,
  );
  const [active, setActive] = useState(isUnlockWindowActive);
  const [liveCount, setLiveCount] = useState(getUnlockWindowLiveCount);

  useEffect(
    () =>
      subscribeUnlockNetworkMeter(() => {
        setSummary(getLastUnlockSummary());
        setActive(isUnlockWindowActive());
        setLiveCount(getUnlockWindowLiveCount());
      }),
    [],
  );

  const handleCopyJson = useCallback(() => {
    if (!summary) {
      return;
    }
    Clipboard.setString(
      JSON.stringify(
        {
          total: summary.total,
          byHost: summary.byHost,
          endReason: summary.endReason,
          startedAt: summary.startedAt,
          endedAt: summary.endedAt,
          requests: summary.requests,
        },
        null,
        2,
      ),
    );
  }, [summary]);

  const hostLines = summary
    ? Object.entries(summary.byHost)
        .sort((a, b) => b[1] - a[1])
        .map(([host, count]) => `${host}: ${count}`)
        .join('\n')
    : '';

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.unlock_network_meter.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings(
          'app_settings.developer_options.unlock_network_meter.description',
        )}
      </Text>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.BodyMd}
        style={styles.desc}
        testID="unlock-network-meter-status"
      >
        {active
          ? strings(
              'app_settings.developer_options.unlock_network_meter.status_active',
              { count: liveCount },
            )
          : summary
            ? strings(
                'app_settings.developer_options.unlock_network_meter.status_last',
                {
                  total: summary.total,
                  reason: summary.endReason,
                },
              )
            : strings(
                'app_settings.developer_options.unlock_network_meter.status_empty',
              )}
      </Text>
      {hostLines ? (
        <Text
          color={TextColor.TextAlternative}
          variant={TextVariant.BodySm}
          style={styles.desc}
          testID="unlock-network-meter-hosts"
        >
          {hostLines}
        </Text>
      ) : null}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleCopyJson}
        isFullWidth
        isDisabled={!summary}
        style={styles.accessory}
        testID="unlock-network-meter-copy-json"
      >
        {strings(
          'app_settings.developer_options.unlock_network_meter.copy_json_button',
        )}
      </Button>
    </>
  );
};

export default UnlockNetworkMeterDeveloperOptionsSection;
