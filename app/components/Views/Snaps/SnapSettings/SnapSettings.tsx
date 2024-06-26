///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React, { useCallback, useEffect } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';

import Engine from '../../../../core/Engine';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';

import stylesheet from './SnapSettings.styles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { Snap } from '@metamask/snaps-utils';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { useNavigation } from '@react-navigation/native';
import { SnapDetails } from '../components/SnapDetails';
import { SnapDescription } from '../components/SnapDescription';
import { SnapPermissions } from '../components/SnapPermissions';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../hooks/useStyles';
import { useSelector } from 'react-redux';
import SNAP_SETTINGS_REMOVE_BUTTON from './SnapSettings.constants';

interface SnapSettingsProps {
  snap: Snap;
}

export const createSnapSettingsNavDetails =
  createNavigationDetails<SnapSettingsProps>(Routes.SNAPS.SNAP_SETTINGS);

const SnapSettings = () => {
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;
  const navigation = useNavigation();

  const { snap } = useParams<SnapSettingsProps>();

  const permissionsState = useSelector(
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state: any) => state.engine.backgroundState.PermissionController,
  );

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getPermissionSubjects(state: any) {
    return state.subjects || {};
  }

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getPermissions(state: any, origin: any) {
    return getPermissionSubjects(state)[origin]?.permissions;
  }

  const permissionsFromController = getPermissions(permissionsState, snap.id);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        `${snap.manifest.proposedName}`,
        navigation,
        false,
        colors,
      ),
    );
  }, [colors, navigation, snap.manifest.proposedName]);

  const removeSnap = useCallback(async () => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { SnapController } = Engine.context as any;
    await SnapController.removeSnap(snap.id);
    navigation.goBack();
  }, [navigation, snap.id]);

  return (
    <SafeAreaView style={styles.snapSettingsContainer}>
      <ScrollView>
        <SnapDetails snap={snap} />
        <View style={styles.itemPaddedContainer}>
          <SnapDescription
            snapName={snap.manifest.proposedName}
            snapDescription={snap.manifest.description}
          />
        </View>
        <View style={styles.itemPaddedContainer}>
          <SnapPermissions permissions={permissionsFromController} />
        </View>
        <View style={styles.removeSection}>
          <Text variant={TextVariant.HeadingMD}>
            {strings(
              'app_settings.snaps.snap_settings.remove_snap_section_title',
            )}
          </Text>
          <Text variant={TextVariant.BodyMD}>
            {strings(
              'app_settings.snaps.snap_settings.remove_snap_section_description',
            )}
          </Text>
          <Button
            testID={SNAP_SETTINGS_REMOVE_BUTTON}
            style={styles.removeButton}
            variant={ButtonVariants.Secondary}
            label={strings(
              'app_settings.snaps.snap_settings.remove_button_label',
              { snapName: snap.manifest.proposedName },
            )}
            isDanger
            width={ButtonWidthTypes.Full}
            onPress={removeSnap}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default React.memo(SnapSettings);
///: END:ONLY_INCLUDE_IF
