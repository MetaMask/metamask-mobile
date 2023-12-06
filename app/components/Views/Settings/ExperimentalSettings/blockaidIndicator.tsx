import React, { useRef, useEffect, useState } from 'react';
import { View, InteractionManager } from 'react-native';
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
import { useSelector, useDispatch } from 'react-redux';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';
import { BlockaidIndicatorProps, Props } from './ExperimentalSettings.types';
import { useTheme } from '../../../../util/theme';
import createStyles from './ExperimentalSettings.styles';
import { selectIsSecurityAlertsEnabled } from '../../../../selectors/preferencesController';

const BlockaidIndicator = ({ navigation }: Props) => {
  const dispatch = useDispatch();
  const { PreferencesController } = Engine.context;
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const initialSecurityAlertsEnabled = useSelector(
    selectIsSecurityAlertsEnabled,
  );
  const [fetchingPPOMDataInProgress, setFetchingPPOMDataInProgress] =
    useState(false);
  const [sheetInteractable, setSheetInteractable] = useState(true);
  const [intialisedBlockaid, setIntialisedBlockaid] = useState(true);
  const sheetRef = useRef<SheetBottomRef>(null);

  const cancelBlockaidInitialisation = () => {
    navigation.navigate(Routes.SETTINGS.EXPERIMENTAL_SETTINGS);
  };

  const continueBlockaidInitialisation = () => {
    PreferencesController?.setSecurityAlertsEnabled(
      !initialSecurityAlertsEnabled,
    );
    setSheetInteractable(false);
    dispatch({
      type: 'SET_PPOM_INITIALIZATION_COMPLETED',
      ppomInitializationCompleted: false,
    });
    setFetchingPPOMDataInProgress(true);
    setIntialisedBlockaid(false);

    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.SETTINGS_EXPERIMENTAL_SECURITY_ALERTS_ENABLED,
        {
          security_alerts_enabled: !initialSecurityAlertsEnabled,
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
  }: BlockaidIndicatorProps) => (
    <View style={styles.blockaidWrapper}>
      <Icon
        name={iconName}
        size={IconSize.Xl}
        color={iconColor}
        style={styles.iconStyle}
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
            style={styles.buttonSize}
          />
          <Button
            variant={ButtonVariants.Primary}
            label={strings('blockaid_banner.continue')}
            size={ButtonSize.Md}
            onPress={continueBlockaidInitialisation}
            width={ButtonWidthTypes.Full}
            style={styles.buttonSize}
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
      setSheetInteractable(true);
    }
  }, [ppomInitialisationCompleted]);

  return (
    <BottomSheet ref={sheetRef} isInteractable={sheetInteractable}>
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

      {/* {!intialisedBlockaid && !fetchingPPOMDataInProgress && (
        <BlockaidLoadingIndicator
          title={strings('blockaid_banner.setup_complete')}
          description={strings('blockaid_banner.setup_complete_description')}
          iconName={IconName.CopySuccess}
          iconColor={IconColor.Success}
        />
      )} */}
    </BottomSheet>
  );
};

export default BlockaidIndicator;
