/* eslint-disable react/prop-types */
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import React from 'react';
import { useSelector } from 'react-redux';
import AvatarFavicon from '../../../../component-library/components/Avatars/Avatar/variants/AvatarFavicon';
import { selectTargetSubjectMetadata } from '../../../../selectors/snaps/permissionController';
import BadgeWrapper from '../../../../component-library/components/Badges/BadgeWrapper';
import { BadgePosition } from '../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import AvatarIcon from '../../../../component-library/components/Avatars/Avatar/variants/AvatarIcon';
import {
  IconColor,
  IconName,
} from '../../../..//component-library/components/Icons/Icon';
import AvatarBase from '../../../../component-library/components/Avatars/Avatar/foundation/AvatarBase';
import Text from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './SnapAvatar.styles';
import { RootState } from '../../../../reducers';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';
import { ViewStyle } from 'react-native';

const getAvatarFallbackLetter = (subjectName: string) =>
  subjectName?.match(/[a-z0-9]/iu)?.[0] ?? '?';

export interface SnapAvatarProps {
  snapId: string;
  snapName: string; // TODO: Don't pass this in, derive it in the component instead.
  style?: ViewStyle;
}

export const SnapAvatar: React.FunctionComponent<SnapAvatarProps> = ({
  snapId,
  snapName,
  style,
}) => {
  const { styles } = useStyles(styleSheet, {});

  const subjectMetadata = useSelector((state: RootState) =>
    selectTargetSubjectMetadata(state, snapId),
  );

  const iconUrl = subjectMetadata?.iconUrl;

  const fallbackAvatar = getAvatarFallbackLetter(snapName);

  return (
    <BadgeWrapper
      style={style}
      badgeElement={
        <AvatarIcon
          name={IconName.Snaps}
          iconColor={IconColor.Inverse}
          size={AvatarSize.Md}
          style={styles.badge}
        />
      }
      badgePosition={BadgePosition.BottomRight}
    >
      {iconUrl ? (
        <AvatarFavicon
          style={styles.avatar}
          size={AvatarSize.Xl}
          imageSource={{ uri: iconUrl }}
        />
      ) : (
        <AvatarBase style={styles.fallbackAvatar} size={AvatarSize.Xl}>
          <Text style={styles.fallbackAvatarText}>{fallbackAvatar}</Text>
        </AvatarBase>
      )}
    </BadgeWrapper>
  );
};
///: END:ONLY_INCLUDE_IF
