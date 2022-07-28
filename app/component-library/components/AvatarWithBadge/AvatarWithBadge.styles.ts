import { StyleSheet } from 'react-native';
import { AvatarBadgePosition } from './AvatarWithBadge.types';

const styleSheet = ({ vars }: any) => {
  const { badgePosition, showBadge } = vars;

  const badgeAbsolutePosition =
    badgePosition === AvatarBadgePosition.TopRight ? { top: 2 } : { bottom: 2 };

  return StyleSheet.create({
    container: { position: 'relative' },
    badge: {
      width: 10,
      height: 10,
      borderWidth: 3,
      borderColor: 'red',
      borderStyle: 'solid',
      backgroundColor: 'red',
      color: 'red',
    },
  });
};

export default styleSheet;
