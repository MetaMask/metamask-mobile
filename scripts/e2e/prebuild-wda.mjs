#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Prebuild WebDriverAgent for Appium XCUITest so session creation skips xcodebuild.
 * Output is written to ~/appium-wda (must match appium:derivedDataPath in EmulatorConfigBuilder).
 */
import { ensureWdaPrebuilt } from './wda-lib.mjs';

await ensureWdaPrebuilt();
