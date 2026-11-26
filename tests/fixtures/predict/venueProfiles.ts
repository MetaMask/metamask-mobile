export const TEST_VENUE_REVOKED_RAW = `{
  "id": "kalshi-demo-signing",
  "revokedVersions": []
}
`;

export const TEST_VENUE_PROFILE_RAW = `{
  "id": "kalshi-demo-signing",
  "version": 1,
  "minDsl": "dsl-1",
  "venue": "kalshi",
  "intents": [
    {
      "id": "order.place",
      "payloads": [
        "create_order"
      ],
      "invariant": "binary-limit-order-v1",
      "confirm": {
        "kind": "per-intent",
        "signLimit": 3
      }
    },
    {
      "id": "account.activate",
      "payloads": [
        "wallet_register"
      ],
      "confirm": {
        "kind": "per-intent",
        "signLimit": 3
      }
    },
    {
      "id": "funding.deposit",
      "payloads": [
        "crypto_deposit_address"
      ],
      "confirm": {
        "kind": "per-intent",
        "signLimit": 3
      }
    }
  ],
  "payloads": {
    "create_order": {
      "kind": "http-rfc9421",
      "method": "POST",
      "path": "/trade-api/v2/portfolio/events/orders",
      "body": {
        "json": [
          {
            "key": "ticker",
            "value": {
              "input": "marketId",
              "shape": {
                "kind": "opaque",
                "maxLength": 256
              }
            }
          },
          {
            "key": "client_order_id",
            "value": {
              "input": "idempotencyKey",
              "shape": {
                "kind": "uuid-v4"
              }
            }
          },
          {
            "key": "side",
            "value": {
              "map": {
                "inputs": [
                  "action",
                  "outcome"
                ],
                "table": {
                  "buy:yes": "bid",
                  "buy:no": "ask",
                  "sell:yes": "ask",
                  "sell:no": "bid"
                }
              }
            }
          },
          {
            "key": "count",
            "value": {
              "value": "count",
              "shape": {
                "kind": "decimal",
                "scale": 2,
                "min": "1"
              }
            }
          },
          {
            "key": "price",
            "value": {
              "value": "price",
              "shape": {
                "kind": "decimal",
                "scale": 4,
                "min": "0.01",
                "max": "0.99"
              }
            }
          },
          {
            "key": "time_in_force",
            "value": {
              "const": "immediate_or_cancel"
            }
          },
          {
            "key": "self_trade_prevention_type",
            "value": {
              "const": "taker_at_cross"
            }
          },
          {
            "key": "reduce_only",
            "value": {
              "map": {
                "inputs": [
                  "action"
                ],
                "table": {
                  "buy": false,
                  "sell": true
                }
              }
            }
          }
        ],
        "maxBytes": 1024
      },
      "idempotencyKey": {
        "input": "idempotencyKey",
        "shape": {
          "kind": "uuid-v4"
        }
      },
      "invariants": [
        {
          "implementation": "binary-limit-order-v1",
          "params": {
            "pricing": "yes-leg",
            "feeCeilingCentsPerContract": 2,
            "amountInput": "amountCents",
            "contractsInput": "contracts",
            "priceField": "price",
            "countField": "count",
            "reduceOnlyField": "reduce_only",
            "actionInput": "action",
            "outcomeInput": "outcome",
            "minOutcomePriceInput": "minOutcomePrice"
          }
        }
      ]
    },
    "wallet_register": {
      "kind": "http-rfc9421",
      "method": "POST",
      "path": "/trade-api/v2/isv/wallet/register",
      "body": {
        "json": [
          {
            "key": "wallet_address",
            "value": {
              "input": "walletAddress",
              "shape": {
                "kind": "opaque",
                "maxLength": 128
              }
            }
          },
          {
            "key": "network",
            "value": {
              "input": "network",
              "shape": {
                "kind": "opaque",
                "maxLength": 32
              }
            }
          }
        ],
        "maxBytes": 512
      },
      "idempotencyKey": {
        "input": "idempotencyKey",
        "shape": {
          "kind": "uuid-v4"
        }
      }
    },
    "crypto_deposit_address": {
      "kind": "http-rfc9421",
      "method": "POST",
      "path": "/trade-api/v2/isv/deposit/crypto-addresses",
      "body": {
        "json": [
          {
            "key": "amount_cents",
            "value": {
              "input": "amountCents",
              "shape": {
                "kind": "int",
                "min": 100
              }
            }
          },
          {
            "key": "networks",
            "value": {
              "input": "networks",
              "shape": {
                "kind": "array",
                "of": {
                  "kind": "oneOf",
                  "values": [
                    "base"
                  ]
                },
                "maxItems": 1
              }
            }
          }
        ],
        "maxBytes": 256
      },
      "idempotencyKey": {
        "input": "clientOperationId",
        "shape": {
          "kind": "uuid-v4"
        }
      }
    }
  },
  "reads": {
    "allow": [
      {
        "method": "GET",
        "path": "/trade-api/v2/portfolio/balance"
      },
      {
        "method": "GET",
        "path": "/trade-api/v2/portfolio/positions"
      },
      {
        "method": "GET",
        "path": "/trade-api/v2/portfolio/settlements"
      },
      {
        "method": "GET",
        "path": "/trade-api/v2/portfolio/orders"
      },
      {
        "method": "GET",
        "path": "/trade-api/v2/portfolio/orders/{order_id}"
      },
      {
        "method": "GET",
        "path": "/trade-api/v2/isv/market-restriction"
      },
      {
        "method": "GET",
        "path": "/trade-api/v2/historical/positions"
      }
    ],
    "maxPathLength": 512
  },
  "implementation": {
    "id": "device-p256-rfc9421-v1",
    "params": {
      "authority": "demo-api.kalshi.co",
      "label": "kalshi",
      "tag": "kalshi-device-request-v1",
      "lifetimeSec": 60,
      "tokenScheme": "Kalshi-A2T",
      "headers": {
        "requestId": "kalshi-device-request-id",
        "key": "kalshi-device-key",
        "salt": "kalshi-device-key-salt"
      },
      "maxSignatures": 1
    }
  }
}
`;
