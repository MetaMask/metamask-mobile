import {
  LeaderboardParams,
  LeaderboardResponse,
  TraderProfile,
} from '../types';

const CLICKER_API_BASE_URL = 'https://api.clicker.xyz';
const LEADERBOARD_ENDPOINT = '/v1/leaderboard';
const PROFILE_ENDPOINT = '/v1/addresses';

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
   * @returns Promise resolving to array of traders
   */
  async getTopTraders(limit = 50) {
    const response = await this.fetchLeaderboard({ limit });

    // Return traders from the first section (overall leaderboard)
    if (response.sections.length > 0) {
      // Combine commenters and others, prioritizing commenters
      const section = response.sections[0];
      return [...section.commenters, ...section.others];
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
}

export default new LeaderboardService();
