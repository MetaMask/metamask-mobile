import React, { useCallback, useState } from 'react';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import { BalanceLiveActivityService } from '../../../../core/Widgets/BalanceLiveActivityService';
import { useStyles } from '../../../../component-library/hooks';
import { useTheme } from '../../../../util/theme';
import styleSheet from './DeveloperOptions.styles';

/**
 * Starts and stops the balance Live Activity by hand.
 *
 * A Live Activity has no "installed" state a user can discover the way a home
 * screen widget does — something has to explicitly start it. Until product
 * decides what that trigger should be (an entry point in the wallet, an
 * opt-in setting), this section is it.
 */
export function WidgetsDeveloperOptionsSection() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const [isRunning, setIsRunning] = useState(() =>
    BalanceLiveActivityService.isRunning(),
  );
  const [error, setError] = useState<string | undefined>();

  const handleStart = useCallback(async () => {
    const started = await BalanceLiveActivityService.start();
    setIsRunning(BalanceLiveActivityService.isRunning());
    setError(
      started
        ? undefined
        : strings('app_settings.developer_options.widgets.start_failed'),
    );
  }, []);

  const handleStop = useCallback(() => {
    BalanceLiveActivityService.stop();
    setIsRunning(BalanceLiveActivityService.isRunning());
    setError(undefined);
  }, []);

  if (!BalanceLiveActivityService.isSupported()) {
    return null;
  }

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.widgets.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.widgets.description')}
      </Text>
      {error ? (
        <Text
          color={TextColor.ErrorDefault}
          variant={TextVariant.BodyMd}
          style={styles.desc}
        >
          {error}
        </Text>
      ) : null}
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={isRunning ? handleStop : handleStart}
        isFullWidth
        style={styles.accessory}
        testID="widgets-dev-balance-live-activity-toggle"
      >
        {strings(
          isRunning
            ? 'app_settings.developer_options.widgets.stop_balance_live_activity'
            : 'app_settings.developer_options.widgets.start_balance_live_activity',
        )}
      </Button>
    </>
  );
}

export default WidgetsDeveloperOptionsSection;
