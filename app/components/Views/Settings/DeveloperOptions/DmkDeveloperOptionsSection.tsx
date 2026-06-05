import React, { useCallback } from 'react';
import { Switch } from 'react-native';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import { useFeatureFlagOverride } from '../../../../contexts/FeatureFlagOverrideContext';
import { selectEnableDMK } from '../../../../selectors/featureFlagController/enableDMK';
import styleSheet from './DeveloperOptions.styles';

const DMK_FLAG_KEY = 'enableDMK';
const DMK_SWITCH_TEST_ID = 'dmk-dev-toggle-switch';

// The version-gated flag shape requires minimumVersion; using a low
// floor so any dev build qualifies.
const DMK_OVERRIDE_ENABLED = { enabled: true, minimumVersion: '1.0.0' };
const DMK_OVERRIDE_DISABLED = { enabled: false, minimumVersion: '1.0.0' };

const DmkDeveloperOptionsSection = () => {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });
  const { colors } = theme;

  const isDmkEnabled = useSelector(selectEnableDMK);
  const { hasOverride, setOverride, removeOverride } =
    useFeatureFlagOverride();

  const isOverridden = hasOverride(DMK_FLAG_KEY);

  const handleToggle = useCallback(
    (nextValue: boolean) => {
      if (nextValue) {
        setOverride(DMK_FLAG_KEY, DMK_OVERRIDE_ENABLED);
      } else if (isOverridden) {
        removeOverride(DMK_FLAG_KEY);
      } else {
        // Flag was enabled remotely (not overridden) — flip to disabled override
        setOverride(DMK_FLAG_KEY, DMK_OVERRIDE_DISABLED);
      }
    },
    [isOverridden, setOverride, removeOverride],
  );

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingLg}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.dmk.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.dmk.description')}
      </Text>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.BodyMd}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.dmk.status', {
          status: isDmkEnabled
            ? strings('app_settings.developer_options.dmk.status_enabled')
            : strings('app_settings.developer_options.dmk.status_disabled'),
        })}
      </Text>
      {isOverridden && (
        <Text
          color={TextColor.WarningDefault}
          variant={TextVariant.BodySm}
          style={styles.desc}
        >
          {strings('app_settings.developer_options.dmk.overridden')}
        </Text>
      )}
      <Switch
        testID={DMK_SWITCH_TEST_ID}
        value={isDmkEnabled}
        onValueChange={handleToggle}
        trackColor={{
          false: colors.border.default,
          true: colors.primary.default,
        }}
        thumbColor={colors.background.default}
        ios_backgroundColor={colors.border.default}
        style={styles.accessory}
      />
    </>
  );
};

export default DmkDeveloperOptionsSection;
