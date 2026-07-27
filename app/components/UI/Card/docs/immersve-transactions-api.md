# Immersve Payments API — Transactions

Reference for the Immersve card purchase transaction endpoints.

Source: <https://docs.immersve.com/api-reference/>

## Authentication

`Authorization: http` — Bearer token (JWT).

```
Authorization: Bearer <token>
```

**Base URL:** `https://api.immersve.com`

**Security schemes:**

- Access Token
- Access Token and Target Account
- Api Key and Api Secret
- Api Key and Api Secret and Target Account

---

## Get Transaction

```
GET https://api.immersve.com/api/transactions/:transactionId
```

Returns the details of a card purchase transaction by a given ID.

### Path parameters

| Name            | Type   | Required | Description                                    |
| --------------- | ------ | -------- | ---------------------------------------------- |
| `transactionId` | string | ✅       | Primary identifier of the transaction to fetch |

### Responses

#### `200` Successful operation

Returns a single [Transaction object](#transaction-object).

Get Transaction additionally includes these PAN fields (not present in List Transactions):

| Field       | Type   | Required | Description                          | Example  |
| ----------- | ------ | -------- | ------------------------------------ | -------- |
| `panFirst6` | string | ✅       | The first 6 digits of the card's PAN | `123456` |
| `panLast6`  | string |          | The last 4 digits of the card's PAN  | `1234`   |

#### `400` Request fields are invalid

See [Error 400](#error-400-bad-request).

#### `403` No Authorization to access resource

See [Error 403](#error-403-forbidden).

---

## List Transactions

```
GET https://api.immersve.com/api/accounts/:accountId/transactions
```

List card purchase transactions by account.

This API uses cursor-based pagination. Start by making a request without a
cursor to get the first page. Use the `nextCursor` from the `pageInfo` in the
response as the cursor for subsequent requests to retrieve further pages.
Continue until `nextCursor` is `undefined`, indicating no more data.

### Path parameters

| Name        | Type   | Required | Description                      |
| ----------- | ------ | -------- | -------------------------------- |
| `accountId` | string | ✅       | accountId linked to transactions |

### Query parameters

| Name       | Type   | Description                                                                                                             |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| `limit`    | number | Amount of records to return (max 1000)                                                                                  |
| `cursor`   | string | Cursor to retrieve the next page                                                                                        |
| `fromUTC`  | string | Filter for transactions from this date (inclusive). ISO 8601 or RFC 2822 string                                         |
| `toUTC`    | string | Filter for transactions up to this date (inclusive). ISO 8601 or RFC 2822 string                                        |
| `statuses` | string | Possible values: [`all`]. By default returns "holding" and "cleared" transactions. Passing "all" includes all statuses. |

### Responses

#### `200` Successful operation

| Field                 | Type     | Description                                         |
| --------------------- | -------- | --------------------------------------------------- |
| `items`               | object[] | Array of [Transaction objects](#transaction-object) |
| `pageInfo`            | object   | Page info for paginated results, undefined if none  |
| `pageInfo.nextCursor` | string   | Cursor for next page, undefined if no more pages    |

Example `pageInfo.nextCursor`: `dGhlIG5leHQgY3Vyc29yIGdvZXMgaGVyZQ==`

##### Example (200)

```json
{
  "items": [
    {
      "id": "4e4607f1b3daf0808499bd3b333e22fd",
      "description": "Air NZ Online Auckland",
      "accountId": "225d85e65495722bf6517ea0ba0d6f56",
      "status": "init",
      "cardId": "6c474aa7a5dc45bff721b5a207cf0f47",
      "amount": "31412",
      "currency": "USD",
      "acquirerAmount": "31412",
      "acquirerCurrency": "NZD",
      "feeAmount": "12",
      "transactionDate": "2022-11-09T03:24:15.182Z",
      "processedDate": "2022-11-09T03:24:15.182Z",
      "reference": "1000000178145",
      "cardAcceptor": {
        "city": "Auckland",
        "countryCode": "NZ",
        "name": "Air NZ Online"
      },
      "creditDebitIndicator": "credit",
      "paymentType": "purchase",
      "relatedPaymentId": "b297658d0cbac11",
      "securityChallenge": {
        "ref": "string",
        "outcome": "string"
      },
      "failureReason": "cvv-invalid"
    }
  ],
  "pageInfo": {
    "nextCursor": "dGhlIG5leHQgY3Vyc29yIGdvZXMgaGVyZQ=="
  }
}
```

#### `400` Request fields are invalid

See [Error 400](#error-400-bad-request).

#### `403` No Authorization to access resource

See [Error 403](#error-403-forbidden).

---

## Transaction object

Shared response shape for both endpoints. (Get Transaction also returns
`panFirst6` / `panLast6`; List Transactions wraps these in `items[]`.)

| Field                  | Type              | Required | Description                                                                                | Example                            |
| ---------------------- | ----------------- | -------- | ------------------------------------------------------------------------------------------ | ---------------------------------- |
| `id`                   | string            | ✅       | The transaction ID                                                                         | `4e4607f1b3daf0808499bd3b333e22fd` |
| `description`          | string            | ✅       | A description of the transaction                                                           | `Air NZ Online Auckland`           |
| `accountId`            | string            | ✅       | Which account this transaction belongs to                                                  | `225d85e65495722bf6517ea0ba0d6f56` |
| `status`               | string            | ✅       | The status of the transaction. Possible values: [`init`, `holding`, `cleared`, `reversed`] | —                                  |
| `cardId`               | string            | ✅       | Which card this transaction belongs to                                                     | `6c474aa7a5dc45bff721b5a207cf0f47` |
| `amount`               | string            | ✅       | The billing amount, an integer in the smallest denomination for the given currency         | `31412`                            |
| `currency`             | string            | ✅       | The billing currency of the transaction                                                    | `USD`                              |
| `acquirerAmount`       | string            | ✅       | The acquirer amount, an integer in the smallest denomination for the given currency        | `31412`                            |
| `acquirerCurrency`     | string            | ✅       | The acquirer currency of the transaction                                                   | `NZD`                              |
| `feeAmount`            | string            | ✅       | The fee amount, an integer in the smallest denomination for the given currency             | `12`                               |
| `transactionDate`      | string<date-time> | ✅       | The created date (ISO) of the transaction                                                  | `2022-11-09T03:24:15.182Z`         |
| `processedDate`        | string<date-time> |          | The cleared date (ISO) of the transaction                                                  | `2022-11-09T03:24:15.182Z`         |
| `reference`            | string            | ✅       | The reference used when making an enquiry through customer support                         | `1000000178145`                    |
| `cardAcceptor`         | object            | ✅       | See [cardAcceptor](#cardacceptor-object)                                                   | —                                  |
| `creditDebitIndicator` | string            |          | Indicates if the transaction was a credit or debit. Possible values: [`credit`, `debit`]   | —                                  |
| `paymentType`          | string            | ✅       | The type of payment. Possible values: [`purchase`, `refund`, `adjustment`]                 | `purchase`                         |
| `relatedPaymentId`     | string            |          | The ID of the related payment transaction, if applicable                                   | `b297658d0cbac11`                  |
| `securityChallenge`    | object            |          | See [securityChallenge](#securitychallenge-object)                                         | —                                  |
| `failureReason`        | string            |          | The reason for transaction failure, if applicable                                          | `cvv-invalid`                      |
| `panFirst6`            | string            | ✅\*     | (Get Transaction only) The first 6 digits of the card's PAN                                | `123456`                           |
| `panLast6`             | string            |          | (Get Transaction only) The last 4 digits of the card's PAN                                 | `1234`                             |

\* Required in the Get Transaction response; not returned by List Transactions.

### cardAcceptor object

| Field         | Type   | Required | Description                           | Example         |
| ------------- | ------ | -------- | ------------------------------------- | --------------- |
| `city`        | string | ✅       | The city of the card acceptor         | `Auckland`      |
| `countryCode` | string | ✅       | The country code of the card acceptor | `NZ`            |
| `name`        | string | ✅       | The name of the card acceptor         | `Air NZ Online` |

### securityChallenge object

Object containing security challenge information, if applicable.

| Field     | Type   | Description                                                                                                                            |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `ref`     | string | 3DS challenge identifier. Correlates with the `ref` in the payload of the `Payment 3DS OTP` webhook.                                   |
| `outcome` | string | 3DS challenge outcome. Values: `challenge-confirmed`, `challenge-exempt`, `challenge-failed`, `challenge-timeout`, `challenge-denied`. |

---

## Error responses

### Error 400 (Bad Request)

| Field              | Type     | Required | Description                                                          | Example                            |
| ------------------ | -------- | -------- | -------------------------------------------------------------------- | ---------------------------------- |
| `statusCode`       | integer  | ✅       | —                                                                    | `400`                              |
| `statusName`       | string   | ✅       | —                                                                    | `Bad Request`                      |
| `errorCode`        | string   | ✅       | —                                                                    | `INVALID_REQUEST_INPUT`            |
| `errors`           | object[] |          | —                                                                    | —                                  |
| `errors[].message` | string   |          | —                                                                    | `Invalid type`                     |
| `errors[].path`    | string   |          | Location of the invalid path param, query param or payload attribute | `items[1].attributes.invalidField` |

```json
{
  "statusCode": 400,
  "statusName": "Bad Request",
  "errorCode": "INVALID_REQUEST_INPUT",
  "errors": [
    {
      "message": "Invalid type",
      "path": "items[1].attributes.invalidField"
    }
  ]
}
```

### Error 403 (Forbidden)

| Field        | Type    | Required | Description | Example        |
| ------------ | ------- | -------- | ----------- | -------------- |
| `statusCode` | integer | ✅       | —           | `403`          |
| `statusName` | string  | ✅       | —           | `Forbidden`    |
| `errorCode`  | string  | ✅       | —           | `FORBIDDEN`    |
| `reason`     | string  |          | —           | `Unauthorized` |

```json
{
  "statusCode": 403,
  "statusName": "Forbidden",
  "errorCode": "FORBIDDEN",
  "reason": "Unauthorized"
}
```
