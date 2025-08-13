import SecureKeychain from '../../../../SecureKeychain';

const REWARDS_TOKEN_KEY = 'REWARDS_ACCESS_TOKEN';

const scopeOptions = {
  service: `com.metamask.${REWARDS_TOKEN_KEY}`,
  accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface RewardsTokenResponse {
  success: boolean;
  token?: string;
  error?: string;
}

interface RewardsTokenData {
  accessToken: string;
}

export async function storeRewardsToken(
  accessToken: string,
): Promise<RewardsTokenResponse> {
  try {
    const tokenData: RewardsTokenData = {
      accessToken,
    };

    const stringifiedToken = JSON.stringify(tokenData);

    const storeResult = await SecureKeychain.setSecureItem(
      REWARDS_TOKEN_KEY,
      stringifiedToken,
      scopeOptions,
    );

    if (storeResult === false) {
      return {
        success: false,
        error: 'Failed to store rewards token',
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export async function getRewardsToken(): Promise<RewardsTokenResponse> {
  try {
    const secureItem = await SecureKeychain.getSecureItem(scopeOptions);

    if (secureItem) {
      const tokenData: RewardsTokenData = JSON.parse(secureItem.value);

      return {
        success: true,
        token: tokenData.accessToken,
      };
    }

    return {
      success: false,
      error: 'No token found',
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

export async function resetRewardsToken(): Promise<void> {
  await SecureKeychain.clearSecureScope(scopeOptions);
}
