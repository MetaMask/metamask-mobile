///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderStandard } from '@metamask/design-system-react-native';

import { SnapElement } from '../components/SnapElement';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import stylesheet from './SnapsSettingsList.styles';
import { Snap } from '@metamask/snaps-utils';
import { selectSnaps } from '../../../../selectors/snaps/snapController';
import {
  SNAPS_HEADER_TITLE_PROPS,
  SNAPS_SETTINGS_LIST_BACK_BUTTON,
  SNAPS_SETTINGS_LIST_HEADER,
} from './SnapsSettingsList.constants';

export const createSnapsSettingsListNavDetails = createNavigationDetails(
  Routes.SNAPS.SNAPS_SETTINGS_LIST,
);

const SnapsSettingsList = () => {
  const navigation = useNavigation();
  const { styles } = useStyles(stylesheet, {});
  const snaps = useSelector(selectSnaps);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView edges={{ bottom: 'additive' }} style={styles.container}>
      <HeaderStandard
        title={strings('app_settings.snaps.title')}
        titleProps={SNAPS_HEADER_TITLE_PROPS}
        onBack={handleBack}
        includesTopInset
        testID={SNAPS_SETTINGS_LIST_HEADER}
        backButtonProps={{
          testID: SNAPS_SETTINGS_LIST_BACK_BUTTON,
        }}
      />
      <ScrollView>
        {(Object.values(snaps) as Snap[]).map((snap: Snap) => (
          <SnapElement {...snap} key={snap.id} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default React.memo(SnapsSettingsList);
///: END:ONLY_INCLUDE_IF
