///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React, { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import { SnapElement } from '../components/SnapElement';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { createNavigationDetails } from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import stylesheet from './SnapsSettingsList.styles';
import { Snap } from '@metamask/snaps-utils';

export const createSnapsSettingsListNavDetails = createNavigationDetails(
  Routes.SNAPS.SNAPS_SETTINGS_LIST,
);

const SnapsSettingsList = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;
  const snaps = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.engine.backgroundState.SnapController.snaps,
  );

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.snaps.title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [colors, navigation, snaps]);

  return (
    <View style={styles.container}>
      <ScrollView>
        {(Object.values(snaps) as Snap[]).map((snap: Snap) => (
          <SnapElement {...snap} key={snap.id} />
        ))}
      </ScrollView>
    </View>
  );
};

export default React.memo(SnapsSettingsList);
///: END:ONLY_INCLUDE_IF
