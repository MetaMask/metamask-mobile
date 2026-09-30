import type {
  ConnectXParams,
  CreateProfileParams,
  CreateProfileResponse,
  ProfileApiResponse,
  ProfileServiceMessenger,
  ReplaceProfileParams,
  UpdateProfileParams,
  UsernameAvailabilityResponse,
  XAccountResponse,
  XAuthUrlResponse,
  XConnectResponse,
} from '@metamask/profile-controller';

const MOCK_TIMESTAMP = '2026-01-01T00:00:00.000Z';

/**
 * X redirect the onboarding listener already understands.
 * `state` matches {@link MockProfileService.getXAuthUrl}.
 */
export const MOCK_X_AUTH_URL =
  'metamask://profile/x?code=mock-code&state=mock-x-state';

const MOCK_X_ACCOUNT: XConnectResponse = {
  x_user_id: 'mock-x-user',
  x_profile_url: 'https://x.com/giga-whale',
  username: 'giga-whale',
  display_name: 'Giga Whale',
  avatar_url: '',
  created_at: MOCK_TIMESTAMP,
  updated_at: MOCK_TIMESTAMP,
};

const defaultProfile = (profileId: string): ProfileApiResponse => ({
  profile_id: profileId,
  username: 'giga-whale',
  display_name: 'Giga Whale',
  bio: 'Trading in the open. Copy my moves or fade them, either way we learn.',
  linked_addresses: [],
  avatar_url: null,
  trading_privacy: 'public',
  connected_to_x: true,
  created_at: MOCK_TIMESTAMP,
  updated_at: MOCK_TIMESTAMP,
});

const METHOD_NAMES = [
  'getProfile',
  'createProfile',
  'replaceProfile',
  'updateProfile',
  'deleteProfile',
  'checkUsernameAvailability',
  'getXAuthUrl',
  'connectX',
  'getXAccount',
] as const;

/**
 * In-memory stand-in for {@link ProfileService} while `profile.api.cx.metamask.io`
 * is not live.
 *
 * Method names, parameters, and response shapes match the real service, and
 * the same messenger actions are registered. `profile-service-init` is the
 * only place that chooses this class instead of `ProfileService`.
 */
export class MockProfileService {
  readonly name = 'ProfileService' as const;

  #profile: ProfileApiResponse | null = null;

  #xProfile: XConnectResponse | null = null;

  constructor({ messenger }: { messenger: ProfileServiceMessenger }) {
    messenger.registerMethodActionHandlers(this, METHOD_NAMES);
  }

  /**
   * Returns the created profile, or the Giga Whale fixture in the API schema.
   *
   * @param profileId - Profile id from the caller. Used when nothing has been created yet.
   * @returns A profile response.
   */
  async getProfile(profileId: string): Promise<ProfileApiResponse> {
    return this.#profile ?? defaultProfile(profileId);
  }

  /**
   * Stores a profile and returns it in the create-response schema.
   *
   * @param params - The same body `ProfileController.createProfile` sends.
   * @returns The created profile, including `x_profile` when X was linked.
   */
  async createProfile(
    params: CreateProfileParams,
  ): Promise<CreateProfileResponse> {
    const created = this.#toProfile(params.profile_id, {
      username: params.username,
      display_name: params.display_name,
      bio: params.bio ?? null,
      linked_addresses: params.linked_addresses,
      avatar_url: params.avatar_url ?? null,
      trading_privacy: params.trading_privacy,
    });
    this.#profile = created;
    return {
      ...created,
      ...(this.#xProfile ? { x_profile: this.#xProfile } : {}),
    };
  }

  /**
   * Replaces the stored profile.
   *
   * @param profileId - Profile to replace.
   * @param params - Full replacement body.
   * @returns The replacement in the API schema.
   */
  async replaceProfile(
    profileId: string,
    params: ReplaceProfileParams,
  ): Promise<ProfileApiResponse> {
    const replaced = this.#toProfile(profileId, params);
    this.#profile = replaced;
    return replaced;
  }

  /**
   * Patches the stored profile. Missing fields keep the previous mock values.
   *
   * @param profileId - Profile to update.
   * @param params - Partial update body.
   * @returns The updated profile in the API schema.
   */
  async updateProfile(
    profileId: string,
    params: UpdateProfileParams,
  ): Promise<ProfileApiResponse> {
    const current = this.#profile ?? defaultProfile(profileId);
    const updated = this.#toProfile(profileId, {
      username: params.username ?? current.username,
      display_name: params.display_name ?? current.display_name,
      bio: params.bio === undefined ? current.bio : params.bio,
      linked_addresses: params.linked_addresses ?? current.linked_addresses,
      avatar_url:
        params.avatar_url === undefined
          ? current.avatar_url
          : params.avatar_url,
      trading_privacy: params.trading_privacy ?? current.trading_privacy,
    });
    this.#profile = updated;
    return updated;
  }

  /**
   * Clears the stored profile. The next read falls back to the fixture.
   *
   * @param _profileId - Unused. The mock holds a single signed-in profile.
   */
  async deleteProfile(_profileId: string): Promise<void> {
    this.#profile = null;
    this.#xProfile = null;
  }

  /**
   * Treats every username as available. Local validation still happens in the UI.
   *
   * @param username - Username to check.
   * @returns An availability response for that username.
   */
  async checkUsernameAvailability(
    username: string,
  ): Promise<UsernameAvailabilityResponse> {
    const normalized = username.trim().toLowerCase();
    return {
      username,
      available: true,
      valid: true,
      normalized,
      errors: [],
    };
  }

  /**
   * Returns a PKCE URL and state without calling X.
   *
   * @returns Mock authorization URL and state.
   */
  async getXAuthUrl(): Promise<XAuthUrlResponse> {
    return {
      url: MOCK_X_AUTH_URL,
      state: 'mock-x-state',
    };
  }

  /**
   * Records a linked X account and returns it in the connect response schema.
   *
   * @param _params - OAuth code and state. Accepted so the signature matches the service.
   * @returns The mock X account.
   */
  async connectX(_params: ConnectXParams): Promise<XConnectResponse> {
    this.#xProfile = { ...MOCK_X_ACCOUNT };
    if (this.#profile) {
      this.#profile = { ...this.#profile, connected_to_x: true };
    }
    return this.#xProfile;
  }

  /**
   * Returns the linked X account, or the Giga Whale fixture before connect.
   *
   * @returns An X account response.
   */
  async getXAccount(): Promise<XAccountResponse> {
    return this.#xProfile ?? { ...MOCK_X_ACCOUNT };
  }

  #toProfile(
    profileId: string,
    fields: Pick<
      ProfileApiResponse,
      | 'username'
      | 'display_name'
      | 'bio'
      | 'linked_addresses'
      | 'avatar_url'
      | 'trading_privacy'
    >,
  ): ProfileApiResponse {
    return {
      profile_id: profileId,
      username: fields.username,
      display_name: fields.display_name,
      bio: fields.bio,
      linked_addresses: fields.linked_addresses,
      avatar_url: fields.avatar_url,
      trading_privacy: fields.trading_privacy,
      connected_to_x: this.#xProfile != null,
      created_at: this.#profile?.created_at ?? MOCK_TIMESTAMP,
      updated_at: MOCK_TIMESTAMP,
    };
  }
}
