import { BaseAvatarProps } from './BaseAvatar.types';

const stylesheet = ({ size, style }: BaseAvatarProps) => ({
  container: {
    height: size,
    width: size,
    borderRadius: size / 2,
    overflow: 'hidden',
  },
  ...style,
});

export default stylesheet;
