import { NotificationMenuItem } from '../../../../util/notifications/notification-states/types/NotificationMenuItem';
import React, { useMemo } from 'react';
import useStyles from '../List/useStyles';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import { Image } from 'expo-image';

import METAMASK_FOX from '../../../../images/branding/fox.png';
import { View } from 'react-native';

type NotificationIconProps = Pick<
  NotificationMenuItem,
  'image' | 'badgeIcon' | 'isRead'
>;

function MenuIcon(props: NotificationIconProps) {
  const { styles } = useStyles();

  const menuIconStyles = {
    style:
      props.image?.variant === 'square' ? styles.squareLogo : styles.circleLogo,
  };

  const source = useMemo(() => {
    if (!props.image?.url) {
      return METAMASK_FOX;
    }
    if (typeof props.image.url === 'string') {
      return { uri: props.image.url };
    }
    return props.image.url;
  }, [props.image?.url]);

  const imageStyles = useMemo(() => {
    const size = source === METAMASK_FOX ? '80%' : '100%';
    return { width: size, height: size, margin: 'auto' } as const;
  }, [source]);

  return (
    <View style={menuIconStyles.style}>
      <Image source={source} style={imageStyles} />
    </View>
  );
}

function NotificationIcon(props: NotificationIconProps) {
  const { styles } = useStyles();

  return (
    <React.Fragment>
      <View style={styles.itemLogoSize}>
        <BadgeWrapper
          badgePosition={BOTTOM_BADGEWRAPPER_BADGEPOSITION}
          badgeElement={
            <Badge
              variant={BadgeVariant.NotificationsKinds}
              iconName={props.badgeIcon}
            />
          }
          style={styles.badgeWrapper}
        >
          <MenuIcon {...props} />
        </BadgeWrapper>
      </View>
      <View style={props.isRead ? styles.readDot : styles.unreadDot} />
    </React.Fragment>
  );
}

export default NotificationIcon;
