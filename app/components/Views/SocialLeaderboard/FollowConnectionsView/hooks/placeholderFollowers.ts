import type { FollowerConnection } from './types';

/**
 * Dev-only follower rows until `SocialService:fetchFollowers` is wired into
 * {@link useFollowers}. Keep `useMyProfile.followerCount` in sync with this
 * list length until the profile endpoint owns the count.
 */
export const PLACEHOLDER_FOLLOWERS: FollowerConnection[] = [
  {
    id: 'follower-moon-rabbit',
    username: 'Moon Rabbit',
    handle: 'moon-rabbit.metamask',
    address: '0x1111111111111111111111111111111111111111',
  },
  {
    id: 'follower-hippo-maxi',
    username: 'Hippo Maxi',
    handle: 'hippo-maxi.metamask',
    address: '0x2222222222222222222222222222222222222222',
  },
  {
    id: 'follower-perp-queen',
    username: 'Perp Queen',
    handle: 'perp-queen.metamask',
    address: '0x3333333333333333333333333333333333333333',
  },
  {
    id: 'follower-degen-vibes',
    username: 'Degen Vibes',
    handle: 'degen-vibes.metamask',
    address: '0x4444444444444444444444444444444444444444',
  },
];

export const PLACEHOLDER_FOLLOWER_COUNT = PLACEHOLDER_FOLLOWERS.length;
