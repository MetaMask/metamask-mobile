import type { ThemeColors, ThemeTypography } from '@metamask/design-tokens';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../locales/i18n';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import AvatarFavicon from '../../../../component-library/components/Avatars/Avatar/variants/AvatarFavicon';
import AvatarToken from '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeStatusState,
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Routes from '../../../../constants/navigation/Routes';
import { getPermittedAccounts } from '../../../../core/Permissions';
import { ConnectionProps } from '../../../../core/SDKConnect/Connection';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { useTheme } from '../../../../util/theme';
import getSharedStyles from './getSharedStyles';

interface SDKSessionViewProps {
  connection: {
    id: ConnectionProps['id'];
    originatorInfo?: ConnectionProps['originatorInfo'];
    connected?: ConnectionProps['connected'];
  };
  trigger?: number; // used to force refresh fetching permitted accounts
}

const createStyles = (
  colors: ThemeColors,
  typography: ThemeTypography,
  _safeAreaInsets: EdgeInsets,
) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    labelContainer: { flex: 1, paddingLeft: 10 },
    selfCenter: {
      alignSelf: 'center',
    },
    ...getSharedStyles(colors, typography, _safeAreaInsets),
  });

export const SDKSessionItem = ({
  connection,
  trigger,
}: SDKSessionViewProps) => {
  const safeAreaInsets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography, safeAreaInsets);
  const [sessionName, setSessionName] = useState('');
  const [icon, setIcon] = useState<string>();
  const { navigate } = useNavigation();
  const [permittedAccountsAddresses, setPermittedAccountsAddresses] = useState<
    string[]
  >([]);

  useEffect(() => {
    let _sessionName = connection.id;

    const {
      title,
      url,
      icon: _icon,
    } = connection.originatorInfo || {
      title: '',
      url: '',
      icon: '',
    };

    if (url?.length > 0) {
      _sessionName = url;
      // remove protocol from url
      _sessionName = _sessionName.replace(/(^\w+:|^)\/\//, '');
    } else if (title?.length > 0) {
      _sessionName = title;
    }

    if (_icon && _icon?.length > 0) {
      setIcon(_icon);
    }

    getPermittedAccounts(connection.id).then((_accounts) => {
      setPermittedAccountsAddresses(_accounts);
    });

    setSessionName(_sessionName);
  }, [connection, trigger]);

  const onManage = useCallback(() => {
    DevLogger.log(`Manage connection: ${connection.id}`, icon);
    const params = {
      channelId: connection.id,
      icon,
      urlOrTitle: sessionName,
      version: connection.originatorInfo?.apiVersion,
      platform: connection.originatorInfo?.platform,
    };

    navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SDK_MANAGE_CONNECTIONS,
      params,
    });
  }, [connection, navigate, sessionName, icon]);

  return (
    <View style={styles.container}>
      <BadgeWrapper
        style={styles.selfCenter}
        badgeElement={
          connection.connected ? (
            <Badge
              variant={BadgeVariant.Status}
              state={BadgeStatusState.Active}
            />
          ) : undefined
        }
      >
        {icon ? (
          <AvatarFavicon imageSource={{ uri: icon }} />
        ) : (
          <AvatarToken name={sessionName} isHaloEnabled size={AvatarSize.Md} />
        )}
      </BadgeWrapper>
      <View style={styles.labelContainer}>
        <Text variant={TextVariant.BodyLGMedium}>{sessionName}</Text>
        <Text variant={TextVariant.BodyMD}>
          {strings('sdk_session_item.connected_accounts', {
            accountsLength: permittedAccountsAddresses.length,
          })}
        </Text>
      </View>
      <Button
        label={strings('sdk.manage')}
        variant={ButtonVariants.Secondary}
        style={styles.selfCenter}
        size={ButtonSize.Sm}
        onPress={() => onManage()}
      />
    </View>
  );
};

export default SDKSessionItem;
