import React, { useRef, useEffect, useState } from 'react';
import { View, InteractionManager, Pressable } from 'react-native';
import SheetHeader from '../../../../../component-library/components/Sheet/SheetHeader';
import { SheetBottomRef } from '../../../../../component-library/components/Sheet/SheetBottom';
import Button from '../../../../../component-library/components/Buttons/Button/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text from '../../../../../component-library/components/Texts/Text/Text';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useSelector, useDispatch } from 'react-redux';
import AnalyticsV2 from '../../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../../locales/i18n';
import { Props } from './../ExperimentalSettings.types';
import createStyles from './BlockaidIndicator.styles';
import { selectIsSecurityAlertsEnabled } from '../../../../../selectors/preferencesController';

enum Status {
  Idle = 'IDLE',
  Loading = 'LOADING',
}

const BlockaidIndicator = ({ navigation }: Props) => {
  const dispatch = useDispatch();
  const { PreferencesController } = Engine.context;
  const styles = createStyles();

  const securityAlertsEnabled = useSelector(selectIsSecurityAlertsEnabled);
  const [sheetInteractable, setSheetInteractable] = useState(true);
  const [status, setStatus] = useState<Status>(Status.Idle);
  const sheetRef = useRef<SheetBottomRef>(null);

  const ppomInitialisationCompleted = useSelector(
    (state: any) => state.experimentalSettings.ppomInitializationCompleted,
  );

  useEffect(() => {
    if (ppomInitialisationCompleted) {
      setSheetInteractable(true);
    }
  }, [ppomInitialisationCompleted]);

  const goBackToExperimentalScreen = () => {
    setStatus(Status.Idle);
    navigation.navigate(Routes.SETTINGS.EXPERIMENTAL_SETTINGS);
  };

  const continueBlockaidInitialisation = () => {
    PreferencesController?.setSecurityAlertsEnabled(!securityAlertsEnabled);
    setSheetInteractable(false);
    dispatch({
      type: 'SET_PPOM_INITIALIZATION_COMPLETED',
      ppomInitializationCompleted: false,
    });
    setStatus(Status.Loading);

    InteractionManager.runAfterInteractions(() => {
      AnalyticsV2.trackEvent(
        MetaMetricsEvents.SETTINGS_EXPERIMENTAL_SECURITY_ALERTS_ENABLED,
        {
          security_alerts_enabled: true,
        },
      );
    });
  };

  return (
    <BottomSheet ref={sheetRef} isInteractable={sheetInteractable}>
      {status === Status.Idle && (
        <View style={styles.blockaidWrapper}>
          <View style={styles.iconWrapper}>
            <View style={styles.iconContainer}>
              <Icon
                name={IconName.Danger}
                size={IconSize.Xl}
                color={IconColor.Warning}
                style={styles.iconStyle}
              />
            </View>
          </View>

          <SheetHeader title={strings('blockaid_banner.before_you_proceed')} />
          <Text variant={TextVariant.BodyMD}>
            {strings('blockaid_banner.enable_blockaid_alerts')}
          </Text>
          <View style={styles.buttonWrapper}>
            <Button
              variant={ButtonVariants.Secondary}
              label={strings('blockaid_banner.cancel')}
              size={ButtonSize.Md}
              onPress={goBackToExperimentalScreen}
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
        </View>
      )}

      {status === Status.Loading && !ppomInitialisationCompleted && (
        <View style={styles.blockaidWrapper}>
          <View style={styles.iconWrapper}>
            <View style={styles.iconContainer}>
              <Icon
                name={IconName.Setting}
                size={IconSize.Xl}
                color={IconColor.Primary}
                style={styles.iconStyle}
              />
            </View>
          </View>

          <SheetHeader title={strings('blockaid_banner.setting_up_alerts')} />
          <Text variant={TextVariant.BodyMD}>
            {strings('blockaid_banner.setting_up_alerts_description')}
          </Text>
        </View>
      )}

      {ppomInitialisationCompleted && (
        <View style={styles.blockaidWrapper}>
          <View style={styles.iconWrapper}>
            <View style={styles.iconContainer}>
              <Icon
                name={IconName.Confirmation}
                size={IconSize.Xl}
                color={IconColor.Success}
                style={styles.iconStyle}
              />
            </View>
            <Pressable
              style={styles.goBackIcon}
              onPress={goBackToExperimentalScreen}
            >
              <Icon name={IconName.Close} color={IconColor.Alternative} />
            </Pressable>
          </View>

          <SheetHeader title={strings('blockaid_banner.setup_complete')} />
          <Text variant={TextVariant.BodyMD}>
            {strings('blockaid_banner.setup_complete_description')}
          </Text>
        </View>
      )}
    </BottomSheet>
  );
};

export default BlockaidIndicator;
