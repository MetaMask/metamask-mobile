import {
  LeaderboardParams,
  LeaderboardResponse,
  TraderProfile,
  FeedParams,
  FeedResponse,
  FeedItem,
} from '../types';

const CLICKER_API_BASE_URL = 'https://api.clicker.xyz';
const LEADERBOARD_ENDPOINT = '/v1/leaderboard';
const PROFILE_ENDPOINT = '/v1/addresses';
const FEED_ENDPOINT = '/v1/feed';

/**
 * Service for interacting with the Clicker Leaderboard API
 * @see https://docs.clicker.xyz/api-reference/leaderboard
 */
class LeaderboardService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.CLICKER_API_KEY || '';
  }

  /**
   * Gets the common headers for API requests
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  /**
   * Fetches the leaderboard data from the Clicker API
   * @param params - Optional parameters for the request
   * @returns Promise resolving to the leaderboard response
   */
  async fetchLeaderboard(
    params?: LeaderboardParams,
  ): Promise<LeaderboardResponse> {
    const url = new URL(`${CLICKER_API_BASE_URL}${LEADERBOARD_ENDPOINT}`);

    // Add query parameters
    if (params?.limit) {
      url.searchParams.append('limit', params.limit.toString());
    }

    if (params?.sections) {
      const sections = Array.isArray(params.sections)
        ? params.sections
        : [params.sections];
      sections.forEach((section) => {
        url.searchParams.append('sections', section);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to fetch leaderboard: ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * Fetches a trader's profile by address or profile UUID
   * @see https://docs.clicker.xyz/api-reference/profile
   * @param identifier - Either a Profile UUID or wallet address
   * @returns Promise resolving to the trader profile
   */
  async getTraderProfile(identifier: string): Promise<TraderProfile> {
    const url = `${CLICKER_API_BASE_URL}${PROFILE_ENDPOINT}/${identifier}/profile`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to fetch profile: ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * Fetches the top traders for the overall PnL leaderboard
   * @param limit - Number of traders to fetch (default 50)
   * @param section - Optional section/chain filter (e.g., 'base', 'solana', 'ethereum')
   * @returns Promise resolving to array of traders
   */
  async getTopTraders(limit = 50, section?: string) {
    const response = await this.fetchLeaderboard({
      limit,
      sections: section,
    });

    // Return traders from the first section (overall leaderboard)
    if (response.sections.length > 0) {
      // Combine commenters and others, prioritizing commenters
      const firstSection = response.sections[0];
      return [...firstSection.commenters, ...firstSection.others];
    }

    return [];
  }

  /**
   * Follow one or more target addresses
   * @see https://docs.clicker.xyz/api-reference/follow
   * @param userAddress - The address of the user who wants to follow
   * @param targetAddresses - Array of addresses to follow
   * @returns Promise resolving to the followed profiles
   */
  async followAddress(
    userAddress: string,
    targetAddresses: string[],
  ): Promise<{ targetProfiles: TraderProfile[] }> {
    const url = `${CLICKER_API_BASE_URL}${PROFILE_ENDPOINT}/${userAddress}/follow`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ targets: targetAddresses }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to follow address: ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * Unfollow one or more target addresses
   * @see https://docs.clicker.xyz/api-reference/unfollow
   * @param userAddress - The address of the user who wants to unfollow
   * @param targetAddresses - Array of addresses to unfollow
   * @returns Promise resolving to the unfollowed profiles
   */
  async unfollowAddress(
    userAddress: string,
    targetAddresses: string[],
  ): Promise<{ targetProfiles: TraderProfile[] }> {
    const url = `${CLICKER_API_BASE_URL}${PROFILE_ENDPOINT}/${userAddress}/follow`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
      body: JSON.stringify({ targets: targetAddresses }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to unfollow address: ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * Get the full profiles of traders that the given address follows
   * @see https://docs.clicker.xyz/api-reference/profile-follows
   * @param userAddress - The address to get follows for
   * @returns Promise resolving to array of followed trader profiles
   */
  async getFollowingProfiles(userAddress: string): Promise<TraderProfile[]> {
    const url = `${CLICKER_API_BASE_URL}${PROFILE_ENDPOINT}/${userAddress}/follows`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          `Failed to fetch following profiles: ${response.status}`,
      );
    }

    const data = await response.json();
    // The API returns data in "items" array, not "profiles"
    return data.items ?? data.profiles ?? [];
  }

  /**
   * Check if the user is following a specific trader
   * Checks both profile ID and wallet addresses for a match
   * @param userAddress - The user's address
   * @param traderId - The trader's profile ID
   * @param traderAddresses - Optional array of trader's wallet addresses
   * @returns Promise resolving to boolean indicating if following
   */
  async isFollowing(
    userAddress: string,
    traderId: string,
    traderAddresses?: string[],
  ): Promise<boolean> {
    try {
      const followedProfiles = await this.getFollowingProfiles(userAddress);

      // Check if any followed profile matches by ID
      const matchById = followedProfiles.some(
        (profile) => profile.id === traderId,
      );
      if (matchById) {
        return true;
      }

      // Check if any followed profile has a matching address
      if (traderAddresses && traderAddresses.length > 0) {
        const lowerTraderAddresses = traderAddresses.map((a) =>
          a.toLowerCase(),
        );
        const matchByAddress = followedProfiles.some((profile) =>
          profile.addresses?.some((addr) =>
            lowerTraderAddresses.includes(addr.toLowerCase()),
          ),
        );
        if (matchByAddress) {
          return true;
        }
      }

      return false;
    } catch {
      // If we can't fetch follows, assume not following
      return false;
    }
  }

  /**
   * Fetches the feed/trades for specific addresses
   * @see https://docs.clicker.xyz/api-reference/feed
   * @param params - Feed parameters including addresses
   * @returns Promise resolving to the feed response
   */
  async getFeed(params: FeedParams): Promise<FeedResponse> {
    const url = new URL(`${CLICKER_API_BASE_URL}${FEED_ENDPOINT}`);

    // Add addresses as query parameters
    params.addresses.forEach((address) => {
      url.searchParams.append('addresses', address);
    });

    if (params.limit) {
      url.searchParams.append('limit', params.limit.toString());
    }

    if (params.newerThan) {
      url.searchParams.append('newerThan', params.newerThan);
    }

    if (params.olderThan) {
      url.searchParams.append('olderThan', params.olderThan);
    }

    if (params.chains) {
      params.chains.forEach((chain) => {
        url.searchParams.append('chains', chain);
      });
    }

    if (params.onlyWithComments !== undefined) {
      url.searchParams.append(
        'onlyWithComments',
        params.onlyWithComments.toString(),
      );
    }

    if (params.minTradeUsd) {
      url.searchParams.append('minTradeUsd', params.minTradeUsd.toString());
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to fetch feed: ${response.status}`,
      );
    }

    return response.json();
  }

  /**
   * Fetches recent trades for a trader
   * @param addresses - Array of trader's addresses
   * @param limit - Number of trades to fetch (default 5)
   * @param minutesAgo - Only fetch trades from the last N minutes (optional)
   * @returns Promise resolving to array of feed items
   */
  async getRecentTrades(
    addresses: string[],
    limit = 5,
    minutesAgo?: number,
  ): Promise<FeedItem[]> {
    const params: FeedParams = {
      addresses,
      limit,
    };

    if (minutesAgo) {
      const newerThan = new Date(Date.now() - minutesAgo * 60 * 1000);
      params.newerThan = newerThan.toISOString();
    }

    const response = await this.getFeed(params);
    return response.items;
  }
}

export default new LeaderboardService();
