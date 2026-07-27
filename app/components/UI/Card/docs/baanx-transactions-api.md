> ## Documentation Index
>
> Fetch the complete documentation index at: https://docs.baanx.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Get Card Transactions

> Retrieve paginated card transaction history with optional filtering

## Overview

Retrieves detailed card transaction history with support for pagination and multiple filtering options. Returns comprehensive transaction information including merchant details, amounts, fees, currency conversions, and funding source breakdown.

<Info>
  **Real-Time Data**

Transactions appear in this endpoint within seconds of authorization. Pending transactions are included alongside confirmed ones with appropriate status indicators.
</Info>

## Authentication

This endpoint requires authentication via Bearer token:

```bash theme={null}
Authorization: Bearer YOUR_ACCESS_TOKEN
```

## Request

### Headers

<ParamField header="x-client-key" type="string" required>
  Your public API client key
</ParamField>

<ParamField header="x-us-env" type="boolean" default={false}>
  Set to `true` to route requests to the US backend environment
</ParamField>

<ParamField header="Authorization" type="string" required>
  Bearer token for authentication
</ParamField>

### Query Parameters

<ParamField query="dateFrom" type="string">
  Start date for filtering transactions in ISO 8601 format (`YYYY-MM-DD`)

**Required:** Only if `dateTo` is provided

**Example:** `2024-10-24`
</ParamField>

<ParamField query="dateTo" type="string">
  End date for filtering transactions in ISO 8601 format (`YYYY-MM-DD`)

**Required:** Only if `dateFrom` is provided

**Example:** `2024-10-25`

**Note:** Both `dateFrom` and `dateTo` must be provided together
</ParamField>

<ParamField query="searchKey" type="string">
  Search term to filter transactions by merchant name or location

**Example:** `PayPal`, `Starbucks`, `Amazon`

**Behavior:** Case-insensitive partial matching
</ParamField>

<ParamField query="mccCategories" type="string">
  Comma-separated list of merchant category codes (MCC) to filter transactions

**Accepted Values:**

- `SUBSCRIPTIONS` - Recurring subscription services
- `FOOD` - Restaurants, grocery stores, food delivery
- `TRAVEL` - Airlines, hotels, car rentals, transportation
- `ENTERTAINMENT` - Movies, concerts, streaming services
- `HEALTH` - Pharmacies, medical services, fitness
- `ATM` - ATM withdrawals and fees
- `UTILITIES` - Bills, utilities, telecommunications
- `MISC` - Miscellaneous purchases

**Example:** `FOOD,ENTERTAINMENT` or `SUBSCRIPTIONS`
</ParamField>

<ParamField query="page" type="number" default={0}>
  Page number for pagination (0-indexed)

**Example:** `0`, `1`, `5`

**Note:** If page doesn't exist, returns page 0
</ParamField>

### Request Examples

<CodeGroup>
  ```bash All Transactions theme={null}
  curl -X GET "https://dev.api.baanx.com/v1/card/transactions" \
    -H "x-client-key: YOUR_CLIENT_KEY" \
    -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
  ```

```bash Date Range Filter theme={null}
curl -X GET "https://dev.api.baanx.com/v1/card/transactions?dateFrom=2024-10-24&dateTo=2024-10-25" \
  -H "x-client-key: YOUR_CLIENT_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

```bash Search by Merchant theme={null}
curl -X GET "https://dev.api.baanx.com/v1/card/transactions?searchKey=PayPal" \
  -H "x-client-key: YOUR_CLIENT_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

```bash Category Filter theme={null}
curl -X GET "https://dev.api.baanx.com/v1/card/transactions?mccCategories=FOOD,ENTERTAINMENT" \
  -H "x-client-key: YOUR_CLIENT_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

```bash Combined Filters with Pagination theme={null}
curl -X GET "https://dev.api.baanx.com/v1/card/transactions?dateFrom=2024-10-01&dateTo=2024-10-31&mccCategories=FOOD&page=1" \
  -H "x-client-key: YOUR_CLIENT_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

```javascript JavaScript theme={null}
const params = new URLSearchParams({
  dateFrom: '2024-10-24',
  dateTo: '2024-10-25',
  searchKey: 'PayPal',
  mccCategories: 'SUBSCRIPTIONS',
  page: '0',
});

const response = await fetch(
  `https://dev.api.baanx.com/v1/card/transactions?${params}`,
  {
    headers: {
      'x-client-key': 'YOUR_CLIENT_KEY',
      Authorization: 'Bearer YOUR_ACCESS_TOKEN',
    },
  },
);

const transactions = await response.json();
console.log(transactions);
```

```python Python theme={null}
import requests
from datetime import date, timedelta

url = "https://dev.api.baanx.com/v1/card/transactions"
headers = {
    "x-client-key": "YOUR_CLIENT_KEY",
    "Authorization": "Bearer YOUR_ACCESS_TOKEN"
}

today = date.today()
week_ago = today - timedelta(days=7)

params = {
    "dateFrom": week_ago.isoformat(),
    "dateTo": today.isoformat(),
    "mccCategories": "FOOD,ENTERTAINMENT",
    "page": 0
}

response = requests.get(url, headers=headers, params=params)
print(response.json())
```

```typescript TypeScript theme={null}
interface TransactionFilters {
  dateFrom?: string;
  dateTo?: string;
  searchKey?: string;
  mccCategories?: string;
  page?: number;
}

interface Transaction {
  id: string;
  cardId: string;
  panLast4: string;
  transactionId: string;
  dateTime: string;
  sign: 'DEBIT' | 'CREDIT';
  merchantNameLocation: string;
  merchantType: string;
  mcc: number;
  mccCategory: string;
  transactionCurrency: string;
  amountInTransactionCurrency: string;
  feesInTransactionCurrency: string;
  originalCurrency: string;
  amountInOriginalCurrency: string;
  feesInOriginalCurrency: string;
  billingConversionRate: string;
  ecbRate: string;
  status: 'CONFIRMED' | 'PENDING' | 'DECLINED' | 'REVERTED';
  declineReason?: string;
  fundingSources: FundingSource[];
}

interface FundingSource {
  id: string;
  address: string;
  network: 'linea' | 'solana' | 'ethereum';
  txHash: string;
  currency: string;
  amount: string;
  fees: string;
  swapFee: string;
  sign: 'DEBIT' | 'CREDIT';
  status: 'CONFIRMED' | 'PENDING' | 'DECLINED';
  dateTime: string;
}

const getTransactions = async (
  filters: TransactionFilters = {},
): Promise<Transaction[]> => {
  const params = new URLSearchParams(
    Object.entries(filters)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  );

  const response = await fetch(
    `https://dev.api.baanx.com/v1/card/transactions?${params}`,
    {
      headers: {
        'x-client-key': 'YOUR_CLIENT_KEY',
        Authorization: 'Bearer YOUR_ACCESS_TOKEN',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};
```

</CodeGroup>

## Response

### Success Response

Returns an array of transaction objects, ordered by most recent first.

<ResponseField name="id" type="string">
  Unique transaction identifier (UUID)
</ResponseField>

<ResponseField name="cardId" type="string">
  Unique card identifier
</ResponseField>

<ResponseField name="panLast4" type="string">
  Last 4 digits of the card used
</ResponseField>

<ResponseField name="transactionId" type="string">
  External transaction ID from payment processor
</ResponseField>

<ResponseField name="dateTime" type="string">
  Transaction timestamp in ISO 8601 format
</ResponseField>

<ResponseField name="sign" type="string">
  Transaction direction

**Values:**

- `DEBIT` - Money leaving the card (purchase, withdrawal)
- `CREDIT` - Money entering the card (refund, reversal)
  </ResponseField>

<ResponseField name="merchantNameLocation" type="string">
  Merchant name and location information
</ResponseField>

<ResponseField name="merchantType" type="string">
  Type of merchant or transaction context

**Example:** `OutOfWalletOnline`, `InStore`, `ATM`
</ResponseField>

<ResponseField name="mcc" type="number">
  Merchant Category Code (4-digit industry code)
</ResponseField>

<ResponseField name="mccCategory" type="string">
  Human-readable category derived from MCC

**Values:** `SUBSCRIPTIONS`, `FOOD`, `TRAVEL`, `ENTERTAINMENT`, `HEALTH`, `ATM`, `UTILITIES`, `MISC`
</ResponseField>

<ResponseField name="transactionCurrency" type="string">
  Currency used for the card transaction (typically card's base currency)

**Example:** `EUR`, `USD`, `GBP`
</ResponseField>

<ResponseField name="amountInTransactionCurrency" type="string">
  Transaction amount in the card's currency
</ResponseField>

<ResponseField name="feesInTransactionCurrency" type="string">
  Fees charged in the card's currency
</ResponseField>

<ResponseField name="originalCurrency" type="string">
  Currency used at the merchant (may differ from card currency)

**Example:** `USD`, `EUR`, `GBP`
</ResponseField>

<ResponseField name="amountInOriginalCurrency" type="string">
  Transaction amount in the merchant's original currency
</ResponseField>

<ResponseField name="feesInOriginalCurrency" type="string">
  Fees in the merchant's original currency
</ResponseField>

<ResponseField name="billingConversionRate" type="string">
  Conversion rate used for billing between original and transaction currency
</ResponseField>

<ResponseField name="ecbRate" type="string">
  European Central Bank reference exchange rate at transaction time
</ResponseField>

<ResponseField name="status" type="string">
  Current transaction status

**Values:**

- `CONFIRMED` - Transaction completed successfully
- `PENDING` - Transaction authorized but not yet settled
- `DECLINED` - Transaction authorization failed
- `REVERTED` - Transaction was reversed/refunded
  </ResponseField>

<ResponseField name="declineReason" type="string">
  Explanation for declined transactions (only present when `status=DECLINED`)
</ResponseField>

<ResponseField name="fundingSources" type="array">
  Array of funding sources used to pay for this transaction

  <Expandable title="Funding Source Object">
    <ResponseField name="id" type="string">
      Unique funding source identifier
    </ResponseField>

    <ResponseField name="address" type="string">
      Wallet or account address used for funding
    </ResponseField>

    <ResponseField name="network" type="string">
      Blockchain network used

      **Values:** `linea`, `solana`, `ethereum`
    </ResponseField>

    <ResponseField name="txHash" type="string">
      Blockchain transaction hash (for crypto funding sources)
    </ResponseField>

    <ResponseField name="currency" type="string">
      Cryptocurrency or token used

      **Example:** `usdc`, `usdt`
    </ResponseField>

    <ResponseField name="amount" type="string">
      Amount deducted from this funding source
    </ResponseField>

    <ResponseField name="fees" type="string">
      Network/transaction fees
    </ResponseField>

    <ResponseField name="swapFee" type="string">
      Currency swap fee (if applicable)
    </ResponseField>

    <ResponseField name="sign" type="string">
      Direction for this funding source

      **Values:** `DEBIT`, `CREDIT`
    </ResponseField>

    <ResponseField name="status" type="string">
      Status of this funding transaction

      **Values:** `CONFIRMED`, `PENDING`, `DECLINED`
    </ResponseField>

    <ResponseField name="dateTime" type="string">
      Timestamp of the funding transaction
    </ResponseField>

  </Expandable>
</ResponseField>

<ResponseExample>
  ```json 200 - Success theme={null}
  [
    {
      "id": "100a99cf-f4d3-4fa1-9be9-2e9828b20ebb",
      "cardId": "1234537292209260487",
      "panLast4": "9189",
      "transactionId": "1122334477422",
      "dateTime": "2024-10-14T10:44:36.276Z",
      "sign": "DEBIT",
      "merchantNameLocation": "WWW.ALIEXPRESS.COM, LONDON",
      "merchantType": "OutOfWalletOnline",
      "mcc": 5964,
      "mccCategory": "MISC",
      "transactionCurrency": "EUR",
      "amountInTransactionCurrency": "0.79",
      "feesInTransactionCurrency": "0",
      "originalCurrency": "USD",
      "amountInOriginalCurrency": "0.85",
      "feesInOriginalCurrency": "0",
      "billingConversionRate": "0.9294117647058824",
      "ecbRate": "0.9161704076958315",
      "status": "CONFIRMED",
      "declineReason": "",
      "fundingSources": [
        {
          "id": "3181a37a-07fa-41dc-b423-6c2db07a7ba1",
          "address": "0x3a11a86cf218c448be519728cd3ac5c741fb3424",
          "network": "linea",
          "txHash": "0xb92de09d893e8162b0861c0f7321f68df02212efbc58f208839ae3f176d89638",
          "currency": "usdc",
          "amount": "0.104201",
          "fees": "0",
          "swapFee": "0.00208",
          "sign": "DEBIT",
          "status": "CONFIRMED",
          "dateTime": "2024-10-14T10:44:36.288Z"
        }
      ]
    }
  ]
  ```
</ResponseExample>

## Error Responses

<ResponseExample>
  ```json 401 - Unauthorized theme={null}
  {
    "message": "Not authenticated"
  }
  ```

```json 403 - Forbidden theme={null}
{
  "message": "Not authorized"
}
```

```json 498 - Invalid Client Key theme={null}
{
  "message": "Invalid client key"
}
```

```json 499 - Missing Client Key theme={null}
{
  "message": "Missing client key"
}
```

```json 500 - Internal Server Error theme={null}
{
  "message": "Internal server error"
}
```

</ResponseExample>

## Pagination

Transactions are returned in pages. The default page size is determined by the backend configuration (typically 20-50 transactions per page).

```typescript theme={null}
async function getAllTransactionsForMonth(year: number, month: number) {
  const transactions: Transaction[] = [];
  let page = 0;
  let hasMore = true;

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const dateTo = new Date(year, month, 0).toISOString().split('T')[0];

  while (hasMore) {
    const pageData = await getTransactions({
      dateFrom,
      dateTo,
      page,
    });

    transactions.push(...pageData);

    hasMore = pageData.length > 0;
    page++;
  }

  return transactions;
}
```

## Common Use Cases

### Recent Transactions

```typescript theme={null}
async function getRecentTransactions(days: number = 7) {
  const dateTo = new Date().toISOString().split('T')[0];
  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return await getTransactions({ dateFrom, dateTo });
}
```

### Spending by Category

```typescript theme={null}
async function getSpendingByCategory(category: string) {
  const transactions = await getTransactions({
    mccCategories: category,
  });

  const total = transactions.reduce((sum, tx) => {
    if (tx.sign === 'DEBIT' && tx.status === 'CONFIRMED') {
      return sum + parseFloat(tx.amountInTransactionCurrency);
    }
    return sum;
  }, 0);

  return { category, total, count: transactions.length };
}
```

### Transaction Search

```typescript theme={null}
async function searchTransactions(query: string) {
  return await getTransactions({
    searchKey: query,
  });
}
```

### Monthly Statement Data

```typescript theme={null}
async function getMonthlyStatement(year: number, month: number) {
  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const dateTo = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  const transactions = await getTransactions({ dateFrom, dateTo });

  const summary = {
    totalSpent: 0,
    totalRefunds: 0,
    transactionCount: transactions.length,
    byCategory: {} as Record<string, number>,
  };

  transactions.forEach((tx) => {
    if (tx.status === 'CONFIRMED') {
      const amount = parseFloat(tx.amountInTransactionCurrency);

      if (tx.sign === 'DEBIT') {
        summary.totalSpent += amount;
      } else if (tx.sign === 'CREDIT') {
        summary.totalRefunds += amount;
      }

      if (!summary.byCategory[tx.mccCategory]) {
        summary.byCategory[tx.mccCategory] = 0;
      }
      summary.byCategory[tx.mccCategory] += amount;
    }
  });

  return summary;
}
```

## Transaction Status Explained

<AccordionGroup>
  <Accordion title="CONFIRMED">
    **Meaning:** Transaction completed successfully and has been settled

    **Actions:** Funds have been deducted/added, blockchain transactions confirmed

    **Display:** Show as final transaction in transaction history

  </Accordion>

  <Accordion title="PENDING">
    **Meaning:** Transaction authorized but not yet settled

    **Actions:** Funds are held/reserved but not yet transferred

    **Display:** Show with pending indicator, may take 1-3 business days to confirm

    **Note:** Pending transactions can still be reversed

  </Accordion>

  <Accordion title="DECLINED">
    **Meaning:** Transaction authorization failed

    **Actions:** No funds were transferred

    **Common Reasons:**

    * Insufficient balance
    * Card frozen or blocked
    * Security concerns
    * Merchant restrictions
    * Network issues

    **Display:** Show with declined indicator and reason if available

  </Accordion>

  <Accordion title="REVERTED">
    **Meaning:** Previously confirmed transaction was reversed/refunded

    **Actions:** Funds returned to original funding source

    **Common Causes:**

    * Merchant refund
    * Dispute resolution
    * Chargeback
    * Transaction cancellation

    **Display:** Show as refund/reversal in transaction history

  </Accordion>
</AccordionGroup>

## Edge Cases and Important Notes

<Warning>
  **Date Range Validation**

Both `dateFrom` and `dateTo` must be provided together. Providing only one will result in both being ignored.
</Warning>

<Note>
  **Pagination Behavior**

If you request a page that doesn't exist (e.g., page 100 when only 10 pages exist), the API returns page 0 instead of an error.
</Note>

<Info>
  **Currency Conversion**

Transactions show both the original merchant currency and the card's transaction currency, along with the conversion rate used. This transparency helps users understand exchange rate costs.
</Info>

<Note>
  **Funding Sources**

Each transaction may have multiple funding sources. The sum of all funding source amounts equals the total transaction amount plus fees.
</Note>

## Related Endpoints

- `GET /v1/card/transactions/statement` - Generate downloadable transaction statement (CSV/PDF)
- `GET /v1/card/status` - Get card information
- `POST /v1/card/freeze` - Freeze card to prevent future transactions

--

Sample response (real data from the API):

```json
[
  {
    "id": "dc8daf02-6327-4acb-bcb2-efc306be33bd",
    "cardId": "1773415024474036571",
    "panLast4": "9106",
    "transactionId": "1000131466219",
    "dateTime": "2026-07-09T17:38:42.108Z",
    "sign": "DEBIT",
    "merchantNameLocation": "IFD*ROBSON LUCIDORO DA, PRAIA GRANDE",
    "merchantType": "OutOfWalletOnline",
    "merchantId": "270695000207664",
    "mcc": 5499,
    "mccCategory": "MISC",
    "transactionCurrency": "USD",
    "amountInTransactionCurrency": "11.95",
    "feesInTransactionCurrency": "0",
    "originalCurrency": "BRL",
    "amountInOriginalCurrency": "61.35",
    "feesInOriginalCurrency": "0",
    "billingConversionRate": "0.19478402607986958",
    "status": "DECLINED",
    "declineReason": "You attempted this MONAD transaction with a balance of 0.500000 USDC. The total transaction cost was $11.95.Your alternative funding sources of MONAD-USDC, LINEA-USDC, MONAD-USDC, MONAD-USDC did not meet the requirements to fund this payment. Please add more funds and try again.",
    "fundingSources": []
  },
  {
    "id": "4355fada-b58b-4b3e-b606-13f91a304d7b",
    "cardId": "1773415024474036571",
    "panLast4": "9106",
    "transactionId": "1000131559458",
    "dateTime": "2026-07-09T15:03:10.659Z",
    "sign": "DEBIT",
    "merchantNameLocation": "IFD*Ponto dos Motorist, Praia Grande",
    "merchantType": "OutOfWalletOnline",
    "merchantId": "270695000328148",
    "mcc": 5499,
    "mccCategory": "MISC",
    "transactionCurrency": "USD",
    "amountInTransactionCurrency": "8.96",
    "feesInTransactionCurrency": "0",
    "originalCurrency": "BRL",
    "amountInOriginalCurrency": "46",
    "feesInOriginalCurrency": "0",
    "billingConversionRate": "0.1947826086956522",
    "status": "CONFIRMED",
    "declineReason": "",
    "fundingSources": [
      {
        "id": "63665bb1-36b4-4366-80e9-073e66b0fc79",
        "address": "0x5b16dce915ee64319136a22e9ab01515c18646df",
        "network": "monad",
        "txHash": "0x46de3d078fdbeabde033c1ccc987c39814d41fcbdc3e761c71da4a32ba8159ed",
        "currency": "veda",
        "amount": "8.933227",
        "fees": "0",
        "swapFee": "0",
        "sign": "DEBIT",
        "dateTime": "2026-07-09T15:03:10.690Z"
      }
    ]
  },
  {
    "id": "db84588b-4e89-4b80-b6be-ac52d09a89bd",
    "cardId": "1773415024474036571",
    "panLast4": "9106",
    "transactionId": "1000128090792",
    "dateTime": "2026-06-26T22:47:08.792Z",
    "sign": "DEBIT",
    "merchantNameLocation": "McDonalds - Arcos Dour, Praia Grande",
    "merchantType": "OutOfWalletOnline",
    "merchantId": "270695000272106",
    "mcc": 5814,
    "mccCategory": "FOOD",
    "transactionCurrency": "USD",
    "amountInTransactionCurrency": "20.82",
    "feesInTransactionCurrency": "0",
    "originalCurrency": "BRL",
    "amountInOriginalCurrency": "107.31",
    "feesInOriginalCurrency": "0",
    "billingConversionRate": "0.1940173329605815",
    "status": "CONFIRMED",
    "declineReason": "",
    "fundingSources": [
      {
        "id": "9595edff-1076-4195-b315-a9f8b9c2cab5",
        "address": "0x5b16dce915ee64319136a22e9ab01515c18646df",
        "network": "monad",
        "txHash": "0x49017b83ca8b1e451b99959529d45e45e392b0fbc32eb77ffc2bb2fe331e5ae6",
        "currency": "veda",
        "amount": "20.801258",
        "fees": "0",
        "swapFee": "0",
        "sign": "DEBIT",
        "dateTime": "2026-06-26T22:47:08.825Z"
      }
    ]
  },
  {
    "id": "b72458cd-6cc1-4929-8caa-28a8c4fbd2e0",
    "cardId": "1773415024474036571",
    "panLast4": "9106",
    "transactionId": "1000110310581",
    "dateTime": "2026-04-17T15:51:56.120Z",
    "sign": "DEBIT",
    "merchantNameLocation": "TRANSAK*METAMASK  MUSD, Lodz",
    "merchantType": "OutOfWalletOnline",
    "merchantId": "000000000538198",
    "mcc": 6051,
    "mccCategory": "MISC",
    "transactionCurrency": "USD",
    "amountInTransactionCurrency": "10.03",
    "feesInTransactionCurrency": "0",
    "originalCurrency": "BRL",
    "amountInOriginalCurrency": "50",
    "feesInOriginalCurrency": "0",
    "billingConversionRate": "0.2006",
    "status": "DECLINED",
    "declineReason": "You attempted this LINEA transaction with a balance of 0.842067 MUSD. The total transaction cost was $10.04.Your alternative funding sources of MONAD-USDC, LINEA-USDT, LINEA-MUSD did not meet the requirements to fund this payment. Please add more funds and try again.",
    "fundingSources": []
  },
  {
    "id": "cc9c140c-8ff4-4264-b9b8-9f52fb1a91b1",
    "cardId": "1773415024474036571",
    "panLast4": "9106",
    "transactionId": "1000109900949",
    "dateTime": "2026-04-15T17:10:37.089Z",
    "sign": "DEBIT",
    "merchantNameLocation": "ConvenienciaPosto, ITANHAEM",
    "merchantType": "OutOfWalletPOS",
    "merchantId": "00123178469",
    "mcc": 5499,
    "mccCategory": "MISC",
    "transactionCurrency": "USD",
    "amountInTransactionCurrency": "2.21",
    "feesInTransactionCurrency": "0",
    "originalCurrency": "BRL",
    "amountInOriginalCurrency": "10.99",
    "feesInOriginalCurrency": "0",
    "billingConversionRate": "0.2010919017288444",
    "status": "CONFIRMED",
    "declineReason": "",
    "fundingSources": [
      {
        "id": "ab91d5d6-1922-4537-9548-fb3be5825be2",
        "address": "0x9e16319a3895f88e74f3b4dea012516df8a75cdc",
        "network": "linea",
        "txHash": "0xe73c53dedaeb8e5b0d1e2db3f75f7b2010e9d56e1a91953f18ad6d9e74af7f0d",
        "currency": "musd",
        "amount": "2.214662",
        "fees": "0.004662",
        "swapFee": "0",
        "sign": "DEBIT",
        "dateTime": "2026-04-15T17:10:37.120Z"
      }
    ]
  },
  {
    "id": "31c26a2f-95e9-4622-947a-a7a1059032e8",
    "cardId": "1773415024474036571",
    "panLast4": "9106",
    "transactionId": "1000084886729",
    "dateTime": "2025-12-15T21:01:03.813Z",
    "sign": "DEBIT",
    "merchantNameLocation": "99* POP 15Dez 18h00min, SAO PAULO",
    "merchantType": "OutOfWalletOnline",
    "merchantId": "270640000000537",
    "mcc": 4121,
    "mccCategory": "TRAVEL",
    "transactionCurrency": "USD",
    "amountInTransactionCurrency": "2.23",
    "feesInTransactionCurrency": "0",
    "originalCurrency": "BRL",
    "amountInOriginalCurrency": "12",
    "feesInOriginalCurrency": "0",
    "billingConversionRate": "0.18583333333333332",
    "status": "DECLINED",
    "declineReason": "You attempted this LINEA transaction with a balance of 0.000000 EURE. The total transaction cost was $2.24.Your alternative funding sources of LINEA-AUSDC, BASE-WETH, LINEA-MUSD, LINEA-WETH, LINEA-USDC, LINEA-USDT, SOLANA-USDT, SOLANA-USDC, LINEA-EURE did not meet the requirements to fund this payment. Please add more funds and try again.",
    "fundingSources": []
  },
  {
    "id": "f12ed9f8-9ad5-46f3-966b-42b7a8318594",
    "cardId": "1773415024474036571",
    "panLast4": "9106",
    "transactionId": "1000084886700",
    "dateTime": "2025-12-15T20:58:55.444Z",
    "sign": "DEBIT",
    "merchantNameLocation": "99* POP 15Dez 17h58min, SAO PAULO",
    "merchantType": "OutOfWalletOnline",
    "merchantId": "270640000000537",
    "mcc": 4121,
    "mccCategory": "TRAVEL",
    "transactionCurrency": "USD",
    "amountInTransactionCurrency": "2.23",
    "feesInTransactionCurrency": "0",
    "originalCurrency": "BRL",
    "amountInOriginalCurrency": "12",
    "feesInOriginalCurrency": "0",
    "billingConversionRate": "0.18583333333333332",
    "status": "DECLINED",
    "declineReason": "You attempted this LINEA transaction with a balance of 0.000000 EURE. The total transaction cost was $2.24.Your alternative funding sources of LINEA-AUSDC, BASE-WETH, LINEA-MUSD, LINEA-WETH, LINEA-USDC, LINEA-USDT, SOLANA-USDT, SOLANA-USDC, LINEA-EURE did not meet the requirements to fund this payment. Please add more funds and try again.",
    "fundingSources": []
  },
  {
    "id": "8ec30ff9-fba1-493d-9838-2fb9625746f6",
    "cardId": "1773415024474036571",
    "panLast4": "9106",
    "transactionId": "1000084373533",
    "dateTime": "2025-12-11T23:28:21.034Z",
    "sign": "DEBIT",
    "merchantNameLocation": "99* POP 11Dez 20h28min, SAO PAULO",
    "merchantType": "OutOfWalletOnline",
    "merchantId": "270640000000537",
    "mcc": 4121,
    "mccCategory": "TRAVEL",
    "transactionCurrency": "USD",
    "amountInTransactionCurrency": "2.13",
    "feesInTransactionCurrency": "0",
    "originalCurrency": "BRL",
    "amountInOriginalCurrency": "11.5",
    "feesInOriginalCurrency": "0",
    "billingConversionRate": "0.1852173913043478",
    "status": "CONFIRMED",
    "declineReason": "",
    "fundingSources": [
      {
        "id": "ecd01af2-3cfb-4958-b6d1-22d4541f5300",
        "address": "0x9e16319a3895f88e74f3b4dea012516df8a75cdc",
        "network": "linea",
        "txHash": "0x9abfa97f9621de76c3946fe07f694a60bd834bd6fc41aae117157815459ea8ec",
        "currency": "musd",
        "amount": "2.15528",
        "fees": "0.004376",
        "swapFee": "0.004293",
        "sign": "DEBIT",
        "dateTime": "2025-12-11T23:28:21.054Z"
      }
    ]
  },
  {
    "id": "118209e9-9d33-4825-b24c-e9c7ab65690a",
    "cardId": "1773415024474036571",
    "panLast4": "9106",
    "transactionId": "1000084163331",
    "dateTime": "2025-12-11T22:21:35.202Z",
    "sign": "DEBIT",
    "merchantNameLocation": "99* POP 11Dez 19h21min, SAO PAULO",
    "merchantType": "OutOfWalletOnline",
    "merchantId": "270640000000537",
    "mcc": 4121,
    "mccCategory": "TRAVEL",
    "transactionCurrency": "USD",
    "amountInTransactionCurrency": "2.43",
    "feesInTransactionCurrency": "0",
    "originalCurrency": "BRL",
    "amountInOriginalCurrency": "13.1",
    "feesInOriginalCurrency": "0",
    "billingConversionRate": "0.1854961832061069",
    "status": "CONFIRMED",
    "declineReason": "",
    "fundingSources": [
      {
        "id": "47ee6dc1-264d-4bc1-addd-c32b0ddc18be",
        "address": "0x9e16319a3895f88e74f3b4dea012516df8a75cdc",
        "network": "base",
        "txHash": "0xff0032a56058714684db8e59254fffb19ce669c69c5939090508a4242db4bc08",
        "currency": "usdc",
        "amount": "2.454434",
        "fees": "0.000316",
        "swapFee": "0.004898",
        "sign": "DEBIT",
        "dateTime": "2025-12-11T22:21:35.222Z"
      }
    ]
  },
  {
    "id": "b2318a2b-f5d7-415a-be3d-64bc328c1f51",
    "cardId": "1773415024474036571",
    "panLast4": "9106",
    "transactionId": "1000080487912",
    "dateTime": "2025-11-23T15:00:19.066Z",
    "sign": "DEBIT",
    "merchantNameLocation": "99* POP 23Nov 12h00min, SAO PAULO",
    "merchantType": "OutOfWalletOnline",
    "merchantId": "270640000000537",
    "mcc": 4121,
    "mccCategory": "TRAVEL",
    "transactionCurrency": "USD",
    "amountInTransactionCurrency": "6.08",
    "feesInTransactionCurrency": "0",
    "originalCurrency": "BRL",
    "amountInOriginalCurrency": "32.4",
    "feesInOriginalCurrency": "0",
    "billingConversionRate": "0.18765432098765433",
    "status": "CONFIRMED",
    "declineReason": "",
    "fundingSources": [
      {
        "id": "dcdc9e3a-69f4-4c9b-97e4-5c94c1d89c4b",
        "address": "0x9e16319a3895f88e74f3b4dea012516df8a75cdc",
        "network": "linea",
        "txHash": "0x5ea772e57f4ab447efd706f22a17dbeea6cfa68d17aac45a7616d21a478b97ba",
        "currency": "usdc",
        "amount": "6.145902",
        "fees": "0.005005",
        "swapFee": "0.012257",
        "sign": "DEBIT",
        "dateTime": "2025-11-23T15:00:19.086Z"
      }
    ]
  }
]
```
