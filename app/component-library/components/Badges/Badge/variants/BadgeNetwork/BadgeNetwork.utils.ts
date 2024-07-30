import { AvatarSize } from '../../../../Avatars/Avatar';

const getScaledStyles = (
  size: number,
  containerSize: { width: number; height: number } | null,
) => {
  /**
   * Design Requirements for Scaled BadgeNetwork:
   * - The Network Badge needs to be 1/2 the height of its content, up to 1/2 the height
   * of the largest AvatarSize.
   * - It needs to have a 1px stroke on a 16px badge.
   * (Current) Solution:
   * - Use invisible base wrapper and set height to 50% to get the 1/2 height measurement.
   * - Scale content to a scale ratio based on the container size's height.
   * - Set borderWidth to scale with given Network Icon size (always given with default).
   */
  const badgeToContentScaleRatio = 0.5;
  const borderWidthRatio = 1 / 16;
  const borderWidth = Number(size) * borderWidthRatio;

  const currentAvatarSizes = Object.values(AvatarSize).map((avatarSize) =>
    Number(avatarSize),
  );
  const smallestAvatarSize = Math.min(...currentAvatarSizes);
  const largestAvatarSize = Math.max(...currentAvatarSizes);

  let scaleRatio = 1;

  if (containerSize) {
    scaleRatio = containerSize.height / Number(size);
  }

  return {
    minHeight: smallestAvatarSize * badgeToContentScaleRatio,
    maxHeight: largestAvatarSize * badgeToContentScaleRatio,
    height: `${(badgeToContentScaleRatio * 100).toString()}%`,
    scaleRatio,
    borderWidth,
  };
};

export default getScaledStyles;
