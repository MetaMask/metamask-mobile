import React, { useCallback, useLayoutEffect } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import BasicFunctionalityComponent from '../../../UI/BasicFunctionality/BasicFunctionality';
import ManageNetworksComponent from '../../../UI/ManageNetworks/ManageNetworks';
import styles from './index.styles';
import ProfileSyncingComponent from '../../../../components/UI/ProfileSyncing/ProfileSyncing';
import { useSelector } from 'react-redux';
import { selectIsProfileSyncingEnabled } from '../../../../selectors/notifications';
import { isNotificationsFeatureEnabled } from '../../../../util/notifications';
import { enableProfileSyncing } from '../../../../actions/notification/helpers';
import { RootState } from '../../../../reducers';

const GeneralSettings = () => {
  const navigation = useNavigation();
  const isBasicFunctionalityEnabled = useSelector(
    (state: RootState) => state?.settings?.basicFunctionalityEnabled,
  );
  const isProfileSyncingEnabled = useSelector(selectIsProfileSyncingEnabled);
  const renderBackButton = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Icon name={IconName.ArrowLeft} size={IconSize.Lg} />
      </TouchableOpacity>
    ),
    [navigation],
  );
  const renderTitle = useCallback(
    () => (
      <Text variant={TextVariant.HeadingMD}>
        {strings('default_settings.drawer_general_title')}
      </Text>
    ),
    [],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: renderBackButton,
      headerTitle: renderTitle,
    });
  }, [navigation, renderBackButton, renderTitle]);

  const handleSwitchToggle = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
    });
  };

  const toggleProfileSyncing = async () => {
    if (isProfileSyncingEnabled) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.PROFILE_SYNCING,
      });
    } else {
      await enableProfileSyncing();
    }
  };

  return (
    <ScrollView style={styles.root}>
      <BasicFunctionalityComponent handleSwitchToggle={handleSwitchToggle} />
      {isNotificationsFeatureEnabled() && (
        <ProfileSyncingComponent
          handleSwitchToggle={toggleProfileSyncing}
          isBasicFunctionalityEnabled={isBasicFunctionalityEnabled}
          isProfileSyncingEnabled={isProfileSyncingEnabled}
        />
      )}
      <ManageNetworksComponent />
    </ScrollView>
  );
};

export default GeneralSettings;
