import { BigNumber } from 'bignumber.js';
import { Hex } from '@metamask/utils';
import Engine from '../../../../../core/Engine';

// ERC20 Transfer event topic (keccak256 of "Transfer(address,address,uint256)")
const TRANSFER_EVENT_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

interface TransferEventLog {
  from: string;
  to: string;
  amount: string;
  tokenContract: string;
}

interface TransactionLog {
  address: string;
  topics: string[];
  data: string;
}

/**
 * Fetches the transaction receipt and extracts ERC20 Transfer events from logs.
 *
 * @param txHash - The transaction hash
 * @param chainId - The chain ID (hex)
 * @returns Array of transfer events, or empty array if none found
 */
async function getTransferEventsFromReceipt(
  txHash: string,
  chainId: Hex,
): Promise<TransferEventLog[]> {
  try {
    const { NetworkController } = Engine.context;

    const networkClientId =
      NetworkController.findNetworkClientIdByChainId(chainId);
    if (!networkClientId) {
      return [];
    }

    const networkClient =
      NetworkController.getNetworkClientById(networkClientId);
    if (!networkClient?.provider) {
      return [];
    }

    // Fetch the transaction receipt
    const receipt = (await networkClient.provider.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    })) as { logs?: TransactionLog[] } | null;

    if (!receipt?.logs) {
      return [];
    }

    // Parse Transfer events from logs
    const transfers: TransferEventLog[] = [];

    for (const log of receipt.logs) {
      // Check if this is a Transfer event (topic0 matches)
      if (log.topics[0]?.toLowerCase() !== TRANSFER_EVENT_TOPIC.toLowerCase()) {
        continue;
      }

      // Transfer event has indexed from and to in topics[1] and topics[2]
      // and amount in data
      if (log.topics.length >= 3) {
        const from = '0x' + log.topics[1].slice(26); // Remove padding
        const to = '0x' + log.topics[2].slice(26); // Remove padding
        const amount = new BigNumber(log.data).toString(10);

        transfers.push({
          from,
          to,
          amount,
          tokenContract: log.address,
        });
      }
    }

    return transfers;
  } catch {
    return [];
  }
}

interface ConversionTransfers {
  input: TransferEventLog | null;
  output: TransferEventLog | null;
}

/**
 * Gets the input (first) and output (last) transfers from a conversion transaction's logs.
 * The first transfer is the source token input, the last transfer is the MUSD output.
 *
 * @param txHash - The transaction hash
 * @param chainId - The chain ID (hex)
 * @returns Object with input (first) and output (last) transfer events
 */
export async function getConversionTransfersFromLogs(
  txHash: string,
  chainId: Hex,
): Promise<ConversionTransfers> {
  // Get ALL transfers (no token filter)
  const transfers = await getTransferEventsFromReceipt(txHash, chainId);

  if (transfers.length === 0) {
    return { input: null, output: null };
  }

  return {
    input: transfers[0], // First transfer is the input
    output: transfers[transfers.length - 1], // Last transfer is the output (MUSD)
  };
}
