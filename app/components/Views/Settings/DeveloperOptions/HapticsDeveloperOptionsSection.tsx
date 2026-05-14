import React, { useCallback } from 'react';
import { ImpactFeedbackStyle } from '../../../../util/haptics';
import {
  Button,
  ButtonVariant,
  ButtonSize,
  FontWeight,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './DeveloperOptions.styles';
import {
  ImpactMoment,
  type HapticImpactMoment,
} from '../../../../util/haptics/catalog';
import {
  vendorImpact,
  vendorImpactRaw,
  vendorNotifyError,
  vendorNotifySuccess,
  vendorNotifyWarning,
  vendorSelection,
} from '../../../../util/haptics/vendorPlayback';

async function runUngated(play: () => Promise<void>): Promise<void> {
  try {
    await play();
  } catch {
    // Mirror gatedExecution: device may not support haptics (e.g. simulator).
  }
}

/**
 * Ordered list of semantic impact moments from the product catalog (`catalog.ts`).
 */
const CATALOG_IMPACT_MOMENTS_ORDERED: readonly HapticImpactMoment[] = [
  ImpactMoment.QuickAmountSelection,
  ImpactMoment.SliderTick,
  ImpactMoment.EdgeGestureEngage,
  ImpactMoment.PageNavigation,
  ImpactMoment.SliderGrip,
  ImpactMoment.TabChange,
  ImpactMoment.PrimaryCTA,
  ImpactMoment.PullToRefreshEngage,
  ImpactMoment.PullToRefresh,
  ImpactMoment.ChartCrosshair,
  ImpactMoment.FollowToggle,
];

const IMPACT_MOMENT_LABEL_KEYS: Record<HapticImpactMoment, string> = {
  [ImpactMoment.QuickAmountSelection]:
    'app_settings.developer_options.haptics.impacts.quick_amount_selection',
  [ImpactMoment.SliderTick]:
    'app_settings.developer_options.haptics.impacts.slider_tick',
  [ImpactMoment.EdgeGestureEngage]:
    'app_settings.developer_options.haptics.impacts.edge_gesture_engage',
  [ImpactMoment.PageNavigation]:
    'app_settings.developer_options.haptics.impacts.page_navigation',
  [ImpactMoment.SliderGrip]:
    'app_settings.developer_options.haptics.impacts.slider_grip',
  [ImpactMoment.TabChange]:
    'app_settings.developer_options.haptics.impacts.tab_change',
  [ImpactMoment.PrimaryCTA]:
    'app_settings.developer_options.haptics.impacts.primary_cta',
  [ImpactMoment.PullToRefreshEngage]:
    'app_settings.developer_options.haptics.impacts.pull_to_refresh_engage',
  [ImpactMoment.PullToRefresh]:
    'app_settings.developer_options.haptics.impacts.pull_to_refresh',
  [ImpactMoment.ChartCrosshair]:
    'app_settings.developer_options.haptics.impacts.chart_crosshair',
  [ImpactMoment.FollowToggle]:
    'app_settings.developer_options.haptics.impacts.follow_toggle',
};

const RAW_IMPACT_STYLE_ORDER: readonly ImpactFeedbackStyle[] = [
  ImpactFeedbackStyle.Light,
  ImpactFeedbackStyle.Medium,
  ImpactFeedbackStyle.Heavy,
  ImpactFeedbackStyle.Rigid,
  ImpactFeedbackStyle.Soft,
];

const RAW_IMPACT_LABEL_KEYS: Record<ImpactFeedbackStyle, string> = {
  [ImpactFeedbackStyle.Light]:
    'app_settings.developer_options.haptics.raw_styles.light',
  [ImpactFeedbackStyle.Medium]:
    'app_settings.developer_options.haptics.raw_styles.medium',
  [ImpactFeedbackStyle.Heavy]:
    'app_settings.developer_options.haptics.raw_styles.heavy',
  [ImpactFeedbackStyle.Rigid]:
    'app_settings.developer_options.haptics.raw_styles.rigid',
  [ImpactFeedbackStyle.Soft]:
    'app_settings.developer_options.haptics.raw_styles.soft',
};

export default function HapticsDeveloperOptionsSection() {
  const theme = useTheme();
  const { styles } = useStyles(styleSheet, { theme });

  const playCatalogImpact = useCallback((moment: HapticImpactMoment) => {
    runUngated(() => vendorImpact(moment));
  }, []);

  const playRawImpact = useCallback((style: ImpactFeedbackStyle) => {
    runUngated(() => vendorImpactRaw(style));
  }, []);

  const playSuccess = useCallback(() => {
    runUngated(() => vendorNotifySuccess());
  }, []);

  const playError = useCallback(() => {
    runUngated(() => vendorNotifyError());
  }, []);

  const playWarning = useCallback(() => {
    runUngated(() => vendorNotifyWarning());
  }, []);

  const playSelectionHaptic = useCallback(() => {
    runUngated(() => vendorSelection());
  }, []);

  return (
    <>
      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.haptics.title')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.haptics.description')}
      </Text>

      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Medium}
        style={styles.heading}
      >
        {strings(
          'app_settings.developer_options.haptics.catalog_impacts_heading',
        )}
      </Text>
      {CATALOG_IMPACT_MOMENTS_ORDERED.map((moment) => (
        <Button
          key={moment}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={() => playCatalogImpact(moment)}
          isFullWidth
          style={styles.accessory}
        >
          {strings(IMPACT_MOMENT_LABEL_KEYS[moment])}
        </Button>
      ))}

      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Medium}
        style={styles.heading}
      >
        {strings(
          'app_settings.developer_options.haptics.notifications_heading',
        )}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={playSuccess}
        isFullWidth
        style={styles.accessory}
      >
        {strings(
          'app_settings.developer_options.haptics.notification_success_button',
        )}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={playError}
        isFullWidth
        style={styles.accessory}
      >
        {strings(
          'app_settings.developer_options.haptics.notification_error_button',
        )}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={playWarning}
        isFullWidth
        style={styles.accessory}
      >
        {strings(
          'app_settings.developer_options.haptics.notification_warning_button',
        )}
      </Button>

      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Medium}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.haptics.selection_heading')}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={playSelectionHaptic}
        isFullWidth
        style={styles.accessory}
      >
        {strings('app_settings.developer_options.haptics.selection_button')}
      </Button>

      <Text
        color={TextColor.TextDefault}
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Medium}
        style={styles.heading}
      >
        {strings('app_settings.developer_options.haptics.raw_impacts_heading')}
      </Text>
      <Text
        color={TextColor.TextAlternative}
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        style={styles.desc}
      >
        {strings('app_settings.developer_options.haptics.raw_impacts_desc')}
      </Text>
      {RAW_IMPACT_STYLE_ORDER.map((style) => (
        <Button
          key={style}
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={() => playRawImpact(style)}
          isFullWidth
          style={styles.accessory}
        >
          {strings(RAW_IMPACT_LABEL_KEYS[style])}
        </Button>
      ))}
    </>
  );
}
