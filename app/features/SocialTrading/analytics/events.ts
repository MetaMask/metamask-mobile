import {
  generateOpt,
  EVENT_NAME as ANALYTICS_EVENT_NAME,
} from '../../../core/Analytics/MetaMetrics.events';

// Feature-specific event names (match EVENT_NAME style: SCREAMING_SNAKE_CASE
// keys, Initial Case string values with spaces)
export enum EVENT_NAME {
  TRADER_FOLLOW_TOGGLED = 'Social Trading Trader Follow Toggled',
  TRADE_LIKE_TOGGLED = 'Social Trading Trade Like Toggled',
  TRADE_COPY_SIMULATED = 'Social Trading Trade Copy Simulated',
  POSITION_CLOSE_SIMULATED = 'Social Trading Position Close Simulated',
}

const createEvent = (name: EVENT_NAME) =>
  generateOpt(name as unknown as ANALYTICS_EVENT_NAME);

export const SOCIAL_TRADING_EVENTS = {
  TRADER_FOLLOW_TOGGLED: createEvent(EVENT_NAME.TRADER_FOLLOW_TOGGLED),
  TRADE_LIKE_TOGGLED: createEvent(EVENT_NAME.TRADE_LIKE_TOGGLED),
  TRADE_COPY_SIMULATED: createEvent(EVENT_NAME.TRADE_COPY_SIMULATED),
  POSITION_CLOSE_SIMULATED: createEvent(EVENT_NAME.POSITION_CLOSE_SIMULATED),
};
