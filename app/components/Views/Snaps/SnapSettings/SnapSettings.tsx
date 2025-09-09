///: BEGIN:ONLY_INCLUDE_IF(external-snaps,keyring-snaps)
import React, { useCallback, useEffect, useState } from 'react';
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
import type { StackScreenProps , StackNavigationProp } from '@react-navigation/stack';
import type { RootParamList , NavigatableRootParamList } from '../../../../util/navigation/types';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { useNavigation } from '@react-navigation/native';
import { SnapDetails } from '../components/SnapDetails';
import { SnapDescription } from '../components/SnapDescription';
import { SnapPermissions } from '../components/SnapPermissions';
import { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../hooks/useStyles';
import { useSelector } from 'react-redux';
import {
  SNAP_SETTINGS_REMOVE_BUTTON,
  SNAP_SETTINGS_SCROLLVIEW,
} from './SnapSettings.constants';
import { selectPermissionControllerState } from '../../../../selectors/snaps/permissionController';
import KeyringSnapRemovalWarning from '../KeyringSnapRemovalWarning/KeyringSnapRemovalWarning';
import { getAccountsBySnapId } from '../../../../core/SnapKeyring/utils/getAccountsBySnapId';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Logger from '../../../../util/Logger';
import { areAddressesEqual } from '../../../../util/address';
type SnapSettingsProps = StackScreenProps<RootParamList, 'SnapSettings'>;

const SnapSettings = ({ route }: SnapSettingsProps) => {
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;
  const navigation =
    useNavigation<
      StackNavigationProp<NavigatableRootParamList, 'SnapSettings'>
    >();

  const { snap } = route.params;
  const permissionsState = useSelector(selectPermissionControllerState);

  const [
    isShowingSnapKeyringRemoveWarning,
    setIsShowingSnapKeyringRemoveWarning,
  ] = useState(false);

  const [keyringAccounts, setKeyringAccounts] = useState<InternalAccount[]>([]);
  const internalAccounts = useSelector(selectInternalAccounts);

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

  const isKeyringSnap = Boolean(permissionsFromController?.snap_manageAccounts);

  useEffect(() => {
    if (isKeyringSnap) {
      (async () => {
        const addresses = await getAccountsBySnapId(snap.id);
        const snapIdentities = Object.values(internalAccounts).filter(
          (internalAccount) =>
            addresses.some((address) =>
              areAddressesEqual(address, internalAccount.address),
            ),
        );
        setKeyringAccounts(snapIdentities);
      })();
    }
  }, [snap?.id, internalAccounts, isKeyringSnap]);

  const handleKeyringSnapRemovalWarningClose = useCallback(() => {
    setIsShowingSnapKeyringRemoveWarning(false);
  }, []);

  const removeSnap = useCallback(async () => {
    const { SnapController } = Engine.context;
    await SnapController.removeSnap(snap.id);

    if (isKeyringSnap && keyringAccounts.length > 0) {
      try {
        for (const keyringAccount of keyringAccounts) {
          await Engine.removeAccount(keyringAccount.address);
        }
      } catch (error) {
        Logger.error(
          error as Error,
          'SnapSettings: failed to remove snap accounts when calling Engine.removeAccount',
        );
      }
    }
    navigation.goBack();
  }, [isKeyringSnap, keyringAccounts, navigation, snap.id]);

  const handleRemoveSnap = useCallback(() => {
    if (isKeyringSnap && keyringAccounts.length > 0) {
      setIsShowingSnapKeyringRemoveWarning(true);
    } else {
      removeSnap();
    }
  }, [isKeyringSnap, keyringAccounts.length, removeSnap]);

  const handleRemoveSnapKeyring = useCallback(() => {
    try {
      setIsShowingSnapKeyringRemoveWarning(true);
      removeSnap();
      setIsShowingSnapKeyringRemoveWarning(false);
    } catch {
      setIsShowingSnapKeyringRemoveWarning(false);
    } finally {
      setIsShowingSnapKeyringRemoveWarning(false);
    }
  }, [removeSnap]);

  const shouldRenderRemoveSnapAccountWarning =
    isShowingSnapKeyringRemoveWarning &&
    isKeyringSnap &&
    keyringAccounts.length > 0;

  return (
    <>
      <SafeAreaView style={styles.snapSettingsContainer}>
        <ScrollView testID={SNAP_SETTINGS_SCROLLVIEW}>
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
              onPress={handleRemoveSnap}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
      {shouldRenderRemoveSnapAccountWarning && (
        <KeyringSnapRemovalWarning
          snap={snap}
          onCancel={handleKeyringSnapRemovalWarningClose}
          onClose={handleKeyringSnapRemovalWarningClose}
          onSubmit={handleRemoveSnapKeyring}
          keyringAccounts={keyringAccounts}
        />
      )}
    </>
  );
};

export default React.memo(SnapSettings);
///: END:ONLY_INCLUDE_IF
