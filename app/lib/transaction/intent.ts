import { QuoteMetadata } from '@metamask/bridge-controller';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import {
  MessageParamsTypedData,
  SignatureControllerMessenger,
} from '@metamask/signature-controller';
import type { Hex, Json } from '@metamask/utils';
import { keccak256 } from 'ethereumjs-util';
import { CowSwapQuoteResponse } from '../../components/UI/Bridge/types';
import Engine from '../../core/Engine';
import { getSignatureControllerMessenger } from '../../core/Engine/messengers/signature-controller-messenger';

const TYPES_EIP_712_DOMAIN: { name: string; type: string }[] = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

const TYPES_COW_ORDER: Record<string, unknown> = {
  EIP712Domain: TYPES_EIP_712_DOMAIN,
  Order: [
    { name: 'sellToken', type: 'address' },
    { name: 'buyToken', type: 'address' },
    { name: 'receiver', type: 'address' },
    { name: 'sellAmount', type: 'uint256' },
    { name: 'buyAmount', type: 'uint256' },
    { name: 'validTo', type: 'uint32' },
    { name: 'appData', type: 'bytes32' },
    { name: 'feeAmount', type: 'uint256' },
    { name: 'kind', type: 'string' },
    { name: 'partiallyFillable', type: 'bool' },
    { name: 'sellTokenBalance', type: 'string' },
    { name: 'buyTokenBalance', type: 'string' },
  ] as { name: string; type: string }[],
} as const;

export interface CowOrderInput {
  sellToken: Hex;
  buyToken: Hex;
  receiver: Hex;
  sellAmount: string; // uint256 as string
  buyAmount: string; // uint256 as string
  validTo: number; // uint32
  appData: string; // can be JSON string or 0x bytes32
  feeAmount: string; // uint256 as string
  kind: string; // 'sell' | 'buy'
  partiallyFillable: boolean;
  sellTokenBalance: string; // 'erc20'
  buyTokenBalance: string; // 'erc20'
}

export async function signIntent({
  chainId,
  from,
  order,
  verifyingContract,
  messenger,
}: {
  chainId: number;
  from: Hex;
  order: CowOrderInput;
  verifyingContract: Hex;
  messenger: SignatureControllerMessenger;
}): Promise<Hex> {
  const appDataHex = normalizeAppData(order.appData);
  const orderForSign = { ...order, appData: appDataHex } as const;
  const data: MessageParamsTypedData = {
    // Cast to Json-compatible structure for the signature controller
    types: TYPES_COW_ORDER as unknown as Record<string, Json>,
    primaryType: 'Order',
    domain: {
      name: 'Gnosis Protocol',
      version: 'v2',
      chainId: String(chainId),
      verifyingContract,
    },
    message: orderForSign as unknown as Json,
  };

  return (await messenger.call(
    'KeyringController:signTypedMessage',
    {
      from,
      data,
    },
    SignTypedDataVersion.V4,
  )) as Hex;
}

function normalizeAppData(appData: string): Hex {
  if (isBytes32Hex(appData)) {
    return appData as Hex;
  }
  // Hash JSON/string appData to bytes32 per CoW spec
  // Use Buffer for compatibility with keccak256
  const bytes = Buffer.from(appData, 'utf8');
  return keccak256(bytes) as unknown as Hex;
}

function isBytes32Hex(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

export async function handleIntentTransaction(
  quoteResponse: CowSwapQuoteResponse & QuoteMetadata,
  selectedAccountAddress: string | undefined,
) {
  const signatureControllerMessenger = getSignatureControllerMessenger(
    // TODO: fix this type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Engine.controllerMessenger as any,
  );

  const intent = quoteResponse.quote.intent;
  if (intent && intent.protocol === 'cowswap') {
    const accountAddress = selectedAccountAddress;
    if (!accountAddress) {
      throw new Error('Missing selected account for intent signing');
    }

    const chainId = quoteResponse.quote.srcChainId;
    const verifyingContract =
      intent.settlementContract ?? '0x9008D19f58AAbd9eD0D60971565AA8510560ab41';

    const order = intent.order;
    if (
      !order?.sellToken ||
      !order?.buyToken ||
      !order?.validTo ||
      !order?.appData ||
      !order?.feeAmount ||
      !order?.kind
    ) {
      throw new Error('Intent order is missing required fields');
    }
    if (!order.sellAmount && !order.buyAmount) {
      throw new Error('Intent order requires sellAmount or buyAmount');
    }

    const message = {
      sellToken: order.sellToken,
      buyToken: order.buyToken,
      receiver: order.receiver ?? accountAddress,
      sellAmount: order.sellAmount ?? '0',
      buyAmount: order.buyAmount ?? '0',
      validTo: Number(order.validTo),
      appData: order.appData,
      feeAmount: '0',
      kind: order.kind,
      partiallyFillable: Boolean(order.partiallyFillable),
      sellTokenBalance: 'erc20',
      buyTokenBalance: 'erc20',
    };

    const signature = await signIntent({
      chainId: chainId as number,
      from: accountAddress as Hex,
      order: message as unknown as CowOrderInput,
      verifyingContract: verifyingContract as Hex,
      messenger: signatureControllerMessenger,
    });

    const txResult = await Engine.context.BridgeStatusController.submitIntent({
      quoteResponse: {
        ...quoteResponse,
        approval: undefined, // TODO: remove this once approval is optional
      },
      signature,
      accountAddress: accountAddress as Hex,
    });
    return txResult;
  }

  // if not cowswap, throw error
  throw new Error('Intent transaction is not supported');
}
