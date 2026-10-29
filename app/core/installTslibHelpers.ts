import { pinTslibHelpers } from './pinTslibHelpers';

// Imported first in shim.js so the pin runs before any module that loads tslib 1.
pinTslibHelpers();
