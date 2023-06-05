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
import { SNAP_SETTINGS_REMOVE_BUTTON } from '../../../../constants/test-ids';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../hooks/useStyles';

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

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        `${snap.manifest.proposedName}`,
        navigation,
        false,
        colors,
        false,
      ),
    );
  }, [colors, navigation, snap.manifest.proposedName]);

  const removeSnap = useCallback(async () => {
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
          <SnapPermissions snapId={snap.id} />
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
