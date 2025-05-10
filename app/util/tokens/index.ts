import { CodefiTokenPricesServiceV2, ContractExchangeRates, fetchTokenContractExchangeRates, TokenListMap } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';

/**
 * Convert token list object to token list array
 */
export const tokenListToArray = (tokenList: TokenListMap) =>
  Object.values(tokenList).map((tokenData) => tokenData);

/**
 * Compare two collectible token ids from.
 *
 * @param unknownTokenId - Collectible token ID with unknow data type.
 * @param stringTokenId - Collectible token ID as string.
 * @returns Boolean indicationg if the ID is the same.
 */
export const compareTokenIds = (
  unknownTokenId: number | string,
  stringTokenId: string,
): boolean => {
  if (typeof unknownTokenId === 'number') {
    return String(unknownTokenId) === stringTokenId;
  }
  return unknownTokenId === stringTokenId;
};

/**
 * Retrieves token prices
 *
 * @param {string} nativeCurrency - native currency to fetch prices for.
 * @param {Hex[]} tokenAddresses - set of contract addresses
 * @param {Hex} chainId - current chainId
 * @returns The prices for the requested tokens.
 */
const fetchTokenExchangeRates = async (
  nativeCurrency: string,
  tokenAddresses: Hex[],
  chainId: Hex,
) => {
  try {
    return await fetchTokenContractExchangeRates({
      tokenPricesService: new CodefiTokenPricesServiceV2(),
      nativeCurrency,
      tokenAddresses,
      chainId,
    });
  } catch (err) {
    return {};
  }
};

export async function fetchTokenFiatRates(
  fiatCurrency: string,
  erc20TokenAddresses: Hex[],
  chainId: Hex,
): Promise<ContractExchangeRates> {
  const tokenRates = await fetchTokenExchangeRates(
    fiatCurrency,
    erc20TokenAddresses,
    chainId,
  );

  return Object.fromEntries(
    Object.entries(tokenRates).map(([address, rate]) => [
      address.toLowerCase(),
      rate,
    ]),
  );
}
