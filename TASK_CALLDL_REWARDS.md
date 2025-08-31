We are building on top of recently implemented TASK_CALLDL_API.md to build the reward usage in perps.

## TAT-1221 As a user, I pay a different MM builder fee based on my MetaMask Points tier

Acceptance criteria

- MM builder fee depends on MetaMask Reward tiers
  Tiers 1-3: 10bps
  Tier 4-5: 5bps
  Tier 6-7: 3.5bps
  Fee and fee discount are returned by Rewards API

UI display the fee discount in the app/components/UI/Perps/Views/PerpsOrderView/PerpsOrderView.tsx

## TAT-1223

As a user, I see how much points I will receive before my trade
Acceptance criteria:
Trade screens (open position AND close position) displays estimated #points earned if user has opted in Rewards program
Trade screen doesn’t displays estimated #points earned if user has not opted in Rewards program
Points component is hidden for UK users
The swagger url is https://rewards.dev-api.cx.metamask.io/api

Before making an order we should be able to get point estimation:

**IMPORTANT**: The API currently only accepts `activityType: "SWAP"` even for perps trades.
The `perpsContext` field is what identifies this as a perps trade, not the activity type.

```json
{
  "activityType": "SWAP",
  "account": "eip155:1:0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "activityContext": {
    "swapContext": {
      "srcAsset": {
        "id": "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "amount": "25739959426"
      },
      "destAsset": {
        "id": "eip155:1/slip44:60",
        "amount": "9912500000000000000"
      },
      "feeAsset": {
        "id": "eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "amount": "100"
      }
    },
    "perpsContext": {
      "perpsType": "open_position",
      "usdFeeValue": "100",
      "coin": "ETH",
      "isBuy": true,
      "size": "100",
      "orderType": "market",
      "price": "100",
      "reduceOnly": true,
      "timeInForce": "GTC",
      "takeProfitPrice": "100",
      "stopLossPrice": "100",
      "clientOrderId": "1234567890",
      "slippage": 0.01,
      "grouping": "normalTpsl",
      "currentPrice": 10000
    }
  }
}
```

response:

```
{
  "pointsEstimate": 100,
  "bonusBips": 200
}
```

EstimatedPointsDto
{
pointsEstimate\* number
example: 100
Earnable for the activity

bonusBips\* number
example: 200
Bonus applied to the points estimate, in basis points. 100 = 1%
}

To get Perps fee discount:
/public/rewards/perps-fee-discount/{address}

curl -X 'GET' \
 'https://rewards.dev-api.cx.metamask.io/public/rewards/perps-fee-discount/0x316BDE155acd07609872a56Bc32CcfB0B13201fA' \
 -H 'accept: application/json'

response is Perps discount rewards for the given address as string

## Implementation Notes

we already have placeholder in app/components/UI/Perps/hooks/usePerpsOrderFees.ts
