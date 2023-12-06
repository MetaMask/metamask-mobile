// Third party dependencies.
import React, { useRef, FC, useCallback, useEffect, useState } from 'react';
import { Platform, View, InteractionManager, StyleSheet } from 'react-native';

// External dependencies.
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import { SheetBottomRef } from '../../../../component-library/components/Sheet/SheetBottom';
import Button from '../../../../component-library/components/Buttons/Button/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import Text from '../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../util/theme';
import { useSelector, useDispatch } from 'react-redux';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';
import { PPOMLoadingProps, Props } from './types';

const createStyles = (colors: any) =>
  StyleSheet.create({
    buttonWrapper: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: 20,
    },
  });

const PPOMLoading = ({ navigation, route }: Props) => {
  const dispatch = useDispatch();
  const { PreferencesController } = Engine.context;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(
    route.params.securityAlertsEnabled,
  );
  const [fetchingPPOMDataInProgress, setFetchingPPOMDataInProgress] =
    useState(false);
  const [intialisedBlockaid, setIntialisedBlockaid] = useState(true);
  const sheetRef = useRef<SheetBottomRef>(null);

  const cancelBlockaidInitialisation = () => {
    setSecurityAlertsEnabled(securityAlertsEnabled);
    navigation.navigate(Routes.SETTINGS.EXPERIMENTAL_SETTINGS, {
      securityAlertsEnabled,
    });
  };

  const continueBlockaidInitialisation = () => {
    PreferencesController?.setSecurityAlertsEnabled(!securityAlertsEnabled);
    if (securityAlertsEnabled) {
      dispatch({
        type: 'SET_PPOM_INITIALIZATION_COMPLETED',
        ppomInitializationCompleted: false,
      });
    }
    setFetchingPPOMDataInProgress(true);
    setIntialisedBlockaid(false);

    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.SETTINGS_EXPERIMENTAL_SECURITY_ALERTS_ENABLED,
        {
          security_alerts_enabled: !securityAlertsEnabled,
        },
      );
    });
  };

  const BlockaidLoadingIndicator = ({
    title,
    description,
    iconName,
    iconColor,
    showButton,
  }: PPOMLoadingProps) => (
    <View style={{ marginHorizontal: 20 }}>
      <Icon
        name={iconName}
        size={IconSize.Md}
        color={iconColor}
        style={{ alignSelf: 'center', marginTop: 20 }}
      />
      <SheetHeader title={title} />
      <Text variant={TextVariant.BodyMD}>{description}</Text>
      {showButton && (
        <View style={styles.buttonWrapper}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('blockaid_banner.cancel')}
            size={ButtonSize.Md}
            onPress={cancelBlockaidInitialisation}
            width={ButtonWidthTypes.Auto}
            style={{ width: 150 }}
          />
          <Button
            variant={ButtonVariants.Primary}
            label={strings('blockaid_banner.continue')}
            size={ButtonSize.Md}
            onPress={continueBlockaidInitialisation}
            width={ButtonWidthTypes.Full}
            style={{ width: 150 }}
          />
        </View>
      )}
    </View>
  );

  const ppomInitialisationCompleted = useSelector(
    (state: any) => state.experimentalSettings.ppomInitializationCompleted,
  );

  useEffect(() => {
    if (ppomInitialisationCompleted) {
      setFetchingPPOMDataInProgress(false);
      setIntialisedBlockaid(false);
    }
  }, [ppomInitialisationCompleted]);

  return (
    <BottomSheet ref={sheetRef} isInteractable={false}>
      {intialisedBlockaid && (
        <BlockaidLoadingIndicator
          title={strings('blockaid_banner.before_you_proceed')}
          description={strings('blockaid_banner.enable_blockaid_alerts')}
          iconName={IconName.Danger}
          iconColor={IconColor.Warning}
          showButton
        />
      )}

      {fetchingPPOMDataInProgress && (
        <BlockaidLoadingIndicator
          title={strings('blockaid_banner.setting_up_alerts')}
          description={strings('blockaid_banner.setting_up_alerts_description')}
          iconName={IconName.Setting}
          iconColor={IconColor.Primary}
        />
      )}

      {!intialisedBlockaid && !fetchingPPOMDataInProgress && (
        <BlockaidLoadingIndicator
          title={strings('blockaid_banner.setup_complete')}
          description={strings('blockaid_banner.setup_complete_description')}
          iconName={IconName.CopySuccess}
          iconColor={IconColor.Success}
        />
      )}
    </BottomSheet>
  );
};

export default PPOMLoading;
