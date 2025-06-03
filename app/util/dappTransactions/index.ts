import { remove0x } from '@metamask/utils';
import { isBN, hexToBN } from '../number';
import { areAddressesEqual, toFormattedAddress } from '../address';
import Engine from '../../core/Engine';
import TransactionTypes from '../../core/TransactionTypes';
import { strings } from '../../../locales/i18n';
import BN4 from 'bnjs4';
import { estimateGas as controllerEstimateGas } from '../transaction-controller';

interface opts {
  amount?: string;
  data?: string;
  to?: string;
}

interface SelectedAsset {
  address: string;
  decimals: string;
  symbol: string;
}

interface Transaction {
  assetType: string;
  data: string;
  ensRecipient: string | undefined;
  from: string;
  gas: BN4;
  gasPrice: BN4;
  id: string;
  networkClientId: string;
  nonce: string | undefined;
  origin: string;
  paymentRequest: boolean | undefined;
  proposedNonce: number | undefined;
  readableValue: string;
  selectedAsset: SelectedAsset;
  symbol: string;
  to: string;
  transaction: {
    data: string;
    from: string;
    gas: string;
    to: string;
    value: string;
  };
  transactionFromName: string | undefined;
  transactionTo: string | undefined;
  transactionToName: string | undefined;
  transactionValue: string | undefined;
  type: string;
  value: string;
  warningGasPriceHigh: string | undefined;
}

interface EstimatedGas {
  gas: string;
}

/**
 * Estimates gas limit
 *
 * @param {object} opts - Object containing optional attributes object to calculate gas with (amount, data and to)
 * @returns {object} - Object containing gas estimation
 */

export const estimateGas = async (
  opts: opts,
  transaction: Transaction,
): Promise<EstimatedGas> => {
  const { from, networkClientId, selectedAsset } = transaction;
  const {
    amount = transaction.value,
    data = transaction.data,
    to = transaction.to,
  } = opts;

  let estimation;
  try {
    estimation = await controllerEstimateGas(
      {
        value: amount,
        from,
        data,
        to: selectedAsset?.address ? selectedAsset.address : to,
      },
      networkClientId,
    );
  } catch (e) {
    estimation = {
      gas: TransactionTypes.CUSTOM_GAS.DEFAULT_GAS_LIMIT,
    };
  }
  return estimation;
};

/**
 * Validates Ether transaction amount
 *
 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
 */
export const validateEtherAmount = (
  value: BN4,
  from: string,
  allowEmpty = true,
): string | undefined => {
  if (!allowEmpty) {
    if (!value || !from) {
      return strings('transaction.invalid_amount');
    }
    if (value && !isBN(value)) {
      return strings('transaction.invalid_amount');
    }
  }
};

interface ContractBalances {
  [key: string]: string;
}

const getTokenBalance = async (
  from: string,
  selectedAsset: SelectedAsset,
  selectedAddress: string,
  contractBalances: ContractBalances,
): Promise<BN4 | undefined> => {
  const checksummedFrom = toFormattedAddress(from) || '';
  if (
    areAddressesEqual(selectedAddress, from) &&
    contractBalances[selectedAsset.address]
  ) {
    return hexToBN(
      remove0x(contractBalances[selectedAsset.address].toString()),
    );
  }
  try {
    const { AssetsContractController } = Engine.context;
    // TODO: Roundtrip string conversion can be removed when bn.js v4 is superseded with v5
    const contractBalanceForAddress =
      await AssetsContractController.getERC20BalanceOf(
        selectedAsset.address,
        checksummedFrom,
      );
    const contractBalanceForAddressBN = hexToBN(
      contractBalanceForAddress.toString(16),
    );
    return contractBalanceForAddressBN;
  } catch (e) {
    // Don't validate balance if error
  }
};

/**
 * Validates asset (ERC20) transaction amount
 *
 * @param {bool} allowEmpty - Whether the validation allows empty amount or not
 * @returns {string} - String containing error message whether the Ether transaction amount is valid or not
 */
export const validateTokenAmount = async (
  value: BN4,
  gas: BN4,
  from: string,
  selectedAsset: SelectedAsset,
  selectedAddress: string,
  contractBalances: ContractBalances,
  allowEmpty = true,
): Promise<string | undefined> => {
  if (!allowEmpty) {
    if (!value) {
      return strings('transaction.invalid_amount');
    }

    if (!gas) {
      return strings('transaction.invalid_gas');
    }

    if (!from) {
      return strings('transaction.invalid_from_address');
    }

    if (value && !isBN(value)) {
      return strings('transaction.invalid_amount');
    }

    const contractBalanceForAddress = await getTokenBalance(
      from,
      selectedAsset,
      selectedAddress,
      contractBalances,
    );
    if (contractBalanceForAddress?.lt(value)) {
      return strings('transaction.insufficient');
    }
  }
};

export const validateCollectibleOwnership = async (
  address: string,
  tokenId: string,
  selectedAddress: string,
): Promise<string | undefined> => {
  const { AssetsContractController } = Engine.context;

  try {
    const owner = await AssetsContractController.getERC721OwnerOf(
      address,
      tokenId,
    );
    const isOwner = areAddressesEqual(owner, selectedAddress);

    return !isOwner
      ? strings('transaction.invalid_collectible_ownership')
      : undefined;
  } catch (e) {
    return strings('transaction.invalid_collectible_ownership');
  }
};

interface Validations {
  ETH: () => string | undefined;
  ERC20: () => Promise<string | undefined>;
  ERC721: () => Promise<string | undefined | boolean>;
}

type AssetType = keyof Validations;

export const validateAmount = async (
  assetType: AssetType,
  address: string,
  tokenId: string,
  selectedAddress: string,
  transaction: Transaction,
  contractBalances: ContractBalances,
  allowEmpty = true,
) => {
  const { value, from, gas, selectedAsset } = transaction;

  const validations: Validations = {
    ETH: () => validateEtherAmount(value as unknown as BN4, from, allowEmpty),
    ERC20: async () =>
      await validateTokenAmount(
        value as unknown as BN4,
        gas,
        from,
        selectedAsset,
        selectedAddress,
        contractBalances,
        allowEmpty,
      ),
    ERC721: async () =>
      await validateCollectibleOwnership(address, tokenId, selectedAddress),
  };

  return !validations[assetType] ? false : await validations[assetType]();
};

interface GasAnalyticsParams {
  dapp_host_name: string;
  dapp_url: string;
  active_currency: { value: string; anonymous: boolean };
  gas_estimate_type: string;
}

export const getGasAnalyticsParams = (
  transaction: Transaction,
  activeTabUrl: string,
  gasEstimateType: string,
): GasAnalyticsParams | Record<string, never> => {
  try {
    const { selectedAsset, origin } = transaction;
    return {
      dapp_host_name: origin,
      dapp_url: activeTabUrl,
      active_currency: { value: selectedAsset?.symbol, anonymous: true },
      gas_estimate_type: gasEstimateType,
    };
  } catch (error) {
    return {};
  }
};

interface setTransactionObjectReturn {
  type: string;
  transaction: Transaction;
}

type setTransactionObjectType = (
  transaction: Partial<Transaction>,
) => setTransactionObjectReturn;

/**
 * Updates gas and gasPrice in transaction state
 *
 * @param {object} gasLimit - BN object containing gasLimit value
 * @param {object} gasPrice - BN object containing gasPrice value
 * @param {function} setTransactionObject - Sets any attribute in transaction object
 */
export const handleGasFeeSelection = (
  gasLimit: BN4,
  gasPrice: BN4,
  setTransactionObject: setTransactionObjectType,
): void => {
  const transactionObject = {
    gas: gasLimit,
    gasPrice,
  };
  setTransactionObject(transactionObject);
};

/**
 * Updates gas limit of the current transaction object
 *
 */
export const handleGetGasLimit = async (
  transaction: Transaction,
  setTransactionObject: setTransactionObjectType,
): Promise<void> => {
  if (!Object.keys(transaction.selectedAsset).length) return;
  const { gas } = await estimateGas({}, transaction);
  setTransactionObject({ gas: hexToBN(gas) as BN4 });
};
