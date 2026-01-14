import { SignTypedDataVersion } from '@metamask/keyring-controller';
import {
  MessageParamsTypedData,
  SignatureControllerMessenger,
} from '@metamask/signature-controller';
import type { Hex, Json } from '@metamask/utils';
import { bufferToHex, keccak256 } from 'ethereumjs-util';
import { BridgeQuoteResponse } from '../../components/UI/Bridge/types';
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

export interface IntentOrderInput {
  // TODO: align bridge controller types so we don't have to allow string here
  sellToken: string;
  buyToken: string;
  receiver: string;
  sellAmount: string; // uint256 as string
  buyAmount: string; // uint256 as string
  validTo: number; // uint32
  appData: string; // can be JSON string or 0x bytes32
  appDataHash: string; // hash of appData for EIP-712 signing
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
  from: string;
  order: IntentOrderInput;
  verifyingContract: string;
  messenger: SignatureControllerMessenger;
}): Promise<string> {
  const appDataHex = normalizeAppData(order.appData);
  const orderForSign = { ...order, appData: appDataHex } as const;
  const data: MessageParamsTypedData = {
    // Cast to Json-compatible structure for the signature controller
    types: TYPES_COW_ORDER as unknown as Record<string, Json>,
    primaryType: 'Order',
    domain: {
      name: 'Gnosis Protocol',
      version: 'v2',
      chainId,
      verifyingContract,
    },
    message: orderForSign as unknown as Json,
  };

  return await messenger.call(
    'KeyringController:signTypedMessage',
    {
      from,
      data,
    },
    SignTypedDataVersion.V4,
  );
}

function normalizeAppData(appData: string) {
  if (isBytes32Hex(appData)) {
    return appData as Hex;
  }
  const bytes = Buffer.from(appData, 'utf8');
  return bufferToHex(keccak256(bytes));
}

function isBytes32Hex(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

export async function handleIntentTransaction(
  quoteResponse: BridgeQuoteResponse,
  selectedAccountAddress: string | undefined,
) {
  const signatureControllerMessenger = getSignatureControllerMessenger(
    Engine.controllerMessenger,
  );

  const intent = quoteResponse.quote.intent;
  if (intent) {
    const accountAddress = selectedAccountAddress;
    if (!accountAddress) {
      throw new Error('Missing selected account for intent signing');
    }

    const chainId = quoteResponse.quote.srcChainId;
    const verifyingContract =
      intent.settlementContract ?? '0x9008D19f58AAbd9eD0D60971565AA8510560ab41';

    const order = intent.order;
    if (!order) {
      throw new Error('Intent order is missing from quote response');
    }
    // TODO: this should be mapped directly inside Crosschain API
    const validTo = Number(order.validTo);
    if (Number.isNaN(validTo)) {
      throw new Error(
        'Intent order validTo is missing or invalid in quote response',
      );
    }

    const message: IntentOrderInput = {
      ...order,
      appDataHash: normalizeAppData(order.appData),
      receiver: order.receiver ?? accountAddress,
      sellAmount: order.sellAmount ?? '0',
      buyAmount: order.buyAmount ?? '0',
      validTo,
      feeAmount: '0',
      sellTokenBalance: 'erc20',
      buyTokenBalance: 'erc20',
    };

    const signature = await signIntent({
      chainId: chainId as number,
      from: accountAddress,
      order: message,
      verifyingContract,
      messenger: signatureControllerMessenger,
    });

    const normalizedQuoteResponse = {
      ...quoteResponse,
      quote: {
        ...quoteResponse.quote,
        intent: {
          ...intent,
          order: message, // ← important: override with normalized order
        },
      },
    };

    return Engine.context.BridgeStatusController.submitIntent({
      // TODO: add validation in core to avoid doing this
      quoteResponse: normalizedQuoteResponse as unknown as Parameters<
        typeof Engine.context.BridgeStatusController.submitIntent
      >[0]['quoteResponse'],
      signature,
      accountAddress,
    });
  }

  throw new Error('Intent transaction is not supported');
}
