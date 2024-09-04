import React, { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';

import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';
import type { ThemeTypography } from '@metamask/design-tokens/dist/types/js/typography';
import { SDKSelectorsIDs } from '../../../../../e2e/selectors/Settings/SDK.selectors';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { isMutichainVersion1Enabled } from '../../../../util/networks';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import PermissionItem from './PermissionItem';
import mockPermissionItems from './PermissionItem/PermissionItem.constants';
import { NavigationProp, ParamListBase } from '@react-navigation/native';

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

  useEffect(() => {
    const { navigation } = props;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.permissions_title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [props, colors]);

  const renderPermissions = useCallback(
    () => (
      <>
        <ScrollView>
          {
            /* TODO: replace mock data with real data once available */
            isMutichainVersion1Enabled &&
              mockPermissionItems.map((mockPermissionItem, _index) => (
                <PermissionItem key={`${_index}`} item={mockPermissionItem} />
              ))
          }
        </ScrollView>
      </>
    ),
    [],
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
      {isMutichainVersion1Enabled && mockPermissionItems.length
        ? renderPermissions()
        : renderEmptyResult()}
    </View>
  );
};
export default PermissionsManager;
