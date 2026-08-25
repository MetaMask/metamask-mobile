/** @deprecated Import from `./appiumLogger` instead. */
export {
  createAppiumLogger as createPlaywrightLogger,
  resolveAppiumLogLevel as resolvePlaywrightLogLevel,
  formatSelector,
  debugLazy,
  debugElementAction,
  describeElement,
} from './appiumLogger.ts';
export type { Logger } from './logger.ts';
