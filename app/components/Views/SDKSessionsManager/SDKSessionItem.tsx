import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';
import type { ThemeTypography } from '@metamask/design-tokens/dist/types/js/typography';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TextStyle, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarSize } from '../../../../app/component-library/components/Avatars/Avatar';
import AvatarFavicon from '../../../../app/component-library/components/Avatars/Avatar/variants/AvatarFavicon';
import AvatarToken from '../../../../app/component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeStatusState,
  BadgeVariant,
} from '../../../../app/component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../app/component-library/components/Badges/BadgeWrapper';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../app/component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../app/component-library/components/Texts/Text';
import Routes from '../../../../app/constants/navigation/Routes';
import { getPermittedAccounts } from '../../../../app/core/Permissions';
import { ConnectionProps } from '../../../../app/core/SDKConnect/Connection';
import { strings } from '../../../../locales/i18n';
import DevLogger from '../../../core/SDKConnect/utils/DevLogger';
import { useTheme } from '../../../util/theme';

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
    icon: {
      height: 24,
      width: 24,
      borderRadius: 12,
      borderWidth: 1,
    },
    iconText: {
      ...typography.sHeadingSMRegular,
      textAlign: 'center',
    } as TextStyle,
    dappName: {
      flexShrink: 1,
      flexGrow: 1,
      marginLeft: 5,
      marginRight: 5,
      flexWrap: 'wrap',
    },
    disconnectContainer: {
      borderColor: colors.error.default,
      alignItems: 'center',
      height: 24,
      width: 120,
      paddingLeft: 10,
      paddingRight: 10,
    },
    disconnectFont: {
      ...typography.sHeadingSMRegular,
      color: colors.error.default,
    } as TextStyle,
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

  DevLogger.log(
    `Rendering SDKSessionItem connected=${connection.connected} ${connection.id}`,
  );
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
