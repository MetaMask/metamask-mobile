import { Mockttp } from 'mockttp';

// Constants — matching extension's common-tron.ts
export const TRON_ACCOUNT_ADDRESS = 'TJ3QZbBREK1Xybe1jf4nR9Attb8i54vGS3';
export const TRON_RECIPIENT_ADDRESS = 'TK3xRFq22eEiATz6kfamDeAAQrPdfdGPeq';
export const TRON_SECOND_ACCOUNT_ADDRESS =
  'TK3xRFq22eEiATz6kfamDeAAQrPdfdGPeq';
export const TRON_CHAIN_ID = 'tron:728126428';
export const TRX_BALANCE = 6072392; // in SUN (~6.07 TRX)
export const TRX_TO_USD_RATE = 0.29469;
export const SUN_PER_TRX = 1_000_000;

export async function mockTronGetAccount(
  mockServer: Mockttp,
  mockZeroBalance = false,
  address = TRON_ACCOUNT_ADDRESS,
  balance = TRX_BALANCE,
) {
  return await mockServer
    .forGet(new RegExp(`/v1/accounts/${address}(?:\\?.*)?$`))
    .thenJson(200, {
      data: [
        {
          address,
          balance: mockZeroBalance ? 0 : balance,
          create_time: 1672531200000,
          latest_opration_time: 1672531200000,
          frozenV2: [{}, { type: 'ENERGY' }, { type: 'TRON_POWER' }],
          trc20: [
            {
              TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t: '1000000',
            },
          ],
          owner_permission: {
            permission_name: 'owner',
            threshold: 1,
            keys: [{ address, weight: 1 }],
          },
          active_permission: [
            {
              type: 'Active',
              id: 2,
              permission_name: 'active',
              threshold: 1,
              operations:
                '7fff1fc0033ec30f000000000000000000000000000000000000000000000000',
              keys: [{ address, weight: 1 }],
            },
          ],
        },
      ],
      success: true,
    });
}

export async function mockTronGetAccountResource(mockServer: Mockttp) {
  return await mockServer
    .forPost(/\/wallet\/getaccountresource/)
    .thenJson(200, {
      freeNetUsed: 100,
      freeNetLimit: 1500,
      EnergyLimit: 50000,
      TotalEnergyLimit: 90000000000,
      TotalEnergyWeight: 30000000,
    });
}

export async function mockTronGetTransactions(mockServer: Mockttp) {
  return await mockServer
    .forGet(/\/v1\/accounts\/.*\/transactions$/)
    .thenJson(200, {
      data: [],
      success: true,
      meta: { at: Date.now(), page_size: 20 },
    });
}

export async function mockTronGetTrc20Transactions(mockServer: Mockttp) {
  return await mockServer
    .forGet(/\/v1\/accounts\/.*\/transactions\/trc20/)
    .thenJson(200, {
      data: [],
      success: true,
      meta: { at: Date.now(), page_size: 20 },
    });
}

export async function mockTronExchangeRates(mockServer: Mockttp) {
  return await mockServer
    .forGet(/\/v1\/exchange-rates/)
    .thenJson(200, {
      data: {
        crypto: {
          'tron:728126428/slip44:195': {
            value: TRX_TO_USD_RATE,
            currency: 'usd',
          },
        },
        fiat: { usd: { value: 1 } },
      },
    });
}

export async function mockTronSpotPrices(mockServer: Mockttp) {
  return await mockServer
    .forGet(/\/v3\/spot-prices/)
    .thenJson(200, {
      'tron:728126428/slip44:195': { usd: TRX_TO_USD_RATE.toString() },
    });
}

export async function mockTronGetBlock(mockServer: Mockttp) {
  return await mockServer
    .forPost(/\/wallet\/getblock/)
    .thenJson(200, {
      blockID: 'abc123',
      block_header: {
        raw_data: {
          timestamp: Date.now(),
          number: 12345678,
        },
      },
    });
}

export async function mockBroadcastTransaction(mockServer: Mockttp) {
  return await mockServer
    .forPost(/\/wallet\/broadcasttransaction/)
    .thenJson(200, {
      result: true,
      txid: '36c4096d30a82641ee9d8c12297ed330ddb0f8ae272dc2564995de7a4201a67e',
    });
}

export async function mockTronFeatureFlags(mockServer: Mockttp) {
  return await mockServer
    .forGet(/client-config\.api\.cx\.metamask\.io\/v1\/flags/)
    .thenJson(200, [
      {
        feature: 'tronAccounts',
        value: { enabled: true, minimumVersion: '0.0.0' },
      },
    ]);
}

export async function mockTronApis(
  mockServer: Mockttp,
  mockZeroBalance = false,
) {
  return [
    await mockTronFeatureFlags(mockServer),
    await mockTronGetAccount(mockServer, mockZeroBalance),
    await mockTronGetAccountResource(mockServer),
    await mockTronGetTransactions(mockServer),
    await mockTronGetTrc20Transactions(mockServer),
    await mockTronExchangeRates(mockServer),
    await mockTronSpotPrices(mockServer),
    await mockTronGetBlock(mockServer),
    await mockBroadcastTransaction(mockServer),
  ];
}
