import { NotificationMenuItem } from '../../../../util/notifications/notification-states/types/NotificationMenuItem';
import React, { useMemo } from 'react';
import useStyles from '../List/useStyles';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import RemoteImage from '../../../../components/Base/RemoteImage';
import METAMASK_FOX from '../../../../images/fox.png';
import { View } from 'react-native';

type NotificationIconProps = Pick<NotificationMenuItem, 'image' | 'badgeIcon'>;

function MenuIcon(props: NotificationIconProps) {
  const { styles } = useStyles();

  const menuIconStyles = {
    style:
      props.image?.variant === 'square' ? styles.squareLogo : styles.circleLogo,
    placeholderStyle:
      props.image?.variant === 'square'
        ? styles.squareLogoPlaceholder
        : styles.circleLogoPlaceholder,
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

  return (
    <RemoteImage
      source={source}
      style={menuIconStyles.style}
      placeholderStyle={menuIconStyles.placeholderStyle}
    />
  );
}

function NotificationIcon(props: NotificationIconProps) {
  const { styles } = useStyles();

  return (
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
  );
}

export default NotificationIcon;
