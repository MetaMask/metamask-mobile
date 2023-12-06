// Third party dependencies.
import React, { useRef, FC, useCallback, useEffect, useState } from 'react';
import { Platform, View, InteractionManager } from 'react-native';

// External dependencies.
import SheetHeader from '../../../../component-library/components/Sheet/SheetHeader';
import {
  SheetBottomRef,
} from '../../../../component-library/components/Sheet/SheetBottom';
import Button from '../../../../component-library/components/Buttons/Button/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';
import Text from '../../../../component-library/components/Texts/Text/Text';
import {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, { IconSize, IconName, IconColor } from '../../../../component-library/components/Icons/Icon';
import {useSelector, useDispatch} from 'react-redux';
import AnalyticsV2 from '../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';

const PPOMLoading = ({ navigation, route }: any) => {  

  const dispatch = useDispatch();
  const { PreferencesController } = Engine.context;
  const [securityAlertsEnabled, setSecurityAlertsEnabled] = useState(route.params.securityAlertsEnabled);
  const [fetchingPPOMDataInProgress, setFetchingPPOMDataInProgress] = useState(false);
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
    if(securityAlertsEnabled) {
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

  const BlockaidLoadingIndicator = ({title, description}: any) => {
    return (
      <View style={{marginHorizontal: 20}}>
                <Icon
          name={IconName.Danger}
          size={IconSize.Md}
          color={IconColor.Warning}
          style={{alignSelf: 'center', marginTop: 20}}
        />
        <SheetHeader title={title} />
        <Text variant={TextVariant.BodyMD}>{description}</Text>
      </View>
    )
  }

  const ppomInitialisationCompleted = useSelector((state: any) => state.experimentalSettings.ppomInitializationCompleted);

  useEffect(() => {
    if(ppomInitialisationCompleted) {
      setFetchingPPOMDataInProgress(false);
      setIntialisedBlockaid(false);
    }
  }, [ppomInitialisationCompleted]);

  return (
    <BottomSheet ref={sheetRef} isInteractable={false}>
      {intialisedBlockaid && (<>
        <BlockaidLoadingIndicator title={'Before you proceed'} description={'To enable this feature we need to set up some security alert. This page will need to stay open while its being set up. This will take less than a minute to complete.'} />
    <View style={{flexDirection: 'row', justifyContent: 'space-around', marginTop: 20}}>

    <Button
      variant={ButtonVariants.Secondary}
      label='Cancel'
      size={ButtonSize.Md}
      onPress={cancelBlockaidInitialisation}
      width={ButtonWidthTypes.Auto}
      style={{width: 150}}
    />
      <Button
      variant={ButtonVariants.Primary}
      label='Continue'
      size={ButtonSize.Md}
      onPress={continueBlockaidInitialisation}
      width={ButtonWidthTypes.Full}
      style={{width: 150}}
    />
    </View>
      </>)}
      {fetchingPPOMDataInProgress && <BlockaidLoadingIndicator title={'Setting up security alerts'} description={'This will take less than a minute to complete.'} />} 
      
      {(!intialisedBlockaid && !fetchingPPOMDataInProgress) && <BlockaidLoadingIndicator title={'Setting up security alerts'} description={'This will take less than a minute to complete.'} />}
    </BottomSheet>
  );
};

export default PPOMLoading;
