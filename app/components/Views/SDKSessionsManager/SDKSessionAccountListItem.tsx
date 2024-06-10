import type { ThemeColors } from '@metamask/design-tokens/dist/types/js/themes/types';
import type { ThemeTypography } from '@metamask/design-tokens/dist/types/js/typography';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextStyle, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AvatarSize } from '../../../../app/component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../app/component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeStatusState,
  BadgeVariant,
} from '../../../../app/component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../app/component-library/components/Badges/BadgeWrapper';
import { ConnectionProps } from '../../../../app/core/SDKConnect/Connection';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import Text from '../../../../app/component-library/components/Texts/Text';
import AvatarFavicon from '../../../../app/component-library/components/Avatars/Avatar/variants/AvatarFavicon';
import Button, {
  ButtonVariants,
} from '../../../../app/component-library/components/Buttons/Button';

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
        label={strings('sdk.manage')}
        variant={ButtonVariants.Link}
        onPress={() => onDisconnect(connection.id)}
      />
    </View>
  );
};

export default SDKSessionAccountListItem;
