import type { ThemeColors, ThemeTypography } from '@metamask/design-tokens';
import React, { useEffect, useState } from 'react';
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
import { Button, ButtonVariant } from '@metamask/design-system-react-native';
import Text from '../../../../component-library/components/Texts/Text';
import { ConnectionProps } from '../../../../core/SDKConnect/Connection';
import { useTheme } from '../../../../util/theme';
import getSharedStyles from './getSharedStyles';

interface SDKSessionViewProps {
  connection: {
    id: ConnectionProps['id'];
    originatorInfo?: ConnectionProps['originatorInfo'];
  };
  connected?: boolean;
  onDisconnect: (channelId: string) => void;
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
      marginBottom: 20,
    },
    ...getSharedStyles(colors, typography, _safeAreaInsets),
  });

export const SDKSessionAccountListItem = ({
  connection,
  connected = false,
  onDisconnect,
}: SDKSessionViewProps) => {
  const safeAreaInsets = useSafeAreaInsets();
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography, safeAreaInsets);
  const [sessionName, setSessionName] = useState('');
  const [icon, setIcon] = useState<string>();

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

    if (title?.length > 0) {
      _sessionName = title;
    } else if (url?.length > 0) {
      _sessionName = url;
    }

    if (_icon && _icon?.length > 0) {
      setIcon(_icon);
    }

    setSessionName(_sessionName);
  }, [connection.originatorInfo, connection.id]);

  return (
    <View style={styles.container}>
      <BadgeWrapper
        badgeElement={
          connected ? (
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
      <Text style={styles.dappName}>{sessionName}</Text>
      <Button
        variant={ButtonVariant.Tertiary}
        onPress={() => onDisconnect(connection.id)}
      >
        {strings('sdk.manage')}
      </Button>
    </View>
  );
};

export default SDKSessionAccountListItem;
