export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export interface LoggerOptions {
  prefix?: string;
  colors?: boolean;
  name?: string;
  level?: LogLevel;
}

export class Logger {
  private level: LogLevel;
  private prefix: string;
  private colors: boolean;
  private name: string;

  // ANSI color codes
  private readonly colorCodes = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',

    // Foreground colors
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',

    // Background colors
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
  };

  constructor(options: LoggerOptions = {}) {
    this.name = options.name || '';
    this.prefix = options.prefix || 'E2E Framework';
    this.colors = options.colors !== false;
    this.level = options.level || LogLevel.DEBUG;
  }

  private colorize(text: string, color: keyof typeof this.colorCodes): string {
    if (!this.colors) return text;
    return `${this.colorCodes[color]}${text}${this.colorCodes.reset}`;
  }

  private formatMessage(
    level: string,
    message: string,
    color: keyof typeof this.colorCodes,
  ): string {
    const levelStr = this.colorize(`[${level.toUpperCase()}]`, color);
    const prefixStr = this.colorize(`[${this.prefix}]`, 'cyan');
    const nameStr = this.colorize(`[${this.name}]`, 'gray');

    return `${prefixStr} ${levelStr}${
      this.name !== '' ? ` ${nameStr}` : ''
    } ${message}`;
  }

  private log(
    level: LogLevel,
    levelName: string,
    color: keyof typeof this.colorCodes,
    message: string,
    ...args: unknown[]
  ): void {
    if (level > this.level) return;

    const formattedMessage = this.formatMessage(levelName, message, color);
    console.log(formattedMessage, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, 'error', 'red', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, 'warn', 'yellow', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, 'info', 'blue', message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, 'debug', 'green', message, ...args);
  }

  trace(message: string, ...args: unknown[]): void {
    this.log(LogLevel.TRACE, 'trace', 'magenta', message, ...args);
  }

  // Convenience method for success messages
  success(message: string, ...args: unknown[]): void {
    if (LogLevel.INFO > this.level) return;
    const formattedMessage = this.formatMessage('success', message, 'green');
    console.log(formattedMessage, ...args);
  }

  // Method to check if a level is enabled
  isLevelEnabled(level: LogLevel): boolean {
    return level <= this.level;
  }

  // Get current log level
  getLevel(): LogLevel {
    return this.level;
  }

  // Set log level programmatically
  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

export const logger = new Logger();

export function createLogger(options: LoggerOptions): Logger {
  return new Logger(options);
}
