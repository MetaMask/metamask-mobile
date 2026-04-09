/* eslint-disable */
// Mock for @myx-trade/sdk
// Prevents Jest failures from lodash-es (ESM-only) imported by the real SDK

const mockMarkets = {
  getPoolSymbolAll: jest.fn().mockResolvedValue([]),
  getTickerList: jest.fn().mockResolvedValue([]),
};

class MyxClient {
  constructor() {
    this.markets = mockMarkets;
  }
}

// SDK enums (mirrored from the real SDK to support adapter tests)
const Direction = { LONG: 0, SHORT: 1 };
const DirectionEnum = { Long: 0, Short: 1 };
const OrderTypeEnum = { Market: 0, Limit: 1, Stop: 2, Conditional: 3 };
const OperationEnum = { Increase: 0, Decrease: 1 };
const OrderStatusEnum = { Cancelled: 1, Expired: 2, Successful: 9 };
const ExecTypeEnum = {
  Market: 1,
  Limit: 2,
  TP: 3,
  SL: 4,
  ADL: 5,
  Liquidation: 6,
};
const TradeFlowTypeEnum = {
  Increase: 0,
  Decrease: 1,
  AddMargin: 2,
  RemoveMargin: 3,
  CancelOrder: 4,
  ADL: 5,
  Liquidation: 6,
  MarketClose: 7,
  EarlyClose: 8,
  AddTPSL: 9,
  SecurityDeposit: 10,
  TransferToWallet: 11,
  MarginAccountDeposit: 12,
  ReferralReward: 13,
};
const TriggerType = { None: 0, TP: 1, SL: 2 };
const OrderType = { Market: 0, Limit: 1 };
const OperationType = { Increase: 0, Decrease: 1 };
const OrderStatus = { Pending: 0, Cancelled: 1, Expired: 2, Filled: 9 };
const TimeInForce = { IOC: 0 };

module.exports = {
  MyxClient,
  Direction,
  DirectionEnum,
  OrderTypeEnum,
  OperationEnum,
  OrderStatusEnum,
  ExecTypeEnum,
  TradeFlowTypeEnum,
  TriggerType,
  OrderType,
  OperationType,
  OrderStatus,
  TimeInForce,
};
