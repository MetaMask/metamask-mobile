import React, { useCallback, useEffect } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';

import Engine from '../../../../core/Engine';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../component-library/components/Buttons/Button';

import { createStyles } from './styles';
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

interface SnapSettingsProps {
  snap: Snap;
}

export const createSnapSettingsNavDetails =
  createNavigationDetails<SnapSettingsProps>(Routes.SNAPS.SNAP_SETTINGS);

const SnapSettings = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
          <SnapPermissions
            permissions={snap.initialPermissions}
            installedAt={snap.versionHistory[0].date}
          />
        </View>
        <View style={styles.removeSection}>
          <Text variant={TextVariant.HeadingMD}>Remove Snap</Text>
          <Text variant={TextVariant.BodyMD}>
            {strings('app_settings.snaps.snap_settings.remove_snap_section')}
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
