import { View } from 'react-native';
import { Image } from 'expo-image';
import {
  BadgeIcon,
  IconSize,
  BadgeStatus,
  BadgeStatusStatus,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NotificationMenuItem } from '../../../../util/notifications/notification-states/types/NotificationMenuItem';
import React, {
  type FC,
  type PropsWithChildren,
  useCallback,
  useMemo,
} from 'react';
import useStyles from '../List/useStyles';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import METAMASK_FOX from '../../../../images/branding/fox.png';

export const TEST_IDS = {
  CONTAINER: 'notification-menu-item-icon:container',
  ICON: 'notification-menu-item-icon:icon',
};

type NotificationIconProps = Pick<
  NotificationMenuItem,
  'image' | 'badgeIcon'
> & { isRead: boolean };

function MenuIcon(props: NotificationIconProps) {
  const tw = useTailwind();
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

  return (
    <View style={[menuIconStyles.style, tw`p-1`]} testID={TEST_IDS.ICON}>
      <Image source={source} style={tw`m-auto size-full`} />
    </View>
  );
}

function NotificationIcon(props: NotificationIconProps) {
  const tw = useTailwind();
  const { styles } = useStyles();

  const MaybeBadgeContainer: FC<PropsWithChildren> = useCallback(
    ({ children }) =>
      props.badgeIcon ? (
        <BadgeWrapper
          badgePosition={BOTTOM_BADGEWRAPPER_BADGEPOSITION}
          badgeElement={
            <BadgeIcon
              iconName={props.badgeIcon}
              iconProps={{ size: IconSize.Lg }}
            />
          }
        >
          {children}
        </BadgeWrapper>
      ) : (
        <>{children}</>
      ),
    [props.badgeIcon],
  );

  const statusStyle = useMemo(
    () => (props.isRead ? tw`self-center opacity-0` : tw`self-center`),
    [props.isRead, tw],
  );

  return (
    <View>
      <View style={tw`flex-row gap-1`}>
        <BadgeStatus status={BadgeStatusStatus.New} style={statusStyle} />
        <View style={styles.itemLogoSize} testID={TEST_IDS.CONTAINER}>
          <MaybeBadgeContainer>
            <MenuIcon {...props} />
          </MaybeBadgeContainer>
        </View>
      </View>
    </View>
  );
}

export default NotificationIcon;
