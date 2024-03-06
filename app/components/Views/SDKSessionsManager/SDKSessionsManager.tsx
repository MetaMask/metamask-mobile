import { StackNavigationProp } from '@react-navigation/stack';
import React, { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';

import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';
import type { ThemeTypography } from '@metamask/design-tokens/dist/types/js/typography';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Button, {
  ButtonVariants,
} from '../../../../app/component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
} from '../../../../app/component-library/components/Icons/Icon';
import Text, {
  TextVariant,
} from '../../../../app/component-library/components/Texts/Text';
import Routes from '../../../../app/constants/navigation/Routes';
import { RootState } from '../../../../app/reducers';
import { SDKSelectorsIDs } from '../../../../e2e/selectors/Settings/SDK.selectors';
import { getNavigationOptionsTitle } from '../../../components/UI/Navbar';
import SDKSessionItem from './SDKSessionItem';

interface SDKSessionsManagerProps {
  navigation: StackNavigationProp<any>;
}

const createStyles = (
  colors: ThemeColors,
  _typography: ThemeTypography,
  _safeAreaInsets: EdgeInsets,
) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 24,
      marginBottom: 24,
    },
    modalView: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    btnAction: {
      width: '100%',
    },
    centerAlign: {
      textAlign: 'center',
    },
    disconnectAllContainer: {},
  });

const SDKSessionsManager = (props: SDKSessionsManagerProps) => {
  const safeAreaInsets = useSafeAreaInsets();
  const route =
    useRoute<RouteProp<{ params: { trigger?: number } }, 'params'>>();

  const { connections, androidConnections } = useSelector(
    (state: RootState) => state.sdk,
  );
  const connectionsList = Object.values(connections);
  const androidConnectionsList = Object.values(androidConnections);
  const { trigger } = route.params ?? { trigger: undefined };
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography, safeAreaInsets);

  const { navigate } = useNavigation();

  const toggleClearMMSDKConnectionModal = useCallback(() => {
    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SDK_DISCONNECT,
    });
  }, [navigate]);

  useEffect(() => {
    const { navigation } = props;
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.manage_sdk_connections_title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [props, colors]);

  const renderSDKSessions = useCallback(
    () => (
      <>
        <ScrollView>
          {connectionsList.map((sdkSession, _index) => (
            <SDKSessionItem
              key={sdkSession.id}
              trigger={trigger}
              connection={sdkSession}
            />
          ))}
          {androidConnectionsList.map((androidSession, _index) => (
            <SDKSessionItem
              key={`${_index}_${androidSession.id}`}
              connection={androidSession}
            />
          ))}
        </ScrollView>
        <View style={styles.disconnectAllContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            label={strings('sdk.disconnect_all')}
            style={styles.btnAction}
            onPress={() => {
              toggleClearMMSDKConnectionModal();
            }}
          />
        </View>
      </>
    ),
    [
      connectionsList,
      trigger,
      androidConnectionsList,
      styles,
      toggleClearMMSDKConnectionModal,
    ],
  );

  const renderEmptyResult = () => (
    <View style={styles.emptyContainer}>
      <Icon name={IconName.Global} size={IconSize.Xl} />
      <Text variant={TextVariant.HeadingSM}>
        {strings('sdk.no_connections')}
      </Text>
      <Text variant={TextVariant.BodyMD} style={styles.centerAlign}>
        {strings('sdk.no_connections_desc')}
      </Text>
    </View>
  );

  return (
    <View
      style={styles.wrapper}
      testID={SDKSelectorsIDs.SESSION_MANAGER_CONTAINER}
    >
      {connectionsList.length + androidConnectionsList.length > 0
        ? renderSDKSessions()
        : renderEmptyResult()}
    </View>
  );
};
export default SDKSessionsManager;
