///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import React, { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { NavigatableRootParamList } from '../../../../util/navigation/types';

import { SnapElement } from '../components/SnapElement';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import stylesheet from './SnapsSettingsList.styles';
import { Snap } from '@metamask/snaps-utils';
import { selectSnaps } from '../../../../selectors/snaps/snapController';

const SnapsSettingsList = () => {
  const navigation =
    useNavigation<
      StackNavigationProp<NavigatableRootParamList, 'SnapsSettingsList'>
    >();
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;
  const snaps = useSelector(selectSnaps);

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
