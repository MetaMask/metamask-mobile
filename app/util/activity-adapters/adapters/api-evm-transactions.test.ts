import type { V1TransactionByHashResponse } from '@metamask/core-backend';
import { mapApiEvmTransactions } from './api-evm-transactions';
import { NATIVE_TOKEN_ADDRESS, toAssetId } from './shims';

const subjectAddress = '0x9bed78535d6a03a955f1504aadba974d9a29e292';
const baseUsdc = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const baseAaveUsdc = '0x4e65fe4dba92790696d040ac24aa414708f5c0ab';
const baseAavePool = '0xa238dd80c259a72e81d7e4664a9801593f98d1c5';
const baseRecipientAddress = '0x6fdb1e9d93c1279177b00baaf44524055455e92e';
const bscContractCallerAddress = '0xf70da97812cb96acdf810712aa562db8dfa3dbef';
const bscRecipientAddress = '0xb92fe925dc43a0ecde6c8b1a2709c170ec4fff4f';
const bscUniversalRouter = '0xca11bde05977b3631167028862be2a173976ca11';
const exchangeRecipient = '0x3913a8aca88c946284abbe7ab2ed671c6603de20';
const lineaMusd = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
const lineaSenderAddress = '0xf70da97812cb96acdf810712aa562db8dfa3dbef';
const metamaskBonusContract = '0x3ef3d8ba38ebe18db133cec108f4d14ce00dd9ae';
const polygonRecipientAddress = '0x2cd071562a1688b3e9f31be39c92aa140a1acc94';
const wbnbContractAddress = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const wethContractAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
const zeroAddress = '0x0000000000000000000000000000000000000000';
const approveFunctionSignature = '0x095ea7b3';

const buildApproveData = (spender: string, amount: bigint) =>
  `${approveFunctionSignature}${spender
    .replace('0x', '')
    .padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`;
const maxUint256 = 2n ** 256n - 1n;

const withoutRaw = (item: ReturnType<typeof mapApiEvmTransactions>) => {
  const activity = { ...item };
  delete activity.raw;
  return activity;
};

describe('mapApiEvmTransactions', () => {
  it('maps an ERC-20 transfer sent by the account to a Send activity', () => {
    const transaction = {
      timestamp: '2026-05-12T13:37:47.000Z',
      chainId: 8453,
      from: subjectAddress,
      to: baseUsdc,
      transactionCategory: 'TRANSFER',
      valueTransfers: [
        {
          from: subjectAddress,
          to: baseRecipientAddress,
          symbol: 'USDC',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'send',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1778593067000,
      hash: undefined,
      data: {
        from: subjectAddress,
        to: baseRecipientAddress,
        token: {
          direction: 'out',
          symbol: 'USDC',
          assetId: toAssetId(baseUsdc, 'eip155:8453'),
        },
      },
    });
  });

  it('maps an approval without value transfers using known bridge token metadata', () => {
    const transaction = {
      hash: '0x91f89897197afcc09ad98ec4282366fd7938d8a9609e4fc2a0aa2d070664bc27',
      timestamp: '2026-05-27T13:20:27.000Z',
      chainId: 8453,
      accountId: `eip155:8453:${subjectAddress}`,
      methodId: '0x095ea7b3',
      value: '0',
      to: baseUsdc,
      from: subjectAddress,
      isError: false,
      valueTransfers: [],
      logs: [],
      transactionProtocol: 'ERC_20',
      transactionCategory: 'APPROVE',
      transactionType: 'ERC_20_APPROVE',
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'approveSpendingCap',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1779888027000,
      hash: '0x91f89897197afcc09ad98ec4282366fd7938d8a9609e4fc2a0aa2d070664bc27',
      data: {
        token: {
          direction: 'out',
          symbol: 'USDC',
          decimals: 6,
          assetId: toAssetId(baseUsdc, 'eip155:8453'),
        },
      },
    });
  });

  it('maps an approval amount from full calldata when available', () => {
    const transaction = {
      hash: '0x91f89897197afcc09ad98ec4282366fd7938d8a9609e4fc2a0aa2d070664bc27',
      timestamp: '2026-05-27T13:20:27.000Z',
      chainId: 8453,
      accountId: `eip155:8453:${subjectAddress}`,
      methodId: approveFunctionSignature,
      input: buildApproveData(baseRecipientAddress, 100000000n),
      value: '0',
      to: baseUsdc,
      from: subjectAddress,
      isError: false,
      valueTransfers: [],
      logs: [],
      transactionProtocol: 'ERC_20',
      transactionCategory: 'APPROVE',
      transactionType: 'ERC_20_APPROVE',
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'approveSpendingCap',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1779888027000,
      hash: '0x91f89897197afcc09ad98ec4282366fd7938d8a9609e4fc2a0aa2d070664bc27',
      data: {
        token: {
          amount: '100000000',
          direction: 'out',
          symbol: 'USDC',
          decimals: 6,
          assetId: toAssetId(baseUsdc, 'eip155:8453'),
        },
      },
    });
  });

  it('falls back to the contract-address asset id for an approval of an unlisted token', () => {
    const unlistedToken = '0x1111111111111111111111111111111111111111';
    const transaction = {
      hash: '0xunlistedapprove',
      timestamp: '2026-05-27T13:20:27.000Z',
      chainId: 8453,
      accountId: `eip155:8453:${subjectAddress}`,
      methodId: approveFunctionSignature,
      input: buildApproveData(baseRecipientAddress, 100000000n),
      value: '0',
      to: unlistedToken,
      from: subjectAddress,
      isError: false,
      valueTransfers: [],
      logs: [],
      transactionProtocol: 'ERC_20',
      transactionCategory: 'APPROVE',
      transactionType: 'ERC_20_APPROVE',
    } as unknown as V1TransactionByHashResponse;

    const item = mapApiEvmTransactions({ subjectAddress, transaction });

    expect(item.type).toBe('approveSpendingCap');
    if (item.type !== 'approveSpendingCap') {
      throw new Error(`Expected approveSpendingCap item, got ${item.type}`);
    }
    // No symbol/decimals (not in any known list) — but the contract address is
    // surfaced as an asset id so the UI can resolve metadata + show the avatar.
    expect(item.data.token).toStrictEqual({
      direction: 'out',
      assetId: toAssetId(unlistedToken, 'eip155:8453'),
      amount: '100000000',
    });
  });

  it('adds API gas fees to approval activities', () => {
    const transaction = {
      hash: '0xapprovefee',
      timestamp: '2026-05-27T13:20:27.000Z',
      chainId: 8453,
      accountId: `eip155:8453:${subjectAddress}`,
      methodId: approveFunctionSignature,
      input: buildApproveData(baseRecipientAddress, 100000000n),
      value: '0',
      gasUsed: 21000,
      effectiveGasPrice: 1000000000,
      to: baseUsdc,
      from: subjectAddress,
      isError: false,
      valueTransfers: [],
      logs: [],
      transactionProtocol: 'ERC_20',
      transactionCategory: 'APPROVE',
      transactionType: 'ERC_20_APPROVE',
    } as unknown as V1TransactionByHashResponse;

    const item = mapApiEvmTransactions({ subjectAddress, transaction });

    expect(item.type).toBe('approveSpendingCap');
    if (item.type !== 'approveSpendingCap') {
      throw new Error(`Expected approveSpendingCap item, got ${item.type}`);
    }

    expect(item.data.fees).toStrictEqual([
      expect.objectContaining({
        type: 'base',
        amount: '21000000000000',
        decimals: 18,
        symbol: 'ETH',
      }),
    ]);
  });

  it('marks unlimited approval amounts from full calldata', () => {
    const transaction = {
      hash: '0x91f89897197afcc09ad98ec4282366fd7938d8a9609e4fc2a0aa2d070664bc27',
      timestamp: '2026-05-27T13:20:27.000Z',
      chainId: 8453,
      accountId: `eip155:8453:${subjectAddress}`,
      methodId: approveFunctionSignature,
      input: buildApproveData(baseRecipientAddress, maxUint256),
      value: '0',
      to: baseUsdc,
      from: subjectAddress,
      isError: false,
      valueTransfers: [],
      logs: [],
      transactionProtocol: 'ERC_20',
      transactionCategory: 'APPROVE',
      transactionType: 'ERC_20_APPROVE',
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'approveSpendingCap',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1779888027000,
      hash: '0x91f89897197afcc09ad98ec4282366fd7938d8a9609e4fc2a0aa2d070664bc27',
      data: {
        token: {
          amount: maxUint256.toString(),
          direction: 'out',
          symbol: 'USDC',
          decimals: 6,
          assetId: toAssetId(baseUsdc, 'eip155:8453'),
          isUnlimitedApproval: true,
        },
      },
    });
  });

  it('maps a native value contract call without method data to a Send activity', () => {
    const transaction = {
      hash: '0x64d2f26c261178252fcad9dbb665cf40337b827a582066553dd6634eaeea9f0a',
      timestamp: '2026-05-19T19:27:12.000Z',
      chainId: 137,
      from: subjectAddress,
      to: polygonRecipientAddress,
      methodId: null,
      transactionCategory: 'CONTRACT_CALL',
      transactionType: 'GENERIC_CONTRACT_CALL',
      value: '100000000000000000',
      valueTransfers: [
        {
          from: subjectAddress,
          to: polygonRecipientAddress,
          amount: '100000000000000000',
          decimal: 18,
          symbol: 'MATIC',
          transferType: 'normal',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'send',
      chainId: 'eip155:137',
      status: 'success',
      timestamp: 1779218832000,
      hash: '0x64d2f26c261178252fcad9dbb665cf40337b827a582066553dd6634eaeea9f0a',
      data: {
        from: subjectAddress,
        to: polygonRecipientAddress,
        token: {
          amount: '100000000000000000',
          assetId: toAssetId(NATIVE_TOKEN_ADDRESS, 'eip155:137'),
          decimals: 18,
          direction: 'out',
          symbol: 'MATIC',
        },
      },
    });
  });

  it('maps an ERC-20 transfer received by the account to a Receive activity', () => {
    const transaction = {
      timestamp: '2026-05-05T12:15:27.000Z',
      chainId: 59144,
      from: lineaSenderAddress,
      to: lineaMusd,
      transactionCategory: 'TRANSFER',
      valueTransfers: [
        {
          from: lineaSenderAddress,
          to: subjectAddress,
          symbol: 'mUSD',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'receive',
      chainId: 'eip155:59144',
      status: 'success',
      timestamp: 1777983327000,
      hash: undefined,
      data: {
        from: lineaSenderAddress,
        to: subjectAddress,
        token: {
          direction: 'in',
          symbol: 'mUSD',
          assetId: toAssetId(lineaMusd, 'eip155:59144'),
        },
      },
    });
  });

  it('maps an exchange transaction without a received token to an incomplete Swap activity', () => {
    const transaction = {
      timestamp: '2026-05-05T17:57:53.000Z',
      chainId: 59144,
      from: subjectAddress,
      to: subjectAddress,
      transactionCategory: 'EXCHANGE',
      valueTransfers: [
        {
          from: subjectAddress,
          to: exchangeRecipient,
          symbol: 'mUSD',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'swapIncomplete',
      chainId: 'eip155:59144',
      status: 'success',
      timestamp: 1778003873000,
      hash: undefined,
      data: {
        sourceToken: {
          direction: 'out',
          symbol: 'mUSD',
        },
      },
    });
  });

  it('maps an exchange transaction with an internal ETH receive transfer to a Swap activity with native destination assetId', () => {
    const aggregatorAddress = '0x0a2854fbbd9b3ef66f17d47284e7f899b9509330';
    const transaction = {
      hash: '0x80b974d5834e1047a78332369de3d4b988f0237ff8a418c9464217e55c542f2f',
      timestamp: '2026-05-28T01:03:49.000Z',
      chainId: 59144,
      methodId: '0xe9ae5c53',
      value: '0',
      to: subjectAddress,
      from: subjectAddress,
      isError: false,
      transactionCategory: 'EXCHANGE',
      valueTransfers: [
        {
          from: aggregatorAddress,
          to: subjectAddress,
          amount: '4894004361763',
          decimal: 18,
          symbol: 'ETH',
          name: 'Ether',
          transferType: 'internal',
        },
        {
          from: subjectAddress,
          to: aggregatorAddress,
          amount: '10000',
          decimal: 6,
          contractAddress: lineaMusd,
          symbol: 'mUSD',
          name: 'MetaMask USD',
          transferType: 'erc20',
        },
      ],
      logs: [],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'swap',
      chainId: 'eip155:59144',
      status: 'success',
      timestamp: 1779930229000,
      hash: '0x80b974d5834e1047a78332369de3d4b988f0237ff8a418c9464217e55c542f2f',
      data: {
        sourceToken: {
          amount: '10000',
          decimals: 6,
          direction: 'out',
          assetId: toAssetId(lineaMusd, 'eip155:59144'),
          symbol: 'mUSD',
        },
        destinationToken: {
          amount: '4894004361763',
          decimals: 18,
          direction: 'in',
          assetId: toAssetId(NATIVE_TOKEN_ADDRESS, 'eip155:59144'),
          symbol: 'ETH',
        },
      },
    });
  });

  it('maps an NFT sale with received native value to an nftSell activity', () => {
    const nftRecipientAddress = '0x4f5243ceea96cee1da0fdb89c756d0e999439424';
    const nftBuyerAddress = '0x78c87da124bb36a914ff1c0f2d642f47870c997c';
    const transaction = {
      timestamp: '2026-02-23T22:04:23.000Z',
      chainId: 1,
      from: nftBuyerAddress,
      to: subjectAddress,
      transactionCategory: 'TRANSFER',
      valueTransfers: [
        {
          from: subjectAddress,
          to: nftRecipientAddress,
          amount: 1,
          tokenId: '984',
          symbol: 'BAE',
          transferType: 'erc1155',
        },
        {
          from: nftBuyerAddress,
          to: subjectAddress,
          amount: '1000000000000000',
          decimal: 18,
          symbol: 'ETH',
          transferType: 'normal',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'nftSell',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1771884263000,
      hash: undefined,
      data: {
        from: subjectAddress,
        to: nftRecipientAddress,
        token: {
          direction: 'out',
          symbol: 'BAE',
        },
        paymentToken: {
          amount: '1000000000000000',
          decimals: 18,
          direction: 'in',
          symbol: 'ETH',
          assetId: toAssetId(NATIVE_TOKEN_ADDRESS, 'eip155:1'),
        },
      },
    });
  });

  it('maps an NFT buy with the native payment as an nftBuy activity', () => {
    const nftSellerAddress = '0x4f5243ceea96cee1da0fdb89c756d0e999439424';
    const transaction = {
      timestamp: '2026-02-23T22:04:23.000Z',
      chainId: 1,
      from: subjectAddress,
      to: nftSellerAddress,
      transactionCategory: 'TRANSFER',
      valueTransfers: [
        {
          from: nftSellerAddress,
          to: subjectAddress,
          amount: 1,
          tokenId: '984',
          name: 'FLUF World: Scenes and Sounds',
          symbol: 'BAE',
          transferType: 'erc721',
        },
        {
          from: subjectAddress,
          to: nftSellerAddress,
          amount: '1000000000000000',
          decimal: 18,
          symbol: 'ETH',
          transferType: 'normal',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'nftBuy',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1771884263000,
      hash: undefined,
      data: {
        from: nftSellerAddress,
        to: subjectAddress,
        // The collection name is preferred over the symbol for NFTs.
        token: {
          direction: 'in',
          symbol: 'FLUF World: Scenes and Sounds',
        },
        paymentToken: {
          amount: '1000000000000000',
          decimals: 18,
          direction: 'out',
          symbol: 'ETH',
          assetId: toAssetId(NATIVE_TOKEN_ADDRESS, 'eip155:1'),
        },
      },
    });
  });

  it('maps an NFT received without payment to a Receive activity', () => {
    const nftSenderAddress = '0x4f5243ceea96cee1da0fdb89c756d0e999439424';
    const transaction = {
      timestamp: '2026-02-23T22:04:23.000Z',
      chainId: 1,
      from: nftSenderAddress,
      to: subjectAddress,
      transactionCategory: 'TRANSFER',
      valueTransfers: [
        {
          from: nftSenderAddress,
          to: subjectAddress,
          amount: 1,
          tokenId: '984',
          symbol: 'BAE',
          transferType: 'erc721',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'receive',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1771884263000,
      hash: undefined,
      data: {
        from: nftSenderAddress,
        to: subjectAddress,
        token: {
          direction: 'in',
          symbol: 'BAE',
        },
      },
    });
  });

  it('classifies an NFT_EXCHANGE purchase with no detected payment leg as nftBuy', () => {
    const nftSellerAddress = '0x4f5243ceea96cee1da0fdb89c756d0e999439424';
    const transaction = {
      timestamp: '2026-02-23T22:04:23.000Z',
      chainId: 1,
      from: subjectAddress,
      to: nftSellerAddress,
      transactionCategory: 'NFT_EXCHANGE',
      valueTransfers: [
        {
          from: nftSellerAddress,
          to: subjectAddress,
          amount: 1,
          tokenId: '984',
          symbol: 'BAE',
          transferType: 'erc721',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'nftBuy',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1771884263000,
      hash: undefined,
      data: {
        from: nftSellerAddress,
        to: subjectAddress,
        token: { direction: 'in', symbol: 'BAE' },
        paymentToken: undefined,
      },
    });
  });

  it('classifies an NFT_EXCHANGE sale with no detected proceeds leg as nftSell', () => {
    const nftRecipientAddress = '0x4f5243ceea96cee1da0fdb89c756d0e999439424';
    const transaction = {
      timestamp: '2026-02-23T22:04:23.000Z',
      chainId: 1,
      from: subjectAddress,
      to: nftRecipientAddress,
      transactionCategory: 'NFT_EXCHANGE',
      valueTransfers: [
        {
          from: subjectAddress,
          to: nftRecipientAddress,
          amount: 1,
          tokenId: '984',
          symbol: 'BAE',
          transferType: 'erc721',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'nftSell',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1771884263000,
      hash: undefined,
      data: {
        from: subjectAddress,
        to: nftRecipientAddress,
        token: { direction: 'out', symbol: 'BAE' },
        paymentToken: undefined,
      },
    });
  });

  it('maps an NFT mint transfer to an nftMint activity without assetId', () => {
    const nftContractAddress = '0x239fd4b0c4db49fa8660e65b97619d43d0e0a79d';
    const transaction = {
      hash: '0x25805d4ae16935e6fa92add9dcee97db0127749d4244032a79489098a880210c',
      timestamp: '2026-05-13T14:34:23.000Z',
      chainId: 59144,
      from: zeroAddress,
      to: subjectAddress,
      transactionCategory: 'TRANSFER',
      valueTransfers: [
        {
          from: zeroAddress,
          to: subjectAddress,
          contractAddress: nftContractAddress,
          tokenId: '1',
          symbol: 'TDN',
          transferType: 'erc721',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'nftMint',
      chainId: 'eip155:59144',
      status: 'success',
      timestamp: 1778682863000,
      hash: '0x25805d4ae16935e6fa92add9dcee97db0127749d4244032a79489098a880210c',
      data: {
        from: zeroAddress,
        to: subjectAddress,
        token: {
          direction: 'in',
          symbol: 'TDN',
        },
      },
    });
  });

  it('maps an Aave supply contract call to a Lending deposit activity', () => {
    const transaction = {
      hash: '0x08d14578168f22001e95503469c63613bd9f3d3f60e81dbbf204fbd21f484bd9',
      timestamp: '2026-05-13T03:31:29.000Z',
      chainId: 8453,
      from: subjectAddress,
      to: baseAavePool,
      methodId: '0x617ba037',
      transactionCategory: 'CONTRACT_CALL',
      transactionType: 'GENERIC_CONTRACT_CALL',
      valueTransfers: [
        {
          from: zeroAddress,
          to: subjectAddress,
          amount: '99999',
          decimal: 6,
          contractAddress: baseAaveUsdc,
          symbol: 'aBasUSDC',
        },
        {
          from: subjectAddress,
          to: baseAaveUsdc,
          amount: '100000',
          decimal: 6,
          contractAddress: baseUsdc,
          symbol: 'USDC',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'lendingDeposit',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1778643089000,
      hash: '0x08d14578168f22001e95503469c63613bd9f3d3f60e81dbbf204fbd21f484bd9',
      data: {
        sourceToken: {
          amount: '100000',
          decimals: 6,
          direction: 'out',
          symbol: 'USDC',
          assetId: toAssetId(baseUsdc, 'eip155:8453'),
        },
        destinationToken: {
          amount: '99999',
          decimals: 6,
          direction: 'in',
          symbol: 'aBasUSDC',
          assetId: toAssetId(baseAaveUsdc, 'eip155:8453'),
        },
      },
    });
  });

  it('maps a DEPOSIT without an inbound transfer to a deposit activity', () => {
    const stakingContractAddress = '0x00000000219ab540356cbb839cbe05303d7705fa';
    const transaction = {
      hash: '0xabc123deposit00000000000000000000000000000000000000000000000001',
      timestamp: '2026-05-12T13:37:47.000Z',
      chainId: 1,
      from: subjectAddress,
      to: stakingContractAddress,
      transactionCategory: 'DEPOSIT',
      valueTransfers: [
        {
          from: subjectAddress,
          to: stakingContractAddress,
          amount: '1000000000000000000',
          decimal: 18,
          symbol: 'ETH',
          transferType: 'normal',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'deposit',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1778593067000,
      hash: '0xabc123deposit00000000000000000000000000000000000000000000000001',
      data: {
        token: {
          amount: '1000000000000000000',
          decimals: 18,
          direction: 'in',
          symbol: 'ETH',
          assetId: toAssetId(NATIVE_TOKEN_ADDRESS, 'eip155:1'),
        },
      },
    });
  });

  it('includes the network fee on a CLAIM activity', () => {
    const transaction = {
      hash: '0xclaimfee0000000000000000000000000000000000000000000000000000001',
      timestamp: '2026-05-12T13:37:47.000Z',
      chainId: 1,
      from: subjectAddress,
      to: metamaskBonusContract,
      transactionCategory: 'CLAIM',
      gasUsed: 21000,
      effectiveGasPrice: 1000000000,
      valueTransfers: [
        {
          from: metamaskBonusContract,
          to: subjectAddress,
          amount: '1000000',
          decimal: 6,
          symbol: 'USDC',
          transferType: 'normal',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    const item = mapApiEvmTransactions({ subjectAddress, transaction });
    expect(item.type).toBe('claim');
    if (item.type !== 'claim') {
      throw new Error(`Expected claim item, got ${item.type}`);
    }
    expect(item.data.fees).toStrictEqual([
      expect.objectContaining({
        type: 'base',
        amount: '21000000000000',
        decimals: 18,
        symbol: 'ETH',
      }),
    ]);
  });

  it('includes the network fee on a DEPOSIT activity', () => {
    const stakingContractAddress = '0x00000000219ab540356cbb839cbe05303d7705fa';
    const transaction = {
      hash: '0xdepositfee000000000000000000000000000000000000000000000000000001',
      timestamp: '2026-05-12T13:37:47.000Z',
      chainId: 1,
      from: subjectAddress,
      to: stakingContractAddress,
      transactionCategory: 'DEPOSIT',
      gasUsed: 21000,
      effectiveGasPrice: 1000000000,
      valueTransfers: [
        {
          from: subjectAddress,
          to: stakingContractAddress,
          amount: '1000000000000000000',
          decimal: 18,
          symbol: 'ETH',
          transferType: 'normal',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    const item = mapApiEvmTransactions({ subjectAddress, transaction });
    expect(item.type).toBe('deposit');
    if (item.type !== 'deposit') {
      throw new Error(`Expected deposit item, got ${item.type}`);
    }
    expect(item.data.fees).toStrictEqual([
      expect.objectContaining({
        type: 'base',
        amount: '21000000000000',
        decimals: 18,
        symbol: 'ETH',
      }),
    ]);
  });

  it('maps a MetaMask mUSD bonus claim to a Claim mUSD bonus activity', () => {
    const transaction = {
      hash: '0x875ded271a40278391fca5d71892231afd0cb9592f31bdf3b7c949906cb982c4',
      timestamp: '2026-05-13T00:48:45.000Z',
      chainId: 59144,
      from: subjectAddress,
      to: metamaskBonusContract,
      transactionCategory: 'CLAIM_BONUS',
      valueTransfers: [
        {
          from: metamaskBonusContract,
          to: subjectAddress,
          contractAddress: lineaMusd,
          symbol: 'mUSD',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'claimMusdBonus',
      chainId: 'eip155:59144',
      status: 'success',
      timestamp: 1778633325000,
      hash: '0x875ded271a40278391fca5d71892231afd0cb9592f31bdf3b7c949906cb982c4',
      data: {
        token: {
          direction: 'in',
          symbol: 'mUSD',
          assetId: toAssetId(lineaMusd, 'eip155:59144'),
        },
      },
    });
  });

  it('maps a WETH deposit to a Wrap activity', () => {
    const transaction = {
      hash: '0x6e448f5b8cf55534507770c1cb90ba14e723d03b4a46b4919a5847eb8d13b7b5',
      timestamp: '2026-05-28T13:42:23.000Z',
      chainId: 1,
      from: subjectAddress,
      to: wethContractAddress,
      methodId: '0xd0e30db0',
      transactionCategory: 'DEPOSIT',
      transactionProtocol: 'WETH',
      transactionType: 'WETH_DEPOSIT',
      valueTransfers: [
        {
          from: NATIVE_TOKEN_ADDRESS,
          to: subjectAddress,
          amount: '1000000000000',
          decimal: 18,
          contractAddress: wethContractAddress,
          symbol: 'WETH',
          transferType: 'erc20',
        },
        {
          from: subjectAddress,
          to: wethContractAddress,
          amount: '1000000000000',
          decimal: 18,
          symbol: 'ETH',
          transferType: 'normal',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'wrap',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1779975743000,
      hash: '0x6e448f5b8cf55534507770c1cb90ba14e723d03b4a46b4919a5847eb8d13b7b5',
      data: {
        sourceToken: {
          amount: '1000000000000',
          decimals: 18,
          direction: 'out',
          symbol: 'ETH',
          assetId: toAssetId(NATIVE_TOKEN_ADDRESS, 'eip155:1'),
        },
        destinationToken: {
          amount: '1000000000000',
          decimals: 18,
          direction: 'in',
          symbol: 'WETH',
          assetId: toAssetId(wethContractAddress, 'eip155:1'),
        },
      },
    });
  });

  it('maps a BNB to WBNB direct deposit as Wrap even when the API categorizes it as a swap', () => {
    const transaction = {
      hash: '0x6e448f5b8cf55534507770c1cb90ba14e723d03b4a46b4919a5847eb8d13b7b6',
      timestamp: '2026-05-28T13:42:23.000Z',
      chainId: 56,
      from: subjectAddress,
      to: wbnbContractAddress,
      methodId: '0xd0e30db0',
      transactionCategory: 'SWAP',
      transactionProtocol: 'WBNB',
      transactionType: 'SWAP',
      valueTransfers: [
        {
          from: subjectAddress,
          to: wbnbContractAddress,
          amount: '1000000000000000000',
          decimal: 18,
          symbol: 'BNB',
          transferType: 'normal',
        },
        {
          from: NATIVE_TOKEN_ADDRESS,
          to: subjectAddress,
          amount: '1000000000000000000',
          decimal: 18,
          contractAddress: wbnbContractAddress,
          symbol: 'WBNB',
          transferType: 'erc20',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'wrap',
      chainId: 'eip155:56',
      status: 'success',
      timestamp: 1779975743000,
      hash: '0x6e448f5b8cf55534507770c1cb90ba14e723d03b4a46b4919a5847eb8d13b7b6',
      data: {
        sourceToken: {
          amount: '1000000000000000000',
          decimals: 18,
          direction: 'out',
          symbol: 'BNB',
          assetId: toAssetId(NATIVE_TOKEN_ADDRESS, 'eip155:56'),
        },
        destinationToken: {
          amount: '1000000000000000000',
          decimals: 18,
          direction: 'in',
          symbol: 'WBNB',
          assetId: toAssetId(wbnbContractAddress, 'eip155:56'),
        },
      },
    });
  });

  it('maps a WETH withdrawal to an Unwrap activity', () => {
    const transaction = {
      hash: '0x8f2a1c9e4b7d30651234567890abcdef1234567890abcdef1234567890abcdef',
      timestamp: '2026-05-28T14:15:00.000Z',
      chainId: 1,
      from: subjectAddress,
      to: wethContractAddress,
      methodId: '0x2e1a7d4d',
      transactionCategory: 'UNWRAP',
      transactionProtocol: 'WETH',
      transactionType: 'WETH_WITHDRAW',
      valueTransfers: [
        {
          from: subjectAddress,
          to: wethContractAddress,
          amount: '1000000000000',
          decimal: 18,
          contractAddress: wethContractAddress,
          symbol: 'WETH',
          transferType: 'erc20',
        },
        {
          from: wethContractAddress,
          to: subjectAddress,
          amount: '1000000000000',
          decimal: 18,
          symbol: 'ETH',
          transferType: 'normal',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'unwrap',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1779977700000,
      hash: '0x8f2a1c9e4b7d30651234567890abcdef1234567890abcdef1234567890abcdef',
      data: {
        sourceToken: {
          amount: '1000000000000',
          decimals: 18,
          direction: 'out',
          symbol: 'WETH',
          assetId: toAssetId(wethContractAddress, 'eip155:1'),
        },
        destinationToken: {
          amount: '1000000000000',
          decimals: 18,
          direction: 'in',
          symbol: 'ETH',
          assetId: toAssetId(NATIVE_TOKEN_ADDRESS, 'eip155:1'),
        },
      },
    });
  });

  it('maps a bridge withdraw to a Bridge activity', () => {
    const transaction = {
      hash: '0x9f81163d00374094411f44732738c6dea194551e4500bde9fd7ee60319aac766',
      timestamp: '2026-05-28T04:13:31.000Z',
      chainId: 8453,
      methodId: '0xe9ae5c53',
      value: '0',
      to: subjectAddress,
      from: subjectAddress,
      isError: false,
      valueTransfers: [
        {
          from: subjectAddress,
          to: '0xa5c1ce365ddb5a91ff466774ec4bdf8f97cb9f55',
          amount: '100000',
          decimal: 6,
          contractAddress: baseUsdc,
          symbol: 'USDC',
          transferType: 'erc20',
        },
      ],
      logs: [],
      transactionCategory: 'BRIDGE_WITHDRAW',
      transactionProtocol: 'ACROSS',
      transactionType: 'ACROSS_BRIDGE_WITHDRAW',
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'bridge',
      chainId: 'eip155:8453',
      status: 'success',
      timestamp: 1779941611000,
      hash: '0x9f81163d00374094411f44732738c6dea194551e4500bde9fd7ee60319aac766',
      data: {
        sourceToken: {
          amount: '100000',
          decimals: 6,
          direction: 'out',
          symbol: 'USDC',
          assetId: toAssetId(baseUsdc, 'eip155:8453'),
        },
      },
    });
  });

  it('maps an unrecognized transaction category to a contract interaction activity', () => {
    const transaction = {
      timestamp: '2026-05-12T16:04:40.000Z',
      chainId: 56,
      from: bscContractCallerAddress,
      to: bscUniversalRouter,
      methodId: '0x174dea71',
      transactionCategory: 'CONTRACT_CALL',
      transactionProtocol: 'GENERIC',
      transactionType: 'GENERIC_CONTRACT_CALL',
      valueTransfers: [
        {
          from: subjectAddress,
          to: bscRecipientAddress,
          symbol: 'BNB',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'contractInteraction',
      chainId: 'eip155:56',
      status: 'success',
      timestamp: 1778601880000,
      hash: undefined,
      data: {
        from: bscContractCallerAddress,
        methodId: '0x174dea71',
        to: bscUniversalRouter,
        transactionCategory: 'CONTRACT_CALL',
        transactionProtocol: 'GENERIC',
        transactionType: 'GENERIC_CONTRACT_CALL',
      },
    });
  });

  it('maps a generic contract call to a contract interaction with its token amount', () => {
    const mainnetUsdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const transaction = {
      hash: '0xd206cc6c16974409bae072ce4cd1559743041af40c2bae84775a0bbb4dff5fee',
      timestamp: '2026-05-01T13:39:47.000Z',
      chainId: 1,
      from: subjectAddress,
      to: subjectAddress,
      methodId: '0xe9ae5c53',
      value: '0',
      transactionCategory: 'CONTRACT_CALL',
      transactionType: 'GENERIC_CONTRACT_CALL',
      valueTransfers: [
        {
          from: subjectAddress,
          to: '0x4cd00e387622c35bddb9b4c962c136462338bc31',
          amount: '580060',
          decimal: 6,
          contractAddress: mainnetUsdc,
          symbol: 'USDC',
          name: 'USD Coin',
          transferType: 'erc20',
        },
      ],
    } as unknown as V1TransactionByHashResponse;

    expect(
      withoutRaw(mapApiEvmTransactions({ subjectAddress, transaction })),
    ).toStrictEqual({
      type: 'contractInteraction',
      chainId: 'eip155:1',
      status: 'success',
      timestamp: 1777642787000,
      hash: '0xd206cc6c16974409bae072ce4cd1559743041af40c2bae84775a0bbb4dff5fee',
      data: {
        from: subjectAddress,
        methodId: '0xe9ae5c53',
        to: subjectAddress,
        transactionCategory: 'CONTRACT_CALL',
        transactionProtocol: undefined,
        transactionType: 'GENERIC_CONTRACT_CALL',
        token: {
          amount: '580060',
          assetId: toAssetId(mainnetUsdc, 'eip155:1'),
          decimals: 6,
          direction: 'out',
          symbol: 'USDC',
        },
      },
    });
  });

  it('adds API gas fees to contract interaction activities', () => {
    const transaction = {
      hash: '0xcontractfee',
      timestamp: '2026-05-01T13:39:47.000Z',
      chainId: 1,
      from: subjectAddress,
      to: subjectAddress,
      methodId: '0xe9ae5c53',
      value: '0',
      gasUsed: 21000,
      effectiveGasPrice: 1000000000,
      transactionCategory: 'CONTRACT_CALL',
      transactionType: 'GENERIC_CONTRACT_CALL',
      valueTransfers: [],
    } as unknown as V1TransactionByHashResponse;

    const item = mapApiEvmTransactions({ subjectAddress, transaction });

    expect(item.type).toBe('contractInteraction');
    if (item.type !== 'contractInteraction') {
      throw new Error(`Expected contractInteraction item, got ${item.type}`);
    }

    expect(item.data.fees).toStrictEqual([
      expect.objectContaining({
        type: 'base',
        amount: '21000000000000',
        decimals: 18,
        symbol: 'ETH',
      }),
    ]);
  });
});
