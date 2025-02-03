/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ScrollView, StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

import type { ThemeColors, ThemeTypography } from '@metamask/design-tokens';
import { SDKSelectorsIDs } from '../../../../../e2e/selectors/Settings/SDK.selectors';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { isMultichainVersion1Enabled } from '../../../../util/networks';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import PermissionItem from './PermissionItem';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { RootState } from '../../../../reducers';
import {
  PermissionListItemViewModel,
  PermissionSource,
} from './PermissionItem/PermissionItem.types';
import {
  PermissionControllerState,
  PermissionConstraint,
} from '@metamask/permission-controller';

interface SDKSessionsManagerProps {
  navigation: NavigationProp<ParamListBase>;
}

const createStyles = (
  colors: ThemeColors,
  _typography: ThemeTypography,
  _safeAreaInsets: EdgeInsets,
) =>
  StyleSheet.create({
    perissionsWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginBottom: 24,
    },
    emptyPermissionsContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    description: {
      textAlign: 'center',
    },
  });

const PermissionsManager = (props: SDKSessionsManagerProps) => {
  const safeAreaInsets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography, safeAreaInsets);
  const { navigation } = props;
  const [inAppBrowserPermissions, setInAppBrowserPermissions] = useState<
    PermissionListItemViewModel[]
  >([]);
  const subjects = useSelector(
    (state: RootState) =>
      (
        state.engine.backgroundState
          .PermissionController as PermissionControllerState<PermissionConstraint>
      ).subjects,
  );

  useEffect(() => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const walletConnectRegex = /^https?:\/\//;
    const inAppBrowserSubjects: any[] = [];

    Object.entries(subjects || {}).forEach(([key, value]) => {
      if (key === 'npm:@metamask/message-signing-snap') return;

      if (
        !uuidRegex.test(key) &&
        !walletConnectRegex.test((value as { origin: string }).origin)
      ) {
        inAppBrowserSubjects.push(value);
      }
    });

    const mappedInAppBrowserPermissions: PermissionListItemViewModel[] =
      inAppBrowserSubjects.map((subject) => ({
        dappLogoUrl: '',
        dappHostName: subject.origin,
        numberOfAccountPermissions:
          subject.permissions?.eth_accounts?.caveats?.[0]?.value?.length ?? 0,
        numberOfNetworkPermissions:
          subject.permissions?.['endowment:permitted-chains']?.caveats?.[0]
            ?.value?.length ?? 0,
        permissionSource: PermissionSource.MetaMaskBrowser,
      }));

    const mappedPermissions: PermissionListItemViewModel[] = [
      ...mappedInAppBrowserPermissions,
    ];

    setInAppBrowserPermissions(mappedPermissions);
  }, [subjects]);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.permissions_title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  const goToPermissionsDetails = useCallback(
    (permissionItem: PermissionListItemViewModel) => {
      navigation.navigate('AccountPermissionsAsFullScreen', {
        hostInfo: {
          metadata: {
            origin: permissionItem.dappHostName,
          },
        },
        isRenderedAsBottomSheet: false,
      });
    },
    [navigation],
  );

  const renderPermissions = useCallback(
    () => (
      <>
        <ScrollView>
          {isMultichainVersion1Enabled &&
            inAppBrowserPermissions.map((permissionItem, index) => (
              <PermissionItem
                key={`${index}`}
                item={permissionItem}
                onPress={() => {
                  goToPermissionsDetails(permissionItem);
                }}
              />
            ))}
        </ScrollView>
      </>
    ),
    [goToPermissionsDetails, inAppBrowserPermissions],
  );

  const renderEmptyResult = () => (
    <View style={styles.emptyPermissionsContainer}>
      <Icon name={IconName.Global} size={IconSize.Xl} />
      <Text variant={TextVariant.HeadingSM}>
        {strings('app_settings.no_permissions')}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.description}>
        {strings('app_settings.no_permissions_desc')}
      </Text>
    </View>
  );

  return (
    <View
      style={styles.perissionsWrapper}
      testID={SDKSelectorsIDs.SESSION_MANAGER_CONTAINER}
    >
      {isMultichainVersion1Enabled && inAppBrowserPermissions.length
        ? renderPermissions()
        : renderEmptyResult()}
    </View>
  );
};
export default PermissionsManager;
