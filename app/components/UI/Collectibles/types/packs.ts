/** Pack fields we use from the Collector Crypt API. */
export interface CollectorCryptPack {
  code: string;
  name: string;
  /** Missing when Collector Crypt has no price for the pack. */
  priceUsd: number | null;
  /** False when the pack's machine is closed. */
  isAvailable: boolean;
  /** Remote pack art. Missing until the API is wired. */
  imageUrl?: string;
}

/** "[name] + [othersCount] others" shown under the pack name. */
export interface PackSocialCue {
  name: string;
  othersCount: number;
  avatarAddress: string;
}

/**
 * Everything the Home carousel needs for one pack. The counter (GAC-68) and
 * social cue (GAC-69) will come from other APIs; mocked for now.
 */
export interface HomePack extends CollectorCryptPack {
  openedLast7Days: number;
  socialCue: PackSocialCue | null;
}

/** View model rendered by PackTile. */
export interface PackTileViewModel {
  code: string;
  name: string;
  priceLabel: string;
  counterLabel: string;
  showFlame: boolean;
  socialCue: PackSocialCue | null;
}
