import { RootState } from '../reducers';

export const selectFollowingProfileIds = (state: RootState): string[] =>
  // SocialController is in EngineState but not in the narrower selectors/types.ts stub
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (state?.engine?.backgroundState as any)?.SocialController
    ?.followingProfileIds ?? [];
