import { ethers } from 'ethers';
import {
  CardFeature,
  SupportedToken,
} from '../../../../selectors/featureFlagController/card';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { getDecimalChainId } from '../../../../util/networks';
import { LINEA_DEFAULT_RPC_URL } from '../../../../constants/urls';
import {
  BALANCE_SCANNER_ABI,
  BALANCE_SCANNER_CONTRACT_ADDRESS,
  FOXCONNECT_GLOBAL_ADDRESS,
  FOXCONNECT_US_ADDRESS,
  ON_RAMP_API_URL,
} from '../constants';
import Logger from '../../../../util/Logger';
import { CardToken } from '../types';

export class CardholderSDK {
  private cardFeatureFlag: CardFeature;
  private chainId: string | number;

  constructor({
    cardFeatureFlag,
    rawChainId,
  }: {
    cardFeatureFlag: CardFeature;
    rawChainId: `0x${string}` | SupportedCaipChainId;
  }) {
    this.cardFeatureFlag = cardFeatureFlag;
    this.chainId = getDecimalChainId(rawChainId);
  }

  get isCardEnabled(): boolean {
    return this.cardFeatureFlag[`eip155:${this.chainId}`]?.enabled || false;
  }

  get supportedTokens(): SupportedToken[] {
    if (!this.isCardEnabled) {
      return [];
    }

    return this.cardFeatureFlag[`eip155:${this.chainId}`]?.tokens || [];
  }

  get supportedTokensAddresses(): `0x${string}`[] {
    return this.supportedTokens
      .map((token) => token.address)
      .filter((tokenAddress): tokenAddress is `0x${string}` =>
        tokenAddress ? ethers.utils.isAddress(tokenAddress) : false,
      );
  }

  get ethersProvier() {
    // Default RPC URL for LINEA mainnet
    return new ethers.providers.JsonRpcProvider(LINEA_DEFAULT_RPC_URL);
  }

  get balanceScannerInstance() {
    return new ethers.Contract(
      BALANCE_SCANNER_CONTRACT_ADDRESS,
      BALANCE_SCANNER_ABI,
      this.ethersProvier,
    );
  }

  // NOTE: This is a temporary implementation until we have the Platform API ready.
  isCardHolder = async (address: string): Promise<boolean> => {
    if (!this.isCardEnabled) {
      return false;
    }

    try {
      // 1. Check if the address is a card holder by calling the balance scanner contract and verify if the FoxConnect contracts has allowances on supported tokens.
      const spenders = this.supportedTokens.map(() => [
        FOXCONNECT_GLOBAL_ADDRESS,
        FOXCONNECT_US_ADDRESS,
      ]);

      const spendersAllowancesForTokens: [boolean, string][][] =
        await this.balanceScannerInstance.spendersAllowancesForTokens(
          address,
          this.supportedTokensAddresses,
          spenders,
        );

      // 2. If any of the allowances is greater than 0, then the address is a card holder.
      return spendersAllowancesForTokens.some(
        (allowances) =>
          Array.isArray(allowances) &&
          allowances.some(
            ([, allowance]) => !ethers.BigNumber.from(allowance).isZero(),
          ),
      );
    } catch (error) {
      Logger.error(
        error as Error,
        'Failed to check if address is a card holder',
      );
      return false;
    }
  };

  getGeoLocation = async (): Promise<string> => {
    try {
      const url = new URL('geolocation', ON_RAMP_API_URL);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch geolocation');
      }

      return await response.text();
    } catch (error) {
      Logger.error(error as Error, 'Failed to get geolocation');
      return '';
    }
  };

  getSupportedTokensAllowances = async (
    address: string,
  ): Promise<
    {
      address: `0x${string}`;
      usAllowance: ethers.BigNumber;
      globalAllowance: ethers.BigNumber;
    }[]
  > => {
    if (!this.isCardEnabled) {
      throw new Error('Card feature is not enabled for this chain');
    }

    const spenders: string[][] = this.supportedTokensAddresses.map(() => [
      FOXCONNECT_GLOBAL_ADDRESS,
      FOXCONNECT_US_ADDRESS,
    ]);
    const spendersAllowancesForTokens: [boolean, string][][] =
      await this.balanceScannerInstance.spendersAllowancesForTokens(
        address,
        this.supportedTokensAddresses,
        spenders,
      );

    return this.supportedTokens.map((token, index) => {
      const [globalAllowanceTuple, usAllowanceTuple] =
        spendersAllowancesForTokens[index];
      const globalAllowance = ethers.BigNumber.from(globalAllowanceTuple[1]);
      const usAllowance = ethers.BigNumber.from(usAllowanceTuple[1]);

      return {
        address: token.address as `0x${string}`,
        usAllowance,
        globalAllowance,
      };
    });
  };

  getPriorityToken = async (
    address: string,
    nonZeroBalanceTokens?: string[],
  ): Promise<CardToken | null> => {
    if (!this.isCardEnabled) {
      throw new Error('Card feature is not enabled for this chain');
    }

    const approvalInterface = new ethers.utils.Interface([
      'event Approval(address indexed owner,address indexed spender,uint256 value)',
    ]);
    const approvalTopic = approvalInterface.getEventTopic('Approval');
    const ownerTopic = ethers.utils.hexZeroPad(address.toLowerCase(), 32);
    const spenders = [FOXCONNECT_GLOBAL_ADDRESS, FOXCONNECT_US_ADDRESS];
    const spenderTopics = spenders.map((s) =>
      ethers.utils.hexZeroPad(s.toLowerCase(), 32),
    );
    const fromBlock = -500000; // Check from the last 500,000 blocks
    const tokenAddressesList =
      nonZeroBalanceTokens ?? this.supportedTokensAddresses;

    const logsPerToken = await Promise.all(
      tokenAddressesList.map((tokenAddress) =>
        this.ethersProvier
          .getLogs({
            address: tokenAddress,
            fromBlock,
            toBlock: 'latest',
            topics: [approvalTopic, ownerTopic, spenderTopics],
          })
          .then((logs) =>
            logs.map((log) => ({
              ...log,
              tokenAddress,
            })),
          ),
      ),
    );

    const allLogs = logsPerToken.flat();
    if (allLogs.length === 0) return null;

    // sort chronologically
    allLogs.sort((a, b) =>
      a.blockNumber === b.blockNumber
        ? a.logIndex - b.logIndex
        : a.blockNumber - b.blockNumber,
    );

    // find the last non-zero Approval
    for (let i = allLogs.length - 1; i >= 0; i--) {
      const { args } = approvalInterface.parseLog(allLogs[i]);
      const value = args.value as ethers.BigNumber;
      if (!value.isZero()) {
        const match = this.supportedTokens.find(
          (supportedToken) =>
            supportedToken.address?.toLowerCase() ===
            allLogs[i].tokenAddress.toLowerCase(),
        );

        return match ? this.mapSupportedTokenToCardToken(match) : null;
      }
    }

    return null;
  };

  private mapSupportedTokenToCardToken(token: SupportedToken): CardToken {
    return {
      address: token.address as `0x${string}`,
      decimals: token.decimals as number,
      symbol: token.symbol as string,
      name: token.name as string,
    };
  }
}
