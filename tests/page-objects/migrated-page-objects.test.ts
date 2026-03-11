jest.mock('../framework/logger.ts', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  Logger: jest.fn(),
  LogLevel: { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3, TRACE: 4 },
}));

jest.mock('../framework/Matchers.ts', () => ({
  __esModule: true,
  default: {
    getElementByID: jest.fn().mockResolvedValue({}),
    getElementByText: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../framework/PlaywrightMatchers.ts', () => ({
  __esModule: true,
  default: {
    getElementById: jest.fn().mockResolvedValue({}),
    getElementByText: jest.fn().mockResolvedValue({}),
    getElementByAccessibilityId: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../framework/Gestures.ts', () => ({
  __esModule: true,
  default: { waitAndTap: jest.fn(), typeText: jest.fn() },
}));

jest.mock('../framework/UnifiedGestures.ts', () => ({
  __esModule: true,
  default: { waitAndTap: jest.fn(), typeText: jest.fn() },
}));

import { describePageObjectMigration } from '../framework/PageObjectMigrationTestUtils';
import LoginView from './wallet/LoginView';
import WalletView from './wallet/WalletView';

describe('Migrated page objects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Add a page object here once any of its getters are migrated to encapsulated()
  describePageObjectMigration('LoginView', LoginView);
  describePageObjectMigration('WalletView', WalletView);
});
