# MYX Smart Contracts API Documentation

The source code of the MYX V2 Protocol contracts is available on [GitHub](https://github.com/myx-protocol). The core contracts fall into the following categories:

- Broker - Broker System
- Router - Router System
- Oracle - Oracle System
- Trading - Trading System
- Pool - Liquidity Pool System
- Manager - Management System

---

## Broker System

The broker system is the main entry point for users to interact with the protocol, responsible for managing trading orders, fee collection, rebate distribution, and broker configurations.

### BrokerManager

`BrokerManager` is the registry and lifecycle management contract for the broker system.

**Main Features:**

- Create and register new broker contracts
- Activate/deactivate brokers
- Maintain active broker list
- Validate broker status

**Core Methods:**

#### createBroker

```solidity
function createBroker(
    address owner,
    string memory name,
    AssetClass[] memory assetClasses,
    FeeRate[] memory baseFeeRates
) external returns (address broker)
```

Creates and registers a new broker contract.

This function deploys a new broker instance using the beacon proxy pattern and automatically registers it in the system. Only addresses with the `BrokerAdmin` role can call this function. The newly created broker will support the specified asset classes and apply the corresponding base fee rate configurations.

**Input Parameters:**

| Name         | Type         | Description                                                                             |
| ------------ | ------------ | --------------------------------------------------------------------------------------- |
| owner        | address      | Owner address of the broker contract, who will have management permissions              |
| name         | string       | Human-readable name of the broker for identification and display                        |
| assetClasses | AssetClass[] | Array of asset classes supported by this broker (e.g., spot, perpetual)                 |
| baseFeeRates | FeeRate[]    | Array of base fee rates corresponding to asset classes, including taker and maker rates |

**Returns:**

| Type    | Description                                  |
| ------- | -------------------------------------------- |
| address | Address of the newly created broker contract |

#### registerBroker

```solidity
function registerBroker(address broker) external
```

Registers an existing broker contract into the system and activates it.

#### deactivateBroker

```solidity
function deactivateBroker(address broker) external
```

Deactivates and removes a broker from the system.

#### isBroker / isActiveBroker

```solidity
function isBroker(address broker) external view returns (bool)
function isActiveBroker(address broker) external view returns (bool)
```

Check if an address is a registered/active broker.

---

### Broker

`Broker` is the core broker contract that handles trading operations, fee management, and user interactions. Supports multiple asset classes, custom fee tiers, and cryptographic signature verification.

**Main Features:**

- Order management (place, cancel, update)
- Position management (adjust collateral)
- Fee tier configuration
- Rebate distribution
- Signature verification

**Fee Structure:**

- Base Fee: Configured per asset class
- Add-on Fee: Configured per user tier
- Rebate Mechanism: Supports referral rebates

**Core Methods:**

#### placeOrderWithSalt / placeOrderWithPosition

```solidity
function placeOrderWithSalt(
    uint64 userPositionSalt,
    OrderTypes.DepositParams calldata depositParams,
    OrderTypes.PlaceOrderParams calldata orderParams
) external payable

function placeOrderWithPosition(
    PositionId positionId,
    OrderTypes.DepositParams calldata depositParams,
    OrderTypes.PlaceOrderParams calldata orderParams
) external payable
```

Create and submit a new trading order for a new position (using salt) or existing position.

These functions are called by users through a broker contract to create trading orders in the specified pool. Order types can be Market, Limit, Stop (for take-profit/stop-loss), or Conditional. The function validates user collateral, risk parameters, and adds the order to the order book upon successful validation.

**placeOrderWithSalt** is used for new positions, where you provide a unique salt value to derive the position ID.

**placeOrderWithPosition** is used for existing positions, where you directly reference the position ID.

Requirements:

- Broker must be active
- Caller must be the order owner
- Sufficient execution fee must be provided (if required)
- Order parameters must comply with market rules

**Input Parameters:**

| Name             | Type                        | Description                                                                |
| ---------------- | --------------------------- | -------------------------------------------------------------------------- |
| userPositionSalt | uint64                      | (placeOrderWithSalt) Unique salt for computing position ID                 |
| positionId       | PositionId                  | (placeOrderWithPosition) Position ID of existing position                  |
| depositParams    | OrderTypes.DepositParams    | Optional deposit parameters for funding the order                          |
| orderParams      | OrderTypes.PlaceOrderParams | Order parameter structure containing pool ID, direction, size, price, etc. |

**PlaceOrderParams Structure Fields:**

| Field Name        | Type        | Description                                                                      |
| ----------------- | ----------- | -------------------------------------------------------------------------------- |
| user              | address     | Order owner address                                                              |
| poolId            | PoolId      | Target pool ID for execution                                                     |
| positionId        | PositionId  | Associated position ID (0 for new position)                                      |
| orderType         | OrderType   | Order type (Market, Limit, Stop for TP/SL, Conditional)                          |
| triggerType       | TriggerType | Trigger condition (None, GTE - greater than or equal, LTE - less than or equal)  |
| operation         | Operation   | Operation type (Increase or Decrease position)                                   |
| direction         | Direction   | Direction (Long or Short)                                                        |
| collateralAmount  | uint256     | Collateral amount provided (token decimals, e.g., USDC has 6 decimals)           |
| size              | uint256     | Order size in base asset (token decimals)                                        |
| price             | uint256     | Order price (required for limit and TP/SL orders, precision 1e30)                |
| timeInForce       | TimeInForce | Order validity (currently only IOC - Immediate or Cancel supported)              |
| postOnly          | bool        | Maker-only flag (order can only act as maker if true)                            |
| slippagePct       | uint16      | Maximum slippage percentage (precision 1e4, i.e., 10000 = 100%, e.g., 50 = 0.5%) |
| executionFeeToken | address     | Execution fee token address                                                      |
| leverage          | uint16      | Position leverage multiplier (10 = 10x leverage)                                 |
| tpSize            | uint256     | Take-profit order size (token decimals)                                          |
| tpPrice           | uint256     | Take-profit trigger price (precision 1e30)                                       |
| slSize            | uint256     | Stop-loss order size (token decimals)                                            |
| slPrice           | uint256     | Stop-loss trigger price (precision 1e30)                                         |

#### placeOrdersWithSalt / placeOrdersWithPosition

```solidity
function placeOrdersWithSalt(
    OrderTypes.DepositParams calldata depositParams,
    uint64[] calldata userPositionSalts,
    OrderTypes.PlaceOrderParams[] calldata orderParams
) external payable

function placeOrdersWithPosition(
    OrderTypes.DepositParams calldata depositParams,
    PositionId[] calldata positionIds,
    OrderTypes.PlaceOrderParams[] calldata orderParams
) external payable
```

Place multiple trading orders in a single transaction.

These batch functions allow placing multiple orders efficiently in one call, which can reduce transaction overhead and improve user experience. Both functions accept deposit parameters to fund all orders.

**placeOrdersWithSalt** is used for placing orders on new positions, where you provide a unique salt value for each position.

**placeOrdersWithPosition** is used for placing orders on existing positions, where you directly reference each position ID.

**Input Parameters:**

| Name              | Type                          | Description                                                   |
| ----------------- | ----------------------------- | ------------------------------------------------------------- |
| depositParams     | OrderTypes.DepositParams      | Optional deposit parameters to fund all orders                |
| userPositionSalts | uint64[]                      | (placeOrdersWithSalt) Array of salts for new positions        |
| positionIds       | PositionId[]                  | (placeOrdersWithPosition) Array of existing position IDs      |
| orderParams       | OrderTypes.PlaceOrderParams[] | Array of order parameters, must have same length as salts/IDs |

#### cancelOrder / cancelOrders

```solidity
function cancelOrder(OrderId orderId) external
function cancelOrders(OrderId[] calldata orderIds) external
```

Cancel single or multiple trading orders.

Canceling orders removes them from the order book and refunds the order's collateral. Note: Execution fees are not refunded. Only the order owner or broker can cancel orders. The system verifies all orders belong to the caller before canceling.

**Input Parameters:**

| Name     | Type      | Description                        |
| -------- | --------- | ---------------------------------- |
| orderId  | OrderId   | Order ID to cancel                 |
| orderIds | OrderId[] | Array of order IDs to batch cancel |

#### updateOrder

```solidity
function updateOrder(OrderTypes.UpdateOrderParams calldata params) external
```

Update parameters of an existing order.

Allows modification of limit order price, size, and associated take-profit/stop-loss settings. Only the order owner or broker can update orders.

**Input Parameters:**

| Name   | Type                         | Description                      |
| ------ | ---------------------------- | -------------------------------- |
| params | OrderTypes.UpdateOrderParams | Order update parameter structure |

**UpdateOrderParams Structure Fields:**

| Field Name | Type                  | Description                  |
| ---------- | --------------------- | ---------------------------- |
| orderId    | OrderId               | Order ID to update           |
| size       | uint256               | New order size               |
| price      | uint256               | New order price              |
| tpsl       | UpdateOrderTPSLParams | Take-profit/stop-loss update |

**UpdateOrderTPSLParams Structure Fields:**

| Field Name         | Type    | Description                                      |
| ------------------ | ------- | ------------------------------------------------ |
| tpSize             | uint256 | New take-profit order size                       |
| tpPrice            | uint256 | New take-profit trigger price                    |
| slSize             | uint256 | New stop-loss order size                         |
| slPrice            | uint256 | New stop-loss trigger price                      |
| executionFeeToken  | address | Execution fee token address                      |
| useOrderCollateral | bool    | Whether to use order collateral as execution fee |

#### adjustCollateral

```solidity
function adjustCollateral(PositionId positionId, int256 adjustAmount) external
```

Adjust the collateral amount of a position.

This function allows users to increase or decrease collateral for an existing position. Adding collateral reduces liquidation risk, while removing collateral improves capital efficiency. When removing collateral, the system checks if the position still meets minimum collateral requirements.

**Input Parameters:**

| Name         | Type       | Description                                                       |
| ------------ | ---------- | ----------------------------------------------------------------- |
| positionId   | PositionId | Position ID to adjust collateral for                              |
| adjustAmount | int256     | Adjustment amount, positive to add collateral, negative to remove |

#### setUserFeeData

```solidity
function setUserFeeData(SetUserFeeDataParams calldata params) external
```

Set user's fee tier and rebate configuration with cryptographic signature.

This function updates a user's personalized fee configuration, including fee tier and referral rebate settings. To ensure data authenticity, the data must be signed by an authorized signer of the broker. The signature follows the EIP-712 standard, including user address, deadline, and fee data.

Function verifies:

- Signer must be in the authorized signer list
- Signature must be within validity period (deadline)
- Fee data format is correct

**Input Parameters:**

| Name                                  | Type                 | Description                                                                                         |
| ------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------- |
| params                                | SetUserFeeDataParams | Fee data parameter structure                                                                        |
| params.user                           | address              | User address to set fee data for                                                                    |
| params.nonce                          | uint64               | Nonce for signature replay protection                                                               |
| params.deadline                       | uint64               | Unix timestamp when signature expires                                                               |
| params.feeData                        | UserFeeData          | Fee data structure                                                                                  |
| params.feeData.tier                   | uint8                | User's fee tier for calculating add-on fees                                                         |
| params.feeData.referrer               | address              | Referrer address if there is a referral relationship                                                |
| params.feeData.totalReferralRebatePct | uint32               | Total rebate percentage (precision 1e8, i.e., 10000000 = 10%) from broker fees to user and referrer |
| params.feeData.referrerRebatePct      | uint32               | Rebate percentage (precision 1e8) allocated to referrer from total rebate                           |
| params.signature                      | bytes                | EIP-712 signature from authorized signer on the above data                                          |

#### claimRebate / claimRebates

```solidity
function claimRebate(address token) external
function claimRebates(address[] calldata tokens) external
```

Claim accumulated rebate rewards.

Users can claim their accumulated referral rebates and trading rebates through these functions. Rebate sources include refunds from user's own trading fees and commissions from referring others.

**Input Parameters:**

| Name   | Type      | Description                                 |
| ------ | --------- | ------------------------------------------- |
| token  | address   | Token address to claim rebates for          |
| tokens | address[] | Array of token addresses for batch claiming |

#### getUserFeeRate

```solidity
function getUserFeeRate(
    address user,
    AssetClass assetClass
) external view returns (
    uint32 takerFeeRate,
    int32 makerFeeRate,
    uint32 baseTakerFeeRate,
    uint32 baseMakerFeeRate
)
```

Get user's fee rate configuration for a specific asset class.

This function calculates and returns the user's final trading fee rates, including base rates and user tier add-on rates. Fee rates use precision of 1e8 (i.e., 100000000 = 100%), for example, 1000000 = 1%.

**Returns:**

| Name             | Type   | Description                                                                              |
| ---------------- | ------ | ---------------------------------------------------------------------------------------- |
| takerFeeRate     | uint32 | Final taker fee rate (base fee + add-on fee, precision 1e8)                              |
| makerFeeRate     | int32  | Final maker fee rate (base fee + add-on fee, precision 1e8), can be negative for rebates |
| baseTakerFeeRate | uint32 | Base taker fee rate (precision 1e8)                                                      |
| baseMakerFeeRate | uint32 | Base maker fee rate (precision 1e8)                                                      |

#### onBrokerFee

```solidity
function onBrokerFee(
    PoolId poolId,
    address user,
    address token,
    uint256 feeAmount
) external returns (
    uint256 totalReferralRebate,
    uint256 referrerRebate,
    address referrer
)
```

Broker fee callback function. Called by Settler when broker fees are collected to handle rebate distribution.

---

### MYXBroker

`MYXBroker` extends `Broker` to support negative maker fee rates for special users, allowing them to earn rebates for providing liquidity.

**Additional Features:**

- Support for negative maker fee rates (users earn rebates for market making)
- Special fee tier assignment

**Core Methods:**

#### setUserSpecialFeeTier

```solidity
function setUserSpecialFeeTier(address user, uint8 feeTier) external
```

Assign a special fee tier to a user. Only callable by contract owner.

#### setSpecialFeeTier

```solidity
function setSpecialFeeTier(uint8 feeTier, int32 makerFeeRate, uint32 takerFeeRate) external
```

Configure fee rates for a special tier. Maker fee rate can be negative to provide rebates.

---

### BrokerFactory

`BrokerFactory` creates broker instances using the beacon proxy pattern, allowing for upgradeable broker contracts.

**Main Features:**

- Create brokers using beacon proxy pattern
- Unified broker implementation upgrades

**Core Methods:**

#### createBroker

```solidity
function createBroker(
    address owner,
    string memory name,
    AssetClass[] memory assetClasses,
    FeeRate[] memory baseFeeRates
) external returns (address)
```

Create a new broker proxy instance. Can only be called by BrokerManager.

---

## Router System

The router system provides convenient entry points for liquidity pool operations and take-profit/stop-loss order management.

### LiquidityRouter

`LiquidityRouter` is the primary entry point for liquidity pool operations and TPSL (Take Profit Stop Loss) order management.

**Main Features:**

1. Deposit and withdrawal operations for Base Pool and Quote Pool
2. Creation, management, and automated execution of TPSL orders
3. Asset exchange functionality during Base Pool withdrawals (Base Token to Quote Token)
4. Price trigger validation and order execution mechanisms
5. Liquidity migration between pools

**Core Methods:**

#### depositBase / depositQuote

```solidity
function depositBase(DepositParams calldata params) external
function depositBase(
    IOracle.UpdatePriceParams[] calldata prices,
    DepositParams calldata params
) external payable

function depositQuote(DepositParams calldata params) external
function depositQuote(
    IOracle.UpdatePriceParams[] calldata prices,
    DepositParams calldata params
) external payable
```

Deposit liquidity into Base Pool or Quote Pool and mint LP tokens.

This function allows users to deposit assets into liquidity pools, providing liquidity as a counterparty for traders. After depositing, users receive LP tokens (pool tokens) representing their share. Two versions exist: one for direct deposit and another that updates oracle prices before deposit to ensure LP token calculation uses the latest prices.

Deposit flow:

1. (Optional) Update oracle prices
2. Transfer assets from user account
3. Calculate LP token amount based on current pool price
4. Mint LP tokens to recipient
5. (Optional) Create take-profit/stop-loss orders for the deposited LP

**Input Parameters:**

| Name                | Type                        | Description                                                                         |
| ------------------- | --------------------------- | ----------------------------------------------------------------------------------- |
| prices              | IOracle.UpdatePriceParams[] | (Optional) Array of oracle price update data for updating pool price before deposit |
| params              | DepositParams               | Deposit parameter structure                                                         |
| params.poolId       | PoolId                      | Unique identifier of the target pool                                                |
| params.amountIn     | uint256                     | Amount of assets to deposit (Base Token or Quote Token)                             |
| params.minAmountOut | uint256                     | Minimum expected LP tokens for slippage protection                                  |
| params.recipient    | address                     | Address to receive LP tokens                                                        |
| params.tpslParams   | TpslParams[]                | Optional array of take-profit/stop-loss order parameters                            |

#### withdrawBase / withdrawQuote

```solidity
function withdrawBase(WithdrawParams calldata params) external
function withdrawBase(
    IOracle.UpdatePriceParams[] calldata prices,
    WithdrawParams calldata params
) external payable

function withdrawQuote(WithdrawParams calldata params) external
function withdrawQuote(
    IOracle.UpdatePriceParams[] calldata prices,
    WithdrawParams calldata params
) external payable
```

Withdraw from Base Pool or Quote Pool. Optionally update oracle prices before withdrawal.

#### addTpsl

```solidity
function addTpsl(AddTpslParams calldata params) external
```

Add take-profit/stop-loss orders for existing liquidity positions.

**TpslParams Structure:**

```solidity
struct TpslParams {
  uint256 amount; // LP token amount
  uint256 triggerPrice; // Trigger price
  TriggerType triggerType; // Trigger type (GTE/LTE)
  uint256 minQuoteOut; // Minimum quote token output
}
```

#### cancelTpsl

```solidity
function cancelTpsl(uint256 orderId) external
```

Cancel a TPSL order. Only the order owner can cancel.

#### executeTpsl

```solidity
function executeTpsl(
    IOracle.UpdatePriceParams[] calldata prices,
    uint256 orderId,
    uint256 quoteInIfNecessary,
    uint256 minOut
) external payable returns (uint256 baseOut, uint256 quoteOut)

function executeTpsl(
    uint256 orderId,
    uint256 quoteInIfNecessary,
    uint256 minOut
) external returns (uint256 baseOut, uint256 quoteOut)
```

Execute a TPSL order. Anyone can execute when the pool token price reaches the trigger price. Executors may earn rewards.

**Parameters:**

- `prices` - Oracle price update data (optional)
- `orderId` - TPSL order ID to execute
- `quoteInIfNecessary` - Quote token amount needed for Base Pool withdrawal
- `minOut` - Minimum output amount (slippage protection)

#### migrateLiquidity

```solidity
function migrateLiquidity(MigrateLiquidityParams calldata params) external
```

Migrate liquidity between different pools in the same market.

**MigrateLiquidityParams Structure:**

```solidity
struct MigrateLiquidityParams {
  PoolId fromPoolId; // Source pool ID
  PoolId toPoolId; // Target pool ID
  uint256 amount; // LP token amount to migrate
  uint256 minLpOut; // Minimum LP output in target pool
}
```

#### claimBasePoolRebate / claimQuotePoolRebate

```solidity
function claimBasePoolRebate(PoolId poolId, address recipient) external
function claimBasePoolRebates(PoolId[] memory poolIds, address recipient) external
function claimQuotePoolRebate(PoolId poolId, address recipient) external
function claimQuotePoolRebates(PoolId[] memory poolIds, address recipient) external
```

Claim rebate rewards from liquidity pools.

---

### Forwarder

`Forwarder` implements ERC2771 meta-transaction functionality, allowing relayers to submit transactions on behalf of users.

**Main Features:**

- Meta-transaction forwarding (Gasless transactions)
- Relayer management
- Fee collection and gas sponsorship
- Whitelist target contract management

**Core Methods:**

#### approveForwarder

```solidity
function approveForwarder(address account, address relayer, bool enable) external
```

Authorize or revoke a relayer to forward transactions on behalf of an account.

#### executeForwarder

```solidity
function executeForwarder(ForwardRequestData calldata params) external payable
```

Execute a single meta-transaction request. Only authorized relayers can call.

#### batchExecuteForwarder

```solidity
function batchExecuteForwarder(ForwardRequestData[] calldata bundleParams) external payable
```

Execute multiple meta-transaction requests in batch.

#### permitAndApproveForwarder

```solidity
function permitAndApproveForwarder(
    address relayer,
    bool enable,
    ERC20PermitParams[] calldata permitParams
) external
```

Use ERC20 permit signature and authorize a relayer.

---

### Paymaster

`Paymaster` manages gas sponsorship and fee conversion.

**Main Features:**

- Gas deposit and withdrawal management
- Gas sponsorship for relayers
- Fee token to ETH conversion
- ETH balance monitoring

**Core Methods:**

#### depositGas

```solidity
function depositGas() external payable
```

Deposit ETH into Paymaster for gas sponsorship.

#### withdrawGas

```solidity
function withdrawGas(address to, uint256 amount) external
```

Withdraw ETH. Only risk admins can call.

#### sponsorGas

```solidity
function sponsorGas(address operator, uint256 amount) external
```

Sponsor gas for an operator. Can only be called by Forwarder.

---

## Oracle System

The oracle system provides reliable price data sources, supporting multiple oracle types and adapters.

### MYXOracle

`MYXOracle` is the protocol's main oracle contract, managing price feeds and market data.

**Main Features:**

- Price data storage and retrieval
- Price validity verification
- Support for multiple oracle types (Chainlink, Pyth, etc.)
- Price deviation protection
- Time rewind support (for testing and backtesting)

**Core Methods:**

#### updatePrices

```solidity
function updatePrices(UpdatePriceParams[] calldata params) external payable
```

Batch update oracle price data for pools.

This function submits the latest price data to the protocol. Callers must provide oracle price proof data and corresponding verification fees. The function validates the price data's validity, including signature verification, timestamp checks, and price deviation validation.

Price update flow:

1. Verify price data signature and source
2. Pay oracle verification fee
3. Check if price deviation is within allowed range
4. Update price storage

This function is typically called by Keepers, traders, or other automated services to ensure the protocol uses the latest market prices.

**Input Parameters:**

| Name                      | Type                | Description                                                              |
| ------------------------- | ------------------- | ------------------------------------------------------------------------ |
| params                    | UpdatePriceParams[] | Array of price update parameters, supports batch updating multiple pools |
| params[].poolId           | PoolId              | Pool ID that needs price update                                          |
| params[].oracleType       | OracleType          | Oracle type (Chainlink, Pyth, etc.)                                      |
| params[].oracleUpdateData | bytes               | Price proof data provided by oracle (format depends on oracle type)      |
| params[].publishTime      | uint64              | Timestamp when price was published, for freshness verification           |
| params[].referencePrice   | uint256             | Reference price for deviation check to prevent price manipulation        |

**Note:** Call must include sufficient ETH as oracle verification fee. Fee amount can be queried via oracle adapter's `getFee()`.

#### getMarketPrice

```solidity
function getMarketPrice(PoolId poolId) external view returns (
    uint256 price,
    uint64 publishTime
)
```

Get verified market price with deviation check.

This function returns the current market price for the specified pool and performs multiple safety checks before returning. If the price data is stale or price deviation exceeds configured threshold, the function will revert the transaction, ensuring the protocol doesn't use unreliable price data.

Price validation checks:

1. **Freshness check**: Verify price publish time plus validity period (`priceAge`) is greater than current time
2. **Deviation check**: Verify oracle price deviation from reference price is within pool's configured `maxPriceDeviation`
3. **Rewind mode**: If time rewind mode is enabled (during testing), return rewind price data instead

This function is typically called before executing trades, liquidations, settlements, and other critical operations to ensure operations are based on accurate market prices.

**Input Parameters:**

| Name   | Type   | Description                |
| ------ | ------ | -------------------------- |
| poolId | PoolId | Pool ID to query price for |

**Returns:**

| Name        | Type    | Description                             |
| ----------- | ------- | --------------------------------------- |
| price       | uint256 | Verified oracle price (precision 1e30)  |
| publishTime | uint64  | Unix timestamp when price was published |

#### safeOraclePrice

```solidity
function safeOraclePrice(PoolId poolId) external view returns (uint256)
```

Get safe oracle price. Reverts if price is stale. Also supports rewind mode.

**Returns:** Oracle price with precision 1e30

#### latestOraclePrice

```solidity
function latestOraclePrice(PoolId poolId) external view returns (uint256)
```

Get latest oracle price without checking freshness.

**Returns:** Oracle price with precision 1e30

#### getPriceData

```solidity
function getPriceData(PoolId poolId) external view returns (Price memory)
```

Get complete price data structure.

**Price Structure:**

```solidity
struct Price {
  uint256 oraclePrice; // Oracle price (precision 1e30)
  uint256 referencePrice; // Reference price for deviation checking (precision 1e30)
  uint64 publishTime; // Unix timestamp when price was published
}
```

#### getPriceAge

```solidity
function getPriceAge() external view returns (uint32)
```

Get the current price validity period in seconds.

**Returns:** Maximum age of price data before it's considered stale

---

### OracleRegistry

`OracleRegistry` is the registry for oracle adapters, managing different types of oracle adapters.

**Core Query Methods:**

#### getOracleAdapter

```solidity
function getOracleAdapter(OracleType oracleType) external view returns (address adapter)
```

Get adapter address for specified oracle type.

**Input Parameters:**

| Name       | Type       | Description |
| ---------- | ---------- | ----------- |
| oracleType | OracleType | Oracle type |

**Returns:** Adapter contract address for the specified oracle type

---

### OracleReserve

`OracleReserve` manages the collection and processing of oracle fees.

**Core Query Methods:**

#### getPoolOracleFee

```solidity
function getPoolOracleFee(PoolId poolId) external view returns (OracleFee memory)
```

Get pool's oracle fee status.

**OracleFee Structure:**

```solidity
struct OracleFee {
  address primer; // Primer address
  uint256 baseAmount; // Base token amount
  uint256 quoteAmount; // Quote token amount
  OracleFeeState state; // Fee state (None/Charged/SoldOut)
}
```

---

### Oracle Adapters

Oracle adapters integrate different oracle providers (such as Chainlink, Pyth) into the protocol.

#### BaseOracleAdapter

Abstract base class for all oracle adapters.

**Core Interface:**

```solidity
function verifyPrice(
    bytes32 priceId,
    bytes memory payload,
    uint64 publishTime
) external payable returns (PriceInfo memory)

function getFee(bytes[] memory updateData) external view returns (uint256)
```

#### ChainlinkAdapter

Chainlink oracle adapter, supports Data Streams.

**Features:**

- Verify Chainlink price data
- Handle fee management
- Support Report V2 and V3 formats

**Core Methods:**

```solidity
function initialize(address addressManager, address _chainlink) external
function updateVerifyAddress(address newAddress) external
```

#### PythAdapter

Pyth Network oracle adapter.

**Features:**

- Verify Pyth price data
- Handle Pyth network fees
- Price confidence checks

---

## Trading System

### OrderManager

`OrderManager` manages order creation, modification, execution, and tracking. It maintains the order book and provides query interfaces for order and position information.

> **Note:** Order placement, cancellation, and update operations are performed through the `Broker` contract. The methods below are read-only query methods available to external callers.

**Core Query Methods:**

#### getOrder

```solidity
function getOrder(OrderId orderId) external view returns (OrderMetadata memory)
```

Get complete metadata information of an order.

**Input Parameters:**

| Name    | Type    | Description       |
| ------- | ------- | ----------------- |
| orderId | OrderId | Order ID to query |

**Returns:**

| Name          | Type          | Description    |
| ------------- | ------------- | -------------- |
| orderMetadata | OrderMetadata | Order metadata |

**OrderMetadata Structure Main Fields:**

| Field Name       | Type        | Description                                                    |
| ---------------- | ----------- | -------------------------------------------------------------- |
| user             | address     | Order owner address                                            |
| poolId           | PoolId      | Pool ID where order will be executed                           |
| positionId       | PositionId  | Associated position ID (0 for new positions)                   |
| collateralAmount | uint256     | Collateral amount for the order (token decimals)               |
| size             | uint256     | Order size in base asset units (token decimals)                |
| price            | uint256     | Order price (precision 1e30)                                   |
| filledSize       | uint256     | Amount already filled                                          |
| orderType        | OrderType   | Order type (Market, Limit, Stop, Conditional)                  |
| triggerType      | TriggerType | Trigger condition (None, GTE, LTE)                             |
| operation        | Operation   | Operation type (Increase, Decrease)                            |
| direction        | Direction   | Trade direction (Long, Short)                                  |
| timeInForce      | TimeInForce | Order validity (currently only IOC supported)                  |
| slippagePct      | uint16      | Maximum slippage tolerance (precision 1e4, i.e., 10000 = 100%) |
| postOnly         | bool        | Maker-only flag (order can only act as maker if true)          |
| createdAt        | uint64      | Order creation timestamp                                       |
| broker           | address     | Broker address (for fee sharing)                               |

#### getUserOrders

```solidity
function getUserOrders(address user) external view returns (OrderId[] memory)
```

Get list of all order IDs for a user.

**Input Parameters:**

| Name | Type    | Description           |
| ---- | ------- | --------------------- |
| user | address | User address to query |

**Returns:**

| Name     | Type      | Description        |
| -------- | --------- | ------------------ |
| orderIds | OrderId[] | Array of order IDs |

#### isOrderOwner

```solidity
function isOrderOwner(OrderId orderId, address user) external view returns (bool)
```

Check if the specified user is the order owner.

**Input Parameters:**

| Name    | Type    | Description  |
| ------- | ------- | ------------ |
| orderId | OrderId | Order ID     |
| user    | address | User address |

**Returns:**

| Name    | Type | Description                     |
| ------- | ---- | ------------------------------- |
| isOwner | bool | Whether user is the order owner |

#### isAllOrderOwner

```solidity
function isAllOrderOwner(OrderId[] calldata orderIds, address user) external view returns (bool)
```

Check if the specified user is the owner of all orders in the array.

**Input Parameters:**

| Name     | Type      | Description           |
| -------- | --------- | --------------------- |
| orderIds | OrderId[] | Array of order IDs    |
| user     | address   | User address to check |

**Returns:**

| Name    | Type | Description                           |
| ------- | ---- | ------------------------------------- |
| isOwner | bool | Whether user owns all orders in array |

#### getUserPoolOrders

```solidity
function getUserPoolOrders(address user, PoolId poolId) external view returns (OrderId[] memory)
```

Get list of all order IDs for a user in a specific pool.

**Input Parameters:**

| Name   | Type    | Description           |
| ------ | ------- | --------------------- |
| user   | address | User address to query |
| poolId | PoolId  | Pool ID to filter by  |

**Returns:**

| Name     | Type      | Description                    |
| -------- | --------- | ------------------------------ |
| orderIds | OrderId[] | Array of order IDs in the pool |

---

### PositionManager

`PositionManager` manages trading positions and their lifecycle. Implemented as ERC721, each position is an NFT.

**Core Query Methods:**

#### getPosition

```solidity
function getPosition(PositionId positionId) external view returns (PositionMetadata memory)
```

Get complete metadata information of a position.

**Input Parameters:**

| Name       | Type       | Description          |
| ---------- | ---------- | -------------------- |
| positionId | PositionId | Position ID to query |

**Returns:**

| Name             | Type             | Description       |
| ---------------- | ---------------- | ----------------- |
| positionMetadata | PositionMetadata | Position metadata |

**PositionMetadata Structure Main Fields:**

| Field Name       | Type      | Description                                        |
| ---------------- | --------- | -------------------------------------------------- |
| poolId           | PoolId    | Pool ID where position exists                      |
| size             | uint256   | Position size in base asset units (token decimals) |
| entryPrice       | uint256   | Average entry price (precision 1e30)               |
| fundingRateIndex | int256    | Funding rate tracking index                        |
| earlyClosePrice  | uint256   | Preset early close price (0 if not set)            |
| direction        | Direction | Position direction (Long, Short)                   |
| riskTier         | uint8     | Risk tier level when position was opened           |
| entryTime        | uint64    | Timestamp when position was first opened           |
| lastUpdateTime   | uint64    | Timestamp of last position update                  |

#### getPositionOwner

```solidity
function getPositionOwner(PositionId positionId) external view returns (address)
```

Get the owner address of a position.

**Input Parameters:**

| Name       | Type       | Description |
| ---------- | ---------- | ----------- |
| positionId | PositionId | Position ID |

**Returns:**

| Name  | Type    | Description            |
| ----- | ------- | ---------------------- |
| owner | address | Position owner address |

#### getOITracker

```solidity
function getOITracker(PoolId poolId) external view returns (OITracker memory)
```

Get open interest tracking information for a pool.

**Input Parameters:**

| Name   | Type   | Description |
| ------ | ------ | ----------- |
| poolId | PoolId | Pool ID     |

**Returns:**

| Name      | Type      | Description           |
| --------- | --------- | --------------------- |
| oiTracker | OITracker | Open interest tracker |

**OITracker Structure Fields:**

| Field Name     | Type    | Description                         |
| -------------- | ------- | ----------------------------------- |
| tracker        | int256  | Net position tracker (long - short) |
| longSize       | uint256 | Total long position size            |
| shortSize      | uint256 | Total short position size           |
| poolEntryPrice | uint256 | Pool's average entry price          |

#### getUserPositions

```solidity
function getUserPositions(address user) external view returns (PositionId[] memory)
```

Get list of all position IDs for a user.

**Input Parameters:**

| Name | Type    | Description  |
| ---- | ------- | ------------ |
| user | address | User address |

**Returns:**

| Name        | Type         | Description           |
| ----------- | ------------ | --------------------- |
| positionIds | PositionId[] | Array of position IDs |

#### getUserPoolPositionIds

```solidity
function getUserPoolPositionIds(address user, PoolId poolId) external view returns (PositionId[] memory)
```

Get list of all position IDs for a user in a specific pool.

**Input Parameters:**

| Name   | Type    | Description           |
| ------ | ------- | --------------------- |
| user   | address | User address to query |
| poolId | PoolId  | Pool ID to filter by  |

**Returns:**

| Name        | Type         | Description                   |
| ----------- | ------------ | ----------------------------- |
| positionIds | PositionId[] | Array of position IDs in pool |

#### isPositionExists

```solidity
function isPositionExists(PositionId positionId) external view returns (bool)
```

Check if a position exists.

**Input Parameters:**

| Name       | Type       | Description |
| ---------- | ---------- | ----------- |
| positionId | PositionId | Position ID |

**Returns:**

| Name   | Type | Description             |
| ------ | ---- | ----------------------- |
| exists | bool | Whether position exists |

#### getPositionByTokenId

```solidity
function getPositionByTokenId(uint256 tokenId) external view returns (PositionMetadata memory)
```

Get position metadata by NFT token ID.

Since positions are ERC721 NFTs, this function retrieves a position using its NFT token ID instead of position ID.

**Input Parameters:**

| Name    | Type    | Description  |
| ------- | ------- | ------------ |
| tokenId | uint256 | NFT token ID |

**Returns:**

| Name             | Type             | Description       |
| ---------------- | ---------------- | ----------------- |
| positionMetadata | PositionMetadata | Position metadata |

> **Note:** Position execution, collateral adjustment, and closing operations are performed through the `Broker` contract or internal system calls. The methods above are read-only query methods available to external callers.

**Position NFT Methods:**

#### mintPositionNFT

```solidity
function mintPositionNFT(PositionId positionId, address recipient) external returns (PositionId newPositionId, uint256 tokenId)
```

Mint an NFT representing a position (ERC721 transfer).

Positions can be transferred as NFTs. This function mints an NFT for position transfer.

**Input Parameters:**

| Name       | Type       | Description                 |
| ---------- | ---------- | --------------------------- |
| positionId | PositionId | Position ID to mint NFT for |
| recipient  | address    | Recipient of NFT            |

**Returns:**

| Name          | Type       | Description     |
| ------------- | ---------- | --------------- |
| newPositionId | PositionId | New position ID |
| tokenId       | uint256    | NFT token ID    |

---

## Pool System

### PoolManager

`PoolManager` manages the creation, configuration, and lifecycle of liquidity pools.

**Main Features:**

- Pool creation and registration
- Pool state management
- Pool configuration updates

**Core Methods:**

#### getPool

```solidity
function getPool(PoolId poolId) external view returns (PoolMetadata memory)
```

Get pool metadata.

#### checkPoolExists

```solidity
function checkPoolExists(PoolId poolId) external view returns (bool)
```

Check if pool exists.

---

### BasePool / QuotePool

Base Pool and Quote Pool manage liquidity provision and counterparty trading.

**Main Features:**

- Liquidity deposits and withdrawals
- Pool token (LP Token) minting and burning
- Fee distribution
- Rebate management

**Core Methods:**

#### deposit

```solidity
function deposit(
    PoolId poolId,
    uint256 amountIn,
    uint256 minAmountOut,
    address from,
    address recipient
) external returns (uint256 lpOut)
```

Deposit liquidity, mint LP tokens.

#### withdraw

```solidity
function withdraw(
    PoolId poolId,
    uint256 lpAmount,
    uint256 minAmountOut,
    address from,
    address recipient
) external returns (uint256 amountOut, uint256 rebateOut)
```

Burn LP tokens, withdraw liquidity.

---

## Management System

### AddressManager

Centralized address registry that manages all protocol contract addresses.

### RoleManager

Role-based access control management.

**Role Types:**

- `ADMIN` - System administrator
- `RISK_ADMIN` - Risk parameter administrator
- `ORACLE_ADMIN` - Oracle administrator
- `BROKER_ADMIN` - Broker administrator
- `KEEPER` - Keeper (executes automated tasks)
- `RELAYER` - Relayer (meta-transactions)

### RiskController

`RiskController` is the protocol's risk control center, responsible for managing and monitoring system risks to protect the interests of liquidity providers and traders.

**Main Features:**

- **Liquidity Lock**: Prevents pool liquidity from being consumed rapidly through time window and price range restrictions
- **Position Risk Checks**: Validates whether opening/increasing position operations meet risk parameter requirements
- **Leverage Limits**: Restricts maximum leverage multiples for different pools based on risk tiers
- **Liquidation Threshold Management**: Manages maintenance margin rates to ensure timely liquidation of risky positions
- **Open Interest (OI) Monitoring**: Tracks and limits open interest in pools to prevent excessive risk concentration

**Core Query Methods:**

#### getLiquidityLock

```solidity
function getLiquidityLock(PoolId poolId) external view returns (LiquidityLock memory)
```

Get the liquidity lock status of a pool.

The liquidity lock mechanism protects liquidity providers from large trade impacts by limiting trading volume within specific time windows and price ranges.

**Input Parameters:**

| Name   | Type   | Description      |
| ------ | ------ | ---------------- |
| poolId | PoolId | Pool ID to query |

**Returns:**

| Name | Type          | Description           |
| ---- | ------------- | --------------------- |
| lock | LiquidityLock | Liquidity lock status |

**LiquidityLock Structure Fields:**

| Field Name   | Type    | Description                                                                   |
| ------------ | ------- | ----------------------------------------------------------------------------- |
| windowAnchor | uint64  | Time window anchor (Unix timestamp)                                           |
| priceFloor   | uint256 | Price floor (precision 1e30)                                                  |
| priceCeiling | uint256 | Price ceiling (precision 1e30)                                                |
| openInterest | int256  | Accumulated open interest within current window (can be positive or negative) |

---

### RiskParameter

`RiskParameter` manages parameter configurations for different risk tiers, providing risk control benchmarks for each pool.

**Main Features:**

- **Risk Tier Configuration**: Manages parameter sets for different riskTiers
- **Leverage and Margin Management**: Configures maximum leverage and maintenance margin rates
- **Slippage and Liquidity Parameters**: Sets base slippage and window capacity limits
- **Funding Rate Parameters**: Configures parameters for funding rate calculations
- **Collateral Parameters**: Sets ratio for base tokens as collateral

**Core Query Methods:**

#### getRiskParamData

```solidity
function getRiskParamData(uint8 riskTier) external view returns (RiskParamData memory)
```

Get complete parameter configuration for a specified risk tier.

**Input Parameters:**

| Name     | Type  | Description                                     |
| -------- | ----- | ----------------------------------------------- |
| riskTier | uint8 | Risk tier (0-255, higher numbers = higher risk) |

**Returns:**

| Name       | Type          | Description                   |
| ---------- | ------------- | ----------------------------- |
| riskParams | RiskParamData | Risk parameter data structure |

**RiskParamData Structure Fields:**

| Field Name               | Type              | Description                                                           |
| ------------------------ | ----------------- | --------------------------------------------------------------------- |
| minTradeUsd              | uint128           | Minimum trade amount (USD, precision based on USD_DECIMALS = 6)       |
| maxWindowCapUsd          | uint128           | Maximum trading capacity within time window (USD)                     |
| windowSize               | uint64            | Time window size (seconds)                                            |
| priceRangePct            | uint16            | Price range percentage (precision 1e4, i.e., 10000 = 100%)            |
| baseSlippage             | uint16            | Base slippage (precision 1e4)                                         |
| leverage                 | uint16            | Maximum leverage multiplier (10 = 10x leverage)                       |
| maintainMarginRate       | uint16            | Maintenance margin rate (precision 1e4, e.g., 500 = 5%)               |
| baseTokenCollateralRatio | uint16            | Ratio for base tokens as collateral (precision 1e2, i.e., 100 = 100%) |
| exchangeIncentiveRate    | uint16            | Exchange incentive rate (precision 1e4)                               |
| assetClass               | AssetClass        | Asset class (SPOT, PERPETUAL, etc.)                                   |
| genesisRebateRatio       | uint16            | Genesis liquidity rebate ratio (precision 1e4)                        |
| fundingRateParams        | FundingRateParams | Funding rate parameters                                               |

**FundingRateParams Structure Fields:**

| Field Name       | Type   | Description                               |
| ---------------- | ------ | ----------------------------------------- |
| maxRate          | int32  | Maximum funding rate (precision 1e8)      |
| equilibriumRange | uint32 | Equilibrium range (precision 1e8)         |
| lowGrowthRate    | int32  | Low growth rate (precision 1e8)           |
| highGrowthRate   | int32  | High growth rate (precision 1e8)          |
| epochDuration    | uint64 | Funding rate calculation period (seconds) |

#### getFundingRateParams

```solidity
function getFundingRateParams(uint8 riskTier) external view returns (FundingRateParams memory)
```

Get funding rate parameters for a specified risk tier.

**Input Parameters:**

| Name     | Type  | Description |
| -------- | ----- | ----------- |
| riskTier | uint8 | Risk tier   |

**Returns:**

| Name              | Type              | Description                      |
| ----------------- | ----------------- | -------------------------------- |
| fundingRateParams | FundingRateParams | Funding rate parameter structure |

---

### Risk Control Mechanism Overview

#### 1. Liquidity Lock Mechanism

Liquidity lock protects liquidity providers through:

- **Time Window Restriction**: Limits total liquidity consumption within a specified time window (e.g., 1 hour)
- **Price Range Restriction**: Locks a price range (e.g., ±5%), resets window when exceeded
- **Open Interest Tracking**: Accumulates net open interest within window to prevent excessive one-sided risk

**How It Works:**

1. Each pool maintains a liquidity lock state (windowAnchor, priceFloor, priceCeiling, openInterest)
2. New order execution checks if within current window and price range
3. Creates new window if time or price range is exceeded
4. Accumulated openInterest cannot exceed maxWindowCapUsd

#### 2. Margin and Liquidation Mechanism

- **Initial Margin**: Minimum margin required to open a position = Position Value / leverage
- **Maintenance Margin**: Minimum margin to maintain position = Position Value × maintainMarginRate
- **Liquidation Trigger**: Liquidation is triggered when account margin ratio falls below maintenance margin rate

**Margin Ratio Calculation:**

```
Margin Ratio = (Account Equity / Position Value) × 100%
Account Equity = Collateral + Unrealized PnL - Funding Fees
```

#### 3. Risk Tier System

The protocol supports multiple risk tiers (riskTier) with different risk parameters:

- **Low Risk Tiers (0-2)**: High liquidity assets, high leverage, low slippage
- **Medium Risk Tiers (3-5)**: Average liquidity assets, medium leverage
- **High Risk Tiers (6+)**: Low liquidity assets, low leverage, high slippage

Each pool is assigned a riskTier at creation, which can be adjusted later through governance.

#### 4. Risk Parameter Examples

**Typical Low-Risk Configuration (e.g., BTC/USDC):**

- leverage: 50 (max 50x leverage)
- maintainMarginRate: 500 (5% maintenance margin rate)
- maxWindowCapUsd: 10000000 (10M USD window capacity)
- windowSize: 3600 (1 hour window)
- priceRangePct: 500 (±5% price range)

**Typical High-Risk Configuration (e.g., Altcoins):**

- leverage: 10 (max 10x leverage)
- maintainMarginRate: 1000 (10% maintenance margin rate)
- maxWindowCapUsd: 1000000 (1M USD window capacity)
- windowSize: 1800 (30 minutes window)
- priceRangePct: 1000 (±10% price range)

---

## Error Definitions

The protocol defines standardized error types to clearly indicate the reason for operation failures. Each error has a unique selector for identification.

### Permission and Access Control Errors

| Error Signature                     | Selector     | Description                                                             |
| ----------------------------------- | ------------ | ----------------------------------------------------------------------- |
| `PermissionDenied(address,address)` | `0xe03f6024` | Caller does not have permission to execute operation on target contract |

---

### Market and Pool Errors

| Error Signature                   | Selector     | Description                                  |
| --------------------------------- | ------------ | -------------------------------------------- |
| `MarketNotExist(bytes32)`         | `0x24e219c7` | Market does not exist                        |
| `MarketNotInitialized()`          | `0xd8daec7c` | Market not initialized                       |
| `PoolNotExist(bytes32)`           | `0x51aeee6c` | Pool does not exist                          |
| `PoolExists(bytes32)`             | `0xcc36f935` | Pool already exists, cannot create duplicate |
| `PoolNotActive(bytes32)`          | `0xba01b06f` | Pool not active, cannot execute trades       |
| `PoolNotCompoundable(bytes32)`    | `0xba8f5df5` | Pool does not support compounding            |
| `PoolNotInPreBenchState(bytes32)` | `0x230e8e43` | Pool not in pre-launch state                 |
| `PoolNotInitialized()`            | `0x486aa307` | Pool not initialized                         |

---

### Order Errors

| Error Signature                                  | Selector     | Description                                          |
| ------------------------------------------------ | ------------ | ---------------------------------------------------- |
| `NotOrderOwner()`                                | `0xf6412b5a` | Caller is not the order owner                        |
| `InvalidOrder(bytes32)`                          | `0xd8cf2fdb` | Order invalid or parameters do not meet requirements |
| `OrderExpired(bytes32)`                          | `0x2e775cae` | Order has expired                                    |
| `OrderNotExist(bytes32)`                         | `0x3b51fbd2` | Order does not exist                                 |
| `NotReachedPrice(bytes32,uint256,uint256,uint8)` | `0xc1d5fb38` | Market price has not reached trigger condition       |

---

### Position Errors

| Error Signature                           | Selector     | Description                                             |
| ----------------------------------------- | ------------ | ------------------------------------------------------- |
| `NotPositionOwner()`                      | `0x70d645e3` | Caller is not the position owner                        |
| `InvalidPosition(bytes32)`                | `0x8ea9158f` | Position invalid or parameters do not meet requirements |
| `PositionNotHealthy(bytes32,uint256)`     | `0xa5afd143` | Position unhealthy, margin ratio below maintenance rate |
| `PositionRemainsHealthy(bytes32)`         | `0xc53f84e7` | Position healthy, cannot liquidate                      |
| `PositionNotInitialized(bytes32)`         | `0xba0d3752` | Position not initialized                                |
| `InsufficientCollateral(bytes32,uint256)` | `0x5646203f` | Position has insufficient collateral                    |
| `ExceedMaxLeverage(bytes32)`              | `0xb4762117` | Position leverage exceeds maximum allowed               |

---

### ADL (Auto-Deleveraging) Errors

| Error Signature                       | Selector     | Description                    |
| ------------------------------------- | ------------ | ------------------------------ |
| `InvalidADLPosition(bytes32,bytes32)` | `0x096f8c05` | ADL position selection invalid |
| `NoADLNeeded(bytes32)`                | `0x24be95bb` | ADL execution not needed       |

---

### Broker Errors

| Error Signature            | Selector     | Description                             |
| -------------------------- | ------------ | --------------------------------------- |
| `NotActiveBroker(address)` | `0x27d08510` | Broker not activated or not in registry |

---

### Liquidity and Balance Errors

| Error Signature                                  | Selector     | Description                                       |
| ------------------------------------------------ | ------------ | ------------------------------------------------- |
| `InsufficientBalance(address,uint256,uint256)`   | `0xdb42144d` | Account has insufficient balance                  |
| `InsufficientLiquidity(uint256,uint256,uint256)` | `0xd54d0fc4` | Pool has insufficient liquidity                   |
| `InsufficientOutputAmount()`                     | `0x42301c23` | Output amount below minimum (slippage protection) |
| `ExceedMinOutputAmount()`                        | `0xdc82bd68` | Exceeds minimum output amount limit               |
| `InsufficientSize()`                             | `0xc6e8248a` | Order or position size insufficient               |

---

### Price and Oracle Errors

| Error Signature             | Selector     | Description                             |
| --------------------------- | ------------ | --------------------------------------- |
| `StalePrice()`              | `0x19abf40e` | Price data is stale                     |
| `InvalidPrice()`            | `0x00bfc921` | Price invalid or zero                   |
| `ExceedMaxPriceDeviation()` | `0xfd0f789d` | Price deviation exceeds maximum allowed |
| `InvalidRewindPrice()`      | `0x7a5c919f` | Time rewind price invalid               |

---

### Exchange and Rebate Errors

| Error Signature                             | Selector     | Description                                     |
| ------------------------------------------- | ------------ | ----------------------------------------------- |
| `InsufficientReturnAmount(uint256,uint256)` | `0x14be833f` | Exchange callback return amount insufficient    |
| `ExceedMaxExchangeableAmount()`             | `0xe351cd13` | Exceeds maximum exchangeable amount             |
| `ConvertAmountMismatch(uint256,uint256)`    | `0xba767932` | Conversion output does not match exchange usage |
| `NoRebateToClaim()`                         | `0x80577032` | No rebates available to claim                   |

---

### Other Errors

| Error Signature                      | Selector     | Description                        |
| ------------------------------------ | ------------ | ---------------------------------- |
| `NotMeetEarlyCloseCriteria(bytes32)` | `0x17229ec4` | Does not meet early close criteria |
| `OnlyRelayer()`                      | `0x4578ddb8` | Only relayers can call             |
| `InvalidParameter()`                 | `0x613970e0` | Parameter invalid                  |
| `TransferFailed()`                   | `0x90b8ec18` | Token transfer failed              |
| `InsufficientRiskReserves()`         | `0x6aee3c1a` | Risk reserves insufficient         |

---

## Related Resources

- **Source Code**: [GitHub Repository](https://github.com/myx-protocol)
- **Security Audits**: [Audit Reports](./security-audits.md)
- **Deployed Addresses**: [Contract Addresses](./deployed-addresses.md)
- **API Documentation**: [Complete API Documentation](./API_Documentation_EN.md)

---

_This documentation is based on MYX Protocol V2. Contract addresses can be imported as Solidity or JavaScript packages via the Address Book._
