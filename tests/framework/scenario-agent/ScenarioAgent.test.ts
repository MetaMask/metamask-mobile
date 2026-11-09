/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import os from 'os';
import path from 'path';
import TimerStore from '../TimerStore.ts';
import { parseScenario } from './scenario.ts';
import {
  ScenarioAgent,
  type AgentAction,
  type Brain,
  type Device,
  type Locator,
} from './ScenarioAgent.ts';

let counter = 0;

function swapScenario() {
  counter += 1;
  return parseScenario(`# Demo ${counter}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
2. Tap the Swap button
3. Expect: the swap screen is visible

## Timers

- Measure from step 2 until step 3 (Android 60000 ms, iOS 60000 ms): demo timer ${counter}
`);
}

function fakes(missing: string[] = []) {
  const calls = {
    prompts: [] as string[],
    timerRunningDuringModelCall: [] as boolean[],
    timerRunningDuringWait: [] as boolean[],
    performed: [] as AgentAction[],
  };
  const brain: Brain = {
    async ask(prompt) {
      calls.prompts.push(prompt);
      calls.timerRunningDuringModelCall.push(TimerStore.hasActiveTimer());
      if (prompt.includes('Step 2:')) {
        return '{"action":{"type":"tap","locator":{"strategy":"testID","value":"wallet-swap-button"}},"final":true}';
      }
      const value = prompt.includes('proves the expectation is met now')
        ? 'swap-screen-v2'
        : 'source-token-area-input';
      return `{"action":{"type":"expect","locator":{"strategy":"testID","value":"${value}"}}}`;
    },
  };
  const fakeDevice: Device = {
    observe: async () => ({
      pageSource: '<hierarchy/>',
      screenshot: Buffer.from(''),
    }),
    perform: async (action) => {
      calls.performed.push(action);
    },
    waitFor: async (locator: Locator) => {
      calls.timerRunningDuringWait.push(TimerStore.hasActiveTimer());
      if (missing.includes(locator.value))
        throw new Error(`${locator.value} not found`);
    },
    isVisibleNow: async () => false,
  };
  return { calls, brain, device: fakeDevice };
}

function tempCachePath(): string {
  return path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'scenario-agent-')),
    'demo.cache.json',
  );
}

describe('ScenarioAgent timing', () => {
  it('never calls the model while a timer runs, and replays from the cache next time', async () => {
    const scenario = swapScenario();
    const cachePath = tempCachePath();
    const { calls, brain, device: fakeDevice } = fakes();
    const tracker = { addTimer: jest.fn() };
    const runSecretStep = jest.fn().mockResolvedValue(undefined);

    const first = await new ScenarioAgent({
      scenario,
      platform: 'android',
      cachePath,
      tracker,
      runSecretStep,
      brain,
      device: fakeDevice,
      log: jest.fn(),
    }).run();

    expect(first.status).toBe('PASS');
    expect(calls.prompts.length).toBeGreaterThan(0);
    expect(calls.timerRunningDuringModelCall.every((running) => !running)).toBe(
      true,
    );
    expect(calls.timerRunningDuringWait).toContain(true);
    expect(tracker.addTimer).toHaveBeenCalledTimes(1);
    expect(runSecretStep).toHaveBeenCalledWith('Log in to the wallet');
    expect(calls.prompts.some((p) => p.includes('Log in to the wallet'))).toBe(
      false,
    );
    expect(JSON.parse(fs.readFileSync(cachePath, 'utf8'))).toEqual({
      'Tap the Swap button': [
        {
          type: 'tap',
          locator: { strategy: 'testID', value: 'wallet-swap-button' },
        },
      ],
      'the swap screen is visible': [
        {
          type: 'expect',
          locator: { strategy: 'testID', value: 'source-token-area-input' },
        },
      ],
    });

    const replay = fakes();
    const second = await new ScenarioAgent({
      scenario: swapScenario(),
      platform: 'android',
      cachePath,
      tracker: { addTimer: jest.fn() },
      runSecretStep,
      brain: replay.brain,
      device: replay.device,
      log: jest.fn(),
    }).run();

    expect(second.status).toBe('PASS');
    expect(second.modelCalls).toBe(0);
    expect(second.changedSteps).toEqual([]);
  });

  it('marks INVALID_MEASUREMENT when the end element is missing and re-resolves it after the window', async () => {
    const {
      calls,
      brain,
      device: fakeDevice,
    } = fakes(['source-token-area-input']);
    const tracker = { addTimer: jest.fn() };
    const cachePath = tempCachePath();

    const result = await new ScenarioAgent({
      scenario: swapScenario(),
      platform: 'android',
      cachePath,
      tracker,
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain,
      device: fakeDevice,
      log: jest.fn(),
    }).run();

    expect(result.status).toBe('INVALID_MEASUREMENT');
    expect(tracker.addTimer).not.toHaveBeenCalled();
    expect(calls.timerRunningDuringModelCall.every((running) => !running)).toBe(
      true,
    );
    expect(
      JSON.parse(fs.readFileSync(cachePath, 'utf8'))[
        'the swap screen is visible'
      ],
    ).toEqual([
      {
        type: 'expect',
        locator: { strategy: 'testID', value: 'swap-screen-v2' },
      },
    ]);
  });
});
