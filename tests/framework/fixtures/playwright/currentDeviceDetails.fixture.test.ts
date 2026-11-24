/* eslint-disable import-x/no-nodejs-modules -- reads the fixture source to check its declared dependencies. */
jest.mock('../../services/appium/EmulatorHelpers.ts', () => ({
  getIosSimulatorUdid: jest.fn(),
}));

import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import type { TestInfo } from '@playwright/test';
import { currentDeviceDetailsFixture } from './currentDeviceDetails.fixture.ts';
import type { CurrentDeviceDetails, WorkerLevelFixtures } from './types.ts';
import { Platform, ProviderName } from '../../types.ts';
import { getIosSimulatorUdid } from '../../services/appium/EmulatorHelpers.ts';

const POOL_SLOT_0_UDID = '7265E1FF-7206-46C6-922B-064A13641D0B';
const POOL_SLOT_1_UDID = '3E02BCEF-28B0-4011-9A9D-6C6220D7D76E';

const iosTestInfo = (udid: string): TestInfo =>
  ({
    title: 'sends a logged-out cardholder to Card login',
    project: {
      name: 'ios-smoke',
      use: {
        platform: Platform.IOS,
        device: {
          provider: ProviderName.SIMULATOR,
          name: 'iPhone 16 Pro',
          udid,
        },
        app: { appId: 'io.metamask.MetaMask' },
      },
    },
  }) as unknown as TestInfo;

/**
 * Playwright sets up a fixture's dependencies, read from the property names in
 * its destructured first parameter, before the fixture itself. Jest's Babel
 * transform rewrites that destructuring, so read it from the TypeScript source.
 */
const declaredFixtureDependencies = (fixtureName: string): string[] => {
  const sourcePath = path.join(__dirname, 'currentDeviceDetails.fixture.ts');
  const sourceFile = ts.createSourceFile(
    sourcePath,
    fs.readFileSync(sourcePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  let dependencies: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(sourceFile) === fixtureName &&
      ts.isArrowFunction(node.initializer)
    ) {
      const firstParam = node.initializer.parameters[0]?.name;
      if (firstParam && ts.isObjectBindingPattern(firstParam)) {
        dependencies = firstParam.elements.map((binding) =>
          (binding.propertyName ?? binding.name).getText(sourceFile),
        );
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return dependencies;
};

describe('currentDeviceDetails fixture', () => {
  const originalSimulatorUdid = process.env.IOS_SIMULATOR_UDID;

  afterEach(() => {
    if (originalSimulatorUdid === undefined) {
      delete process.env.IOS_SIMULATOR_UDID;
    } else {
      process.env.IOS_SIMULATOR_UDID = originalSimulatorUdid;
    }
    jest.clearAllMocks();
  });

  it('depends on deviceProvider so the worker pool simulator is assigned first', () => {
    const dependencies = declaredFixtureDependencies('currentDeviceDetails');

    expect(dependencies).toContain('deviceProvider');
  });

  it('resolves the pool simulator written by deviceProvider over the job-level IOS_SIMULATOR_UDID', async () => {
    process.env.IOS_SIMULATOR_UDID = POOL_SLOT_0_UDID;
    let resolved: CurrentDeviceDetails | undefined;

    await currentDeviceDetailsFixture.currentDeviceDetails(
      {} as Pick<WorkerLevelFixtures, 'deviceProvider'>,
      async (details) => {
        resolved = details;
      },
      iosTestInfo(POOL_SLOT_1_UDID),
    );

    expect(resolved?.udid).toBe(POOL_SLOT_1_UDID);
    expect(getIosSimulatorUdid).not.toHaveBeenCalled();
  });
});
