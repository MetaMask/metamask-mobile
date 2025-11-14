// Main framework exports for easy importing
export { default as Assertions } from './Assertions';
export { default as Gestures } from './Gestures';
export { default as Matchers } from './Matchers';
export { default as Utilities, BASE_DEFAULTS, sleep } from './Utilities';
export { Logger, createLogger, LogLevel, logger } from './logger';
export { default as PortManager, ResourceType } from './PortManager';
export * from './types';

// Example usage:
// import { Assertions, Gestures, Matchers, sleep, PortManager, ResourceType } from '../framework';
