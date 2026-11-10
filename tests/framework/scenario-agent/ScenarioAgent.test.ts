/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import os from 'os';
import path from 'path';
import TimerStore from '../TimerStore.ts';
import { missingEnv, parseScenario, requireSecretEnv } from './scenario.ts';
import {
  ScenarioAgent,
  findBlockingAlert,
  fundingTapReason,
  submitTapReason,
  genericLocatorReason,
  isSubmitStep,
  burstActions,
  fieldTextIn,
  learnedBurstPlan,
  planBurst,
  parseScreenNodes,
  screenSignature,
  visibleIn,
  type AgentAction,
  type Brain,
  type Device,
  type Locator,
} from './ScenarioAgent.ts';

/** This repo's ProcessEnv typing requires keys a test env does not need. */
const testEnv = (vars: Record<string, string>): NodeJS.ProcessEnv =>
  vars as unknown as NodeJS.ProcessEnv;

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

const node = (id: string, text = '', y = 500, desc = '') =>
  `<android.view.View resource-id="${id}" text="${text}" content-desc="${desc}" bounds="[0,${y}][1000,${y + 100}]" displayed="true"/>`;
const page = (...nodes: string[]) => `<hierarchy>${nodes.join('')}</hierarchy>`;

describe('screen checks', () => {
  it('finds blocking alerts unless the step is about them', () => {
    const nodes = parseScreenNodes(
      page(
        node('alert-title', 'Insufficient funds'),
        node(
          'x',
          'You do not have enough ETH in your account to pay for network fees.',
        ),
      ),
    );
    expect(findBlockingAlert(nodes, 'Tap Confirm')).toBe('Insufficient funds');
    expect(
      findBlockingAlert(
        parseScreenNodes(
          page(
            node(
              'x',
              'You do not have enough ETH in your account to pay for network fees.',
            ),
          ),
        ),
        'Tap Confirm',
      ),
    ).toMatch(/do not have enough/);
    expect(
      findBlockingAlert(
        nodes.slice(0, 1),
        'Expect: an insufficient funds warning',
      ),
    ).toBeNull();
    expect(
      findBlockingAlert(
        parseScreenNodes(page(node('a', 'Send'))),
        'Tap Confirm',
      ),
    ).toBeNull();
  });

  it('rejects generic end-checks and accepts specific ones', () => {
    const step = 'the send transaction is listed in Activity';
    const id = (value: string): Locator => ({ strategy: 'testID', value });
    expect(genericLocatorReason(id('homepage-container'), step)).toMatch(
      /generic/,
    );
    expect(genericLocatorReason(id('wallet-scroll-view'), step)).toMatch(
      /generic/,
    );
    expect(genericLocatorReason(id('wallet-activity-button'), step)).toMatch(
      /control/,
    );
    expect(
      genericLocatorReason({ strategy: 'text', value: 'Activity' }, step),
    ).toMatch(/where to look/);
    expect(
      genericLocatorReason(
        { strategy: 'nativeXPath', value: '//android.widget.ScrollView' },
        step,
      ),
    ).toMatch(/class only/);
    expect(
      genericLocatorReason({ strategy: 'text', value: 'Sent ETH' }, step),
    ).toBeNull();
    expect(genericLocatorReason(id('transaction-item-0'), step)).toBeNull();
    // Screen-level elements are fine when the step is about that screen.
    expect(
      genericLocatorReason(
        id('bridge-view-scroll'),
        'the swap screen is loaded',
      ),
    ).toBeNull();
    expect(
      genericLocatorReason(
        id('token-asset-overview'),
        'the ETH token overview screen is visible',
      ),
    ).toBeNull();
    expect(
      genericLocatorReason(
        id('homepage-container'),
        'the wallet home is visible',
      ),
    ).toBeNull();
    expect(
      genericLocatorReason(
        id('wallet-activity-button'),
        'Open the Activity tab',
      ),
    ).toBeNull();
  });

  it('ignores prices and the status bar when comparing screens', () => {
    const a = parseScreenNodes(
      page(
        node('balance', '$8.62'),
        node('com.android.systemui:id/clock', '4:57'),
        node('title', 'Home'),
      ),
    );
    const b = parseScreenNodes(
      page(
        node('balance', '$8.63'),
        node('com.android.systemui:id/clock', '4:58'),
        node('title', 'Home'),
      ),
    );
    const c = parseScreenNodes(
      page(node('balance', '$8.63'), node('title', 'Send')),
    );
    expect(screenSignature(a)).toBe(screenSignature(b));
    expect(screenSignature(a)).not.toBe(screenSignature(c));
  });

  it('reads text inside an element for visibleIn', () => {
    const nodes = parseScreenNodes(
      page(node('row', '', 500), node('', 'Sent ETH', 520)),
    );
    expect(visibleIn(nodes, { strategy: 'testID', value: 'row' }, 'Sent')).toBe(
      true,
    );
    expect(
      visibleIn(nodes, { strategy: 'testID', value: 'row' }, 'Received'),
    ).toBe(false);
    expect(visibleIn(nodes, { strategy: 'text', value: 'Sent ETH' })).toBe(
      true,
    );
  });

  it('refuses buy / add funds taps unless the step asks', () => {
    expect(
      fundingTapReason('alert-modal-action-button Buy ETH', 'Tap Confirm'),
    ).toMatch(/buys or adds funds/);
    expect(
      fundingTapReason('confirm-button Confirm', 'Tap Confirm'),
    ).toBeNull();
    expect(
      fundingTapReason('wallet-buy-button Buy', 'Tap Buy on the wallet home'),
    ).toBeNull();
  });
});

/** A phone with named screens; taps move between them. */
function statefulFakes(options: {
  screens: Record<string, string>;
  start: string;
  taps: Record<string, string>;
  replies: (prompt: string) => string;
}) {
  let screen = options.start;
  const prompts: string[] = [];
  const brain: Brain = {
    async ask(prompt) {
      prompts.push(prompt);
      return options.replies(prompt);
    },
  };
  const nodesNow = () => parseScreenNodes(options.screens[screen]);
  const device: Device = {
    observe: async () => ({
      pageSource: options.screens[screen],
      screenshot: Buffer.from(''),
    }),
    pageSource: async () => options.screens[screen],
    describe: async (locator) =>
      parseScreenNodes(options.screens[screen])
        .filter((n) => n.id === locator.value || n.text === locator.value)
        .map((n) => n.text)
        .join(' '),
    perform: async (action) => {
      if (action.type === 'tap') {
        if (!visibleIn(nodesNow(), action.locator))
          throw new Error(`${action.locator.value} not found`);
        screen = options.taps[`${screen}:${action.locator.value}`] ?? screen;
      }
    },
    waitFor: async (locator, _timeout, textPattern) => {
      if (!visibleIn(nodesNow(), locator, textPattern))
        throw new Error(`${locator.value} not found`);
    },
    isVisibleNow: async (locator, textPattern) =>
      visibleIn(nodesNow(), locator, textPattern),
  };
  return { brain, device, prompts, screenName: () => screen };
}

function plainScenario(steps: string) {
  counter += 1;
  return parseScenario(`# Plain ${counter}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
${steps}
`);
}

const tap = (value: string, final = true) =>
  `{"action":{"type":"tap","locator":{"strategy":"testID","value":"${value}"}},"final":${final}}`;
const expectReply = (value: string, strategy = 'testID') =>
  `{"action":{"type":"expect","locator":{"strategy":"${strategy}","value":"${value}"}},"final":true}`;

describe('ScenarioAgent step-progress verification', () => {
  const screens = {
    home: page(node('wallet-send-button', 'Send'), node('homepage-container')),
    send: page(
      node('send-title', 'Send'),
      node('asset-ETH', 'ETH'),
      node('homepage-container'),
    ),
    activity: page(
      node('activity-title', 'Activity'),
      node('transaction-item-0', '', 600),
      node('', 'Sent ETH', 620),
      node('homepage-container'),
    ),
    funds: page(
      node('confirm-button', 'Confirm'),
      node('alert-title', 'Insufficient funds'),
      node('alert-modal-action-button', 'Buy ETH'),
    ),
  };

  const agent = (
    scenario: ReturnType<typeof parseScenario>,
    cachePath: string,
    fake: ReturnType<typeof statefulFakes>,
  ) =>
    new ScenarioAgent({
      scenario,
      platform: 'android',
      cachePath,
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
      settlePollMs: 1,
    });

  it('treats "final" on an unchanged screen as a correction, then caches the verified proof', async () => {
    const scenario = plainScenario('2. Tap the Send button on the wallet home');
    const cachePath = tempCachePath();
    let doCalls = 0;
    const fake = statefulFakes({
      screens,
      start: 'home',
      taps: { 'home:wallet-send-button': 'send' },
      replies: (prompt) => {
        if (prompt.includes('Check the current screen'))
          return expectReply('send-title');
        doCalls += 1;
        // First claims done by tapping something that changes nothing.
        return doCalls === 1
          ? tap('homepage-container')
          : tap('wallet-send-button');
      },
    });
    const result = await agent(scenario, cachePath, fake).run();
    expect(result.status).toBe('PASS');
    expect(doCalls).toBe(2);
    expect(
      JSON.parse(fs.readFileSync(cachePath, 'utf8'))[
        'Tap the Send button on the wallet home'
      ],
    ).toEqual([
      {
        type: 'tap',
        locator: { strategy: 'testID', value: 'homepage-container' },
      },
      {
        type: 'tap',
        locator: { strategy: 'testID', value: 'wallet-send-button' },
      },
      {
        type: 'expect',
        locator: { strategy: 'testID', value: 'send-title' },
        proof: true,
      },
    ]);

    // Replay: no model calls, the cached proof is checked again.
    const replay = statefulFakes({
      screens,
      start: 'home',
      taps: { 'home:wallet-send-button': 'send' },
      replies: () => {
        throw new Error('no model call expected');
      },
    });
    const second = await agent(
      plainScenario('2. Tap the Send button on the wallet home'),
      cachePath,
      replay,
    ).run();
    expect(second.status).toBe('PASS');
    expect(second.modelCalls).toBe(0);
  });

  it('rejects a proof that was already on screen before the step', async () => {
    const cachePath = tempCachePath();
    const proofs: string[] = [];
    const fake = statefulFakes({
      screens,
      start: 'home',
      taps: { 'home:wallet-send-button': 'send' },
      replies: (prompt) => {
        if (prompt.includes('Check the current screen')) {
          const value =
            proofs.length === 0 ? 'homepage-container' : 'asset-ETH';
          proofs.push(value);
          return expectReply(value);
        }
        return tap('wallet-send-button');
      },
    });
    const result = await agent(
      plainScenario('2. Tap the Send button'),
      cachePath,
      fake,
    ).run();
    expect(result.status).toBe('PASS');
    expect(proofs).toEqual(['homepage-container', 'asset-ETH']);
  });

  it('fails fast on a blocking alert, never taps Buy, and writes no cache', async () => {
    const cachePath = tempCachePath();
    const fake = statefulFakes({
      screens,
      start: 'funds',
      taps: {},
      replies: () => tap('alert-modal-action-button'),
    });
    const result = await agent(
      plainScenario('2. Tap Confirm'),
      cachePath,
      fake,
    ).run();
    expect(result.status).toBe('FAIL');
    expect(result.steps.find((s) => s.error)?.error).toMatch(
      /Insufficient funds/,
    );
    expect(result.modelCalls).toBe(0);
    expect(fs.existsSync(cachePath)).toBe(false);
  });

  it('lets an expectation read a screen that shows an insufficient-funds notice (a swap quote)', async () => {
    const cachePath = tempCachePath();
    const quote = {
      quote: page(
        node('dest-token-area-input', '12.5'),
        node('alert-title', 'Insufficient funds'),
      ),
    };
    const fake = statefulFakes({
      screens: quote,
      start: 'quote',
      taps: {},
      replies: () =>
        '{"action":{"type":"expect","locator":{"strategy":"testID","value":"dest-token-area-input"},"textPattern":"[1-9]"},"final":true}',
    });
    const result = await agent(
      plainScenario(
        '2. Expect: a quote with a positive destination amount is displayed',
      ),
      cachePath,
      fake,
    ).run();
    expect(result.status).toBe('PASS');
  });

  it('accepts the screen the app moves to by itself as proof, and skips a step already satisfied', async () => {
    const flow = {
      review: page(
        node('confirm-button', 'Confirm'),
        node('review-title', 'Review'),
      ),
      activity: screens.activity,
    };
    const steps =
      '2. Tap Confirm\n3. Open the Activity tab\n4. Expect: the sent ETH transaction is listed in Activity';
    const cachePath = tempCachePath();
    const fake = statefulFakes({
      screens: flow,
      start: 'review',
      taps: { 'review:confirm-button': 'activity' },
      replies: (prompt) => {
        if (prompt.includes('Step 2:')) {
          if (prompt.includes('Check the current screen')) {
            // The proof prompt names the next step and the natural next screen.
            expect(prompt).toContain(
              'The next scenario step is "Open the Activity tab"',
            );
            expect(prompt).toContain('natural next screen');
            return expectReply('activity-title');
          }
          expect(prompt).not.toContain('"satisfied"');
          return tap('confirm-button');
        }
        if (prompt.includes('Step 3:')) {
          expect(prompt).toContain('"satisfied":true');
          return '{"satisfied":true,"action":{"type":"expect","locator":{"strategy":"testID","value":"activity-title"}}}';
        }
        return expectReply('transaction-item-0');
      },
    });
    const result = await agent(plainScenario(steps), cachePath, fake).run();
    expect(result.status).toBe('PASS');
    const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    expect(cache['Tap Confirm']).toEqual([
      { type: 'tap', locator: { strategy: 'testID', value: 'confirm-button' } },
      {
        type: 'expect',
        locator: { strategy: 'testID', value: 'activity-title' },
        proof: true,
      },
    ]);
    expect(cache['Open the Activity tab']).toEqual([
      {
        type: 'expect',
        locator: { strategy: 'testID', value: 'activity-title' },
        proof: true,
      },
    ]);

    // Replay: no model calls; step 3 is skipped because Activity is already open.
    const replay = statefulFakes({
      screens: flow,
      start: 'review',
      taps: { 'review:confirm-button': 'activity' },
      replies: () => {
        throw new Error('no model call expected');
      },
    });
    const second = await agent(plainScenario(steps), cachePath, replay).run();
    expect(second.status).toBe('PASS');
    expect(second.modelCalls).toBe(0);
  });

  it('skips a cached step whose learned proof is already on screen, but never a submit step', async () => {
    const cachePath = tempCachePath();
    fs.writeFileSync(
      cachePath,
      JSON.stringify({
        'Open the Activity tab': [
          {
            type: 'tap',
            locator: { strategy: 'testID', value: 'wallet-activity-button' },
          },
          {
            type: 'expect',
            locator: { strategy: 'testID', value: 'activity-title' },
            proof: true,
          },
        ],
      }),
    );
    const fake = statefulFakes({
      screens,
      start: 'activity',
      taps: {},
      replies: () => {
        throw new Error('no model call expected');
      },
    });
    const result = await agent(
      plainScenario('2. Open the Activity tab'),
      cachePath,
      fake,
    ).run();
    expect(result.status).toBe('PASS');
    expect(result.modelCalls).toBe(0);
    // The learned actions stay cached for runs where the app does not move on by itself.
    expect(
      JSON.parse(fs.readFileSync(cachePath, 'utf8'))['Open the Activity tab'],
    ).toHaveLength(2);

    // A submit step always acts, even if its proof is visible.
    const submitCache = tempCachePath();
    const confirmScreens = {
      done: page(
        node('confirm-button', 'Confirm'),
        node('activity-title', 'Activity'),
      ),
    };
    fs.writeFileSync(
      submitCache,
      JSON.stringify({
        'Tap Confirm': [
          {
            type: 'tap',
            locator: { strategy: 'testID', value: 'confirm-button' },
          },
          {
            type: 'expect',
            locator: { strategy: 'testID', value: 'activity-title' },
            proof: true,
          },
        ],
      }),
    );
    const taps: string[] = [];
    const submitFake = statefulFakes({
      screens: confirmScreens,
      start: 'done',
      taps: {},
      replies: () => '{"done":false,"reason":"nothing changed"}',
    });
    const perform = submitFake.device.perform;
    submitFake.device.perform = async (action, hooks) => {
      if (action.type === 'tap') taps.push(action.locator.value);
      return perform(action, hooks);
    };
    await agent(plainScenario('2. Tap Confirm'), submitCache, submitFake).run();
    expect(taps[0]).toBe('confirm-button');
  });

  it('rejects "satisfied" when its element is not on screen and does the step', async () => {
    const cachePath = tempCachePath();
    let doCalls = 0;
    const fake = statefulFakes({
      screens,
      start: 'home',
      taps: { 'home:wallet-send-button': 'send' },
      replies: (prompt) => {
        if (prompt.includes('Check the current screen'))
          return expectReply('send-title');
        doCalls += 1;
        return doCalls === 1
          ? '{"satisfied":true,"action":{"type":"expect","locator":{"strategy":"testID","value":"send-title"}}}'
          : tap('wallet-send-button');
      },
    });
    const result = await agent(
      plainScenario('2. Tap the Send button on the wallet home'),
      cachePath,
      fake,
    ).run();
    expect(result.status).toBe('PASS');
    expect(doCalls).toBe(2);
    expect(fake.screenName()).toBe('send');
  });

  it('tells submit steps from steps that only open a flow or read a quote', () => {
    expect(isSubmitStep('Tap Confirm')).toBe(true);
    expect(isSubmitStep('Submit the swap')).toBe(true);
    expect(isSubmitStep('Tap Swap to execute the trade')).toBe(true);
    expect(isSubmitStep('Tap the Send button on the wallet home')).toBe(false);
    expect(isSubmitStep('Tap the Swap button on the wallet home')).toBe(false);
    expect(isSubmitStep('Tap Review')).toBe(false);
    expect(isSubmitStep('Enter 0.01 as the source amount')).toBe(false);
    expect(
      isSubmitStep('Select USDC on BNB Chain as the destination token'),
    ).toBe(false);
  });

  it('does not stop a swap-like step whose quote screen shows an insufficient-funds alert', async () => {
    const cachePath = tempCachePath();
    const swapScreens = {
      source: page(
        node('dest-token-area', 'Select token'),
        node('alert-title', 'Insufficient funds'),
      ),
      picked: page(
        node('dest-token-area', 'USDC'),
        node('dest-token-symbol', 'USDC', 700),
        node('alert-title', 'Insufficient funds'),
      ),
    };
    const fake = statefulFakes({
      screens: swapScreens,
      start: 'source',
      taps: { 'source:dest-token-area': 'picked' },
      replies: (prompt) =>
        prompt.includes('Check the current screen')
          ? expectReply('dest-token-symbol')
          : tap('dest-token-area'),
    });
    const result = await agent(
      plainScenario(
        '2. Select USDC as the destination token\n3. Expect: a quote with a positive destination amount is displayed',
      ),
      cachePath,
      {
        ...fake,
        brain: {
          ask: async (prompt) =>
            prompt.includes('proves the expectation is met now')
              ? '{"action":{"type":"expect","locator":{"strategy":"testID","value":"dest-token-symbol"}},"final":true}'
              : fake.brain.ask(prompt, Buffer.from('')),
        },
      },
    ).run();
    expect(result.status).toBe('PASS');
    expect(fs.existsSync(cachePath)).toBe(true);
  });

  it('stops a non-submit step with the alert as reason when the step does not take effect', async () => {
    const cachePath = tempCachePath();
    const stuck = {
      review: page(
        node('review-button', 'Review'),
        node('alert-title', 'Insufficient funds'),
      ),
    };
    const fake = statefulFakes({
      screens: stuck,
      start: 'review',
      taps: {},
      replies: () => tap('review-button'),
    });
    const result = await agent(
      plainScenario('2. Tap Review'),
      cachePath,
      fake,
    ).run();
    expect(result.status).toBe('FAIL');
    expect(result.steps.find((s) => s.error)?.error).toMatch(
      /Insufficient funds/,
    );
    expect(fs.existsSync(cachePath)).toBe(false);
  });

  it('refuses a Buy tap the step did not ask for and feeds it back', async () => {
    const cachePath = tempCachePath();
    const screensNoAlert = {
      ...screens,
      funds: page(
        node('confirm-button', 'Confirm'),
        node('alert-modal-action-button', 'Buy ETH'),
      ),
    };
    let calls = 0;
    const fake = statefulFakes({
      screens: screensNoAlert,
      start: 'funds',
      taps: { 'funds:confirm-button': 'activity' },
      replies: (prompt) => {
        if (prompt.includes('Check the current screen'))
          return expectReply('transaction-item-0');
        calls += 1;
        return calls === 1
          ? tap('alert-modal-action-button')
          : tap('confirm-button');
      },
    });
    const result = await agent(
      plainScenario('2. Tap Confirm'),
      cachePath,
      fake,
    ).run();
    expect(result.status).toBe('PASS');
    expect(fake.prompts.some((p) => p.includes('buys or adds funds'))).toBe(
      true,
    );
    expect(fake.screenName()).toBe('activity');
  });

  it('rejects a generic container for an expectation and accepts the transaction row', async () => {
    const cachePath = tempCachePath();
    let calls = 0;
    const fake = statefulFakes({
      screens,
      start: 'activity',
      taps: {},
      replies: () => {
        calls += 1;
        if (calls === 1) return expectReply('homepage-container');
        if (calls === 2) return expectReply('Activity', 'text');
        return expectReply('Sent ETH', 'text');
      },
    });
    const result = await agent(
      plainScenario('2. Expect: the send transaction is listed in Activity'),
      cachePath,
      fake,
    ).run();
    expect(result.status).toBe('PASS');
    expect(calls).toBe(3);
  });

  it('fails, without writing the cache, when no specific element proves the expectation', async () => {
    const cachePath = tempCachePath();
    const fake = statefulFakes({
      screens,
      start: 'home',
      taps: {},
      replies: () => expectReply('homepage-container'),
    });
    const result = await agent(
      plainScenario('2. Expect: the send transaction is listed in Activity'),
      cachePath,
      fake,
    ).run();
    expect(result.status).toBe('FAIL');
    expect(fs.existsSync(cachePath)).toBe(false);
  });

  it('fails the step when the model says the step did not take effect', async () => {
    const cachePath = tempCachePath();
    const fake = statefulFakes({
      screens,
      start: 'home',
      taps: { 'home:wallet-send-button': 'send' },
      replies: (prompt) =>
        prompt.includes('Check the current screen')
          ? '{"done":false,"reason":"still on the asset picker"}'
          : tap('wallet-send-button'),
    });
    const result = await agent(
      plainScenario('2. Select ETH on Ethereum as the token to send'),
      cachePath,
      fake,
    ).run();
    expect(result.status).toBe('FAIL');
    expect(result.steps.find((s) => s.error)?.error).toMatch(
      /not completed|did not finish/,
    );
    expect(fs.existsSync(cachePath)).toBe(false);
  });
});

describe('fixed checks pinned in the scenario', () => {
  const screens = {
    review: page(
      node('confirm-button', 'Confirm'),
      node('review-title', 'Review'),
    ),
    activity: page(
      node('activity-screen-safe-area-view'),
      node('activity-list'),
      node('transaction-item-0', 'Sent ETH Confirmed', 600),
    ),
  };
  const agentFor = (
    scenario: ReturnType<typeof parseScenario>,
    cachePath: string,
    fake: ReturnType<typeof statefulFakes>,
  ) =>
    new ScenarioAgent({
      scenario,
      platform: 'android',
      cachePath,
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
      settlePollMs: 1,
    });

  it('parses [check: ...] markers off the step text', () => {
    const scenario = plainScenario(
      '2. Open the Activity tab [check: testID=activity-screen-safe-area-view] [check: testID=activity-list]\n' +
        '3. Tap Confirm [check: gone testID=confirm-button]\n' +
        '4. Expect: a quote is displayed [check: testID=dest-token-area-input text=/^\\s*\\+?(?:\\d*[1-9]|\\d*\\.\\d*[1-9])/]',
    );
    expect(scenario.steps[1]).toEqual({
      number: 2,
      kind: 'do',
      text: 'Open the Activity tab',
      checks: [
        {
          locator: {
            strategy: 'testID',
            value: 'activity-screen-safe-area-view',
          },
        },
        { locator: { strategy: 'testID', value: 'activity-list' } },
      ],
    });
    expect(scenario.steps[2].checks).toEqual([
      { locator: { strategy: 'testID', value: 'confirm-button' }, gone: true },
    ]);
    const pattern = new RegExp(scenario.steps[3].checks?.[0].textPattern ?? '');
    // Same as QuoteView.waitForQuoteReady: a digit and parseFloat(text) > 0.
    for (const [text, ok] of [
      ['21.08', true],
      ['0', false],
      ['0.00', false],
      ['0.0001', true],
      ['', false],
      ['.5', true],
    ] as const) {
      expect(pattern.test(text)).toBe(ok);
    }
  });

  it('rejects a timer that ends on a "gone" check', () => {
    expect(() =>
      parseScenario(`# T

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Tap Swap
2. Expect: done [check: gone testID=x]

## Timers

- Measure from step 1 until step 2 (Android 1 ms, iOS 1 ms): t
`),
    ).toThrow(/exactly one element check/);
  });

  it('uses the pinned checks, never the model, for proofs and expectations, and does not cache them', async () => {
    const cachePath = tempCachePath();
    const steps =
      '2. Tap Confirm [check: gone testID=confirm-button]\n' +
      '3. Open the Activity tab [check: testID=activity-screen-safe-area-view] [check: testID=activity-list]\n' +
      '4. Expect: the sent ETH transaction is listed [check: testID=transaction-item-0 text=/Confirmed/]';
    const modes: string[] = [];
    const fake = statefulFakes({
      screens,
      start: 'review',
      taps: { 'review:confirm-button': 'activity' },
      replies: (prompt) => {
        modes.push(
          /\(?(do|expect|proof|predict)\)?/.exec(
            prompt.includes('Check the current screen') ? 'proof' : 'do',
          )?.[1] ?? '',
        );
        expect(prompt).toContain('Step 2:');
        return tap('confirm-button');
      },
    });
    const result = await agentFor(plainScenario(steps), cachePath, fake).run();
    expect(result.status).toBe('PASS');
    // One model call: the Confirm tap. No proof call, nothing for steps 3 and 4.
    expect(modes).toEqual(['do']);
    expect(result.steps.map((s) => s.source)).toEqual([
      'secret',
      'agent',
      'fixed',
      'fixed',
    ]);
    expect(JSON.parse(fs.readFileSync(cachePath, 'utf8'))).toEqual({
      'Tap Confirm': [
        {
          type: 'tap',
          locator: { strategy: 'testID', value: 'confirm-button' },
        },
      ],
    });
  });

  it('fails the step when a pinned check does not hold, without asking the model for a proof', async () => {
    const cachePath = tempCachePath();
    const fake = statefulFakes({
      screens: {
        ...screens,
        stuck: page(
          node('confirm-button', 'Confirm'),
          node('alert', 'Something'),
        ),
      },
      start: 'review',
      taps: { 'review:confirm-button': 'stuck' },
      replies: (prompt) => {
        expect(prompt).not.toContain('Check the current screen');
        return tap('confirm-button');
      },
    });
    const agent = agentFor(
      plainScenario(
        '2. Expect: the sent ETH transaction is listed [check: testID=transaction-item-0 text=/Confirmed/]',
      ),
      cachePath,
      fake,
    );
    const result = await agent.run();
    expect(result.status).toBe('FAIL');
    expect(result.modelCalls).toBe(0);
    expect(result.steps.find((s) => s.error)?.error).toMatch(
      /transaction-item-0/,
    );
  });

  it('ends a timer on the pinned element without predicting one', async () => {
    const cachePath = tempCachePath();
    const fake = fakes();
    const scenario = parseScenario(`# Pinned ${++counter}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
2. Tap the Swap button
3. Expect: the swap screen is visible [check: testID=source-token-area-input]

## Timers

- Measure from step 2 until step 3 (Android 60000 ms, iOS 60000 ms): pinned timer ${counter}
`);
    const result = await new ScenarioAgent({
      scenario,
      platform: 'android',
      cachePath,
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
    }).run();
    expect(result.status).toBe('PASS');
    expect(result.timers[0].valid).toBe(true);
    expect(
      fake.calls.prompts.some((p) => p.includes('has NOT happened yet')),
    ).toBe(false);
    expect(result.steps.find((s) => s.number === 3)?.actions).toEqual([
      {
        type: 'expect',
        locator: { strategy: 'testID', value: 'source-token-area-input' },
      },
    ]);
  });
});

describe('model config for CI', () => {
  it('treats empty env values as unset', () => {
    const { scenarioModelConfig } = jest.requireActual(
      './ScenarioAgent.ts',
    ) as typeof import('./ScenarioAgent.ts');
    expect(
      scenarioModelConfig(
        testEnv({ ANTHROPIC_MODEL: '', ANTHROPIC_BASE_URL: '' }),
      ),
    ).toEqual({ model: 'claude-haiku-4-5-20251001' });
    expect(scenarioModelConfig(testEnv({}))).toEqual({
      model: 'claude-haiku-4-5-20251001',
    });
    expect(
      scenarioModelConfig(
        testEnv({
          ANTHROPIC_MODEL: 'claude-haiku-4-5',
          ANTHROPIC_BASE_URL: 'https://proxy.example',
        }),
      ),
    ).toEqual({
      model: 'claude-haiku-4-5',
      baseURL: 'https://proxy.example',
    });
  });
});

describe('pinned timer end, like the original spec', () => {
  it('measures even when the end check already holds, and flags it', async () => {
    const fake = fakes();
    fake.device.isVisibleNow = async () => true;
    const scenario = parseScenario(`# Pinned visible ${++counter}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
2. Tap the Swap button
3. Expect: the swap screen is visible [check: testID=source-token-area-input]

## Timers

- Measure from step 2 until step 3 (Android 60000 ms, iOS 60000 ms): pinned visible ${counter}
`);
    const result = await new ScenarioAgent({
      scenario,
      platform: 'android',
      cachePath: tempCachePath(),
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
    }).run();
    expect(result.status).toBe('PASS');
    expect(result.timers[0]).toMatchObject({
      valid: true,
      endAlreadyVisible: true,
    });
  });
});

describe('burst typing (one page source, one touch sequence)', () => {
  const key = (id: string, x: number, y: number) =>
    `<android.view.View resource-id="${id}" text="" content-desc="" bounds="[${x - 50},${y - 50}][${x + 50},${y + 50}]" displayed="true"/>`;
  const keypad = [
    key('keypad-key-0', 504, 2046),
    key('keypad-key-1', 185, 1641),
    key('keypad-key-9', 824, 1641),
    key('keypad-key-dot', 185, 2046),
    key('keypad-delete-button', 824, 2046),
  ];

  it('plans every tap from one page source, clearing a non-empty field first', () => {
    const empty = parseScreenNodes(
      page(node('source-token-area-input', '0', 300), ...keypad),
    );
    const plan = planBurst(
      empty,
      '0.01',
      { strategy: 'testID', value: 'source-token-area-input' },
      2244,
    );
    expect(plan).toEqual({
      clear: [],
      keys: [
        { x: 504, y: 2046 },
        { x: 185, y: 2046 },
        { x: 504, y: 2046 },
        { x: 185, y: 1641 },
      ],
      shown: '0',
      // The field's centre, so a learned burst can start with the field tap.
      field: expect.objectContaining({ y: expect.any(Number) }),
    });
    const filled = parseScreenNodes(
      page(node('source-token-area-input', '12', 300), ...keypad),
    );
    expect(
      planBurst(
        filled,
        '1',
        { strategy: 'testID', value: 'source-token-area-input' },
        2244,
      )?.clear,
    ).toEqual([
      { x: 824, y: 2046 },
      { x: 824, y: 2046 },
    ]);
    // Keypad not open yet: no plan, the caller polls again.
    expect(
      planBurst(
        parseScreenNodes(page(node('source-token-area-input', '0', 300))),
        '0.01',
        { strategy: 'testID', value: 'source-token-area-input' },
        2244,
      ),
    ).toBeNull();
  });

  it('plans a burst at the learned key centres when the keypad opens only on the field tap', () => {
    const method = {
      input: 'keypad' as const,
      pace: 'burst' as const,
      keys: {
        '0': {
          locator: { strategy: 'testID' as const, value: 'keypad-key-0' },
          center: { x: 504, y: 2046 },
        },
        '.': {
          locator: { strategy: 'testID' as const, value: 'keypad-key-dot' },
          center: { x: 185, y: 2046 },
        },
        '1': {
          locator: { strategy: 'testID' as const, value: 'keypad-key-1' },
          center: { x: 185, y: 1641 },
        },
      },
      deleteKey: {
        locator: { strategy: 'testID' as const, value: 'keypad-delete-button' },
        center: { x: 824, y: 2046 },
      },
    };
    const field = {
      strategy: 'testID' as const,
      value: 'source-token-area-input',
    };
    const closed = parseScreenNodes(
      page(node('source-token-area-input', '5', 300)),
    );
    expect(learnedBurstPlan(closed, '0.1', field, method)).toEqual({
      clear: [{ x: 824, y: 2046 }],
      keys: [
        { x: 504, y: 2046 },
        { x: 185, y: 2046 },
        { x: 185, y: 1641 },
      ],
      shown: '5',
      field: expect.any(Object),
      learned: true,
    });
    // A key never learned, or the field not on screen: no plan.
    expect(learnedBurstPlan(closed, '0.9', field, method)).toBeNull();
    expect(
      learnedBurstPlan(
        parseScreenNodes(page(node('other'))),
        '0.1',
        field,
        method,
      ),
    ).toBeNull();
  });

  it('reads a field whose text sits in a child', () => {
    const nodes = parseScreenNodes(
      `<hierarchy><android.view.View resource-id="send_amount" text="" content-desc="" bounds="[0,200][1000,400]" displayed="true"/><android.widget.TextView resource-id="" text="0.5" content-desc="" bounds="[100,250][300,350]" displayed="true"/></hierarchy>`,
    );
    expect(
      fieldTextIn(nodes, { strategy: 'testID', value: 'send_amount' }),
    ).toBe('0.5');
    expect(
      fieldTextIn(nodes, { strategy: 'testID', value: 'missing' }),
    ).toBeNull();
  });

  it('builds one sequence with short fixed gaps and no gap before the first key', () => {
    const steps = burstActions([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 },
    ]);
    const pauses = steps
      .filter((a) => a.type === 'pause')
      .map((a) => a.duration);
    // press, gap, press, gap, press
    expect(pauses).toEqual([40, 100, 40, 100, 40]);
    expect(steps.filter((a) => a.type === 'pointerDown')).toHaveLength(3);
    expect(steps[0]).toEqual({ type: 'pointerMove', duration: 0, x: 1, y: 2 });
    // Four short keys stay well under a second of finger time on the device.
    const total = burstActions(Array(4).fill({ x: 0, y: 0 })).reduce(
      (sum, a) => sum + (Number(a.duration) || 0),
      0,
    );
    expect(total).toBeLessThan(1000);
    // Field tap first: a longer pause before the first key, then the same gaps.
    const withField = burstActions(Array(3).fill({ x: 0, y: 0 }), 40, 100, 250)
      .filter((a) => a.type === 'pause')
      .map((a) => a.duration);
    expect(withField).toEqual([40, 250, 40, 100, 40]);
  });

  it('falls back to element clicks when a cached burst does not register, and caches that', async () => {
    const cachePath = tempCachePath();
    const typeAction = {
      type: 'type',
      locator: { strategy: 'testID', value: 'source-token-area-input' },
      text: '0.01',
      method: { input: 'keypad', pace: 'burst', keys: {} },
    };
    fs.writeFileSync(
      cachePath,
      JSON.stringify({ 'Enter 0.01 as the source amount': [typeAction] }),
    );
    const paces: string[] = [];
    let field = '0';
    const fake = statefulFakes({
      screens: { swap: page(node('source-token-area-input', '0', 300)) },
      start: 'swap',
      taps: {},
      replies: () => {
        throw new Error('no model call expected');
      },
    });
    fake.device.perform = async (action) => {
      if (action.type === 'type') {
        paces.push(action.method?.pace ?? '');
        // Burst taps "missed"; element clicks register.
        field = action.method?.pace === 'quick' ? action.text : '0';
      }
    };
    fake.device.fieldText = async () => field;
    const result = await new ScenarioAgent({
      scenario: plainScenario('2. Enter 0.01 as the source amount'),
      platform: 'android',
      cachePath,
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
      settlePollMs: 1,
    }).run();
    expect(result.status).toBe('PASS');
    expect(result.modelCalls).toBe(0);
    expect(paces).toEqual(['burst', 'quick']);
    const saved = JSON.parse(fs.readFileSync(cachePath, 'utf8'))[
      'Enter 0.01 as the source amount'
    ];
    expect(saved[0].method.pace).toBe('quick');
  });
});

describe('"any" pinned checks (waitForFirstSuccessful)', () => {
  it('parses alternatives, quoted values included', () => {
    const scenario = plainScenario(
      '2. Expect: rewards content [check: any testID=onboarding-step-container | testID=rewards-view-title | label="Add accounts"]',
    );
    expect(scenario.steps[1].text).toBe('rewards content');
    expect(scenario.steps[1].checks?.[0].anyOf).toEqual([
      { strategy: 'testID', value: 'onboarding-step-container' },
      { strategy: 'testID', value: 'rewards-view-title' },
      { strategy: 'label', value: 'Add accounts' },
    ]);
  });

  it('ends a timer on whichever alternative shows first', async () => {
    const fake = fakes();
    const seen: string[] = [];
    fake.device.isVisibleNow = async (locator) => {
      seen.push(locator.value);
      return locator.value === 'rewards-view-title' && seen.length > 3;
    };
    const scenario = parseScenario(`# Any ${++counter}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
2. Tap the Rewards tab
3. Expect: rewards content [check: any testID=onboarding-step-container | testID=rewards-view-title]

## Timers

- Measure from step 2 until step 3 (Android 60000 ms, iOS 60000 ms): any timer ${counter}
`);
    fake.brain.ask = async () =>
      '{"action":{"type":"tap","locator":{"strategy":"testID","value":"tab-bar-item-Rewards"}},"final":true}';
    const result = await new ScenarioAgent({
      scenario,
      platform: 'android',
      cachePath: tempCachePath(),
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
    }).run();
    expect(result.status).toBe('PASS');
    expect(result.timers[0].valid).toBe(true);
    expect(seen).toContain('onboarding-step-container');
  });
});

describe('never submits outside a submit step', () => {
  it('flags Confirm / Sign taps unless the step is a submit step', () => {
    expect(submitTapReason('confirm-button Confirm', 'Tap Review')).toMatch(
      /only a Confirm\/Submit step/,
    );
    expect(submitTapReason('confirm-button Confirm', 'Tap Confirm')).toBeNull();
    expect(submitTapReason('review-button Review', 'Tap Review')).toBeNull();
    expect(
      submitTapReason(
        'transaction-item-0 Sent ETH Confirmed',
        'Open the Activity tab',
      ),
    ).toBeNull();
  });

  it('refuses a Confirm tap during "Tap Review" and accepts the Confirm button as Review\'s proof', async () => {
    const screens = {
      amount: page(node('review-button', 'Review')),
      review: page(node('confirm-button', 'Confirm'), node('', 'Sending', 300)),
      sent: page(node('activity-list')),
    };
    const taps: string[] = [];
    let doCalls = 0;
    const fake = statefulFakes({
      screens,
      start: 'amount',
      taps: {
        'amount:review-button': 'review',
        'review:confirm-button': 'sent',
      },
      replies: (prompt) => {
        if (prompt.includes('Check the current screen'))
          return expectReply('confirm-button');
        doCalls += 1;
        return doCalls === 1 ? tap('review-button') : tap('confirm-button');
      },
    });
    const perform = fake.device.perform;
    fake.device.perform = async (action, hooks) => {
      if (action.type === 'tap') taps.push(action.locator.value);
      return perform(action, hooks);
    };
    const cachePath = tempCachePath();
    const result = await new ScenarioAgent({
      scenario: plainScenario('2. Tap Review'),
      platform: 'android',
      cachePath,
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
      settlePollMs: 1,
    }).run();
    expect(result.status).toBe('PASS');
    expect(taps).toEqual(['review-button']);
    expect(fake.screenName()).toBe('review');
    expect(
      JSON.parse(fs.readFileSync(cachePath, 'utf8'))['Tap Review'],
    ).toEqual([
      { type: 'tap', locator: { strategy: 'testID', value: 'review-button' } },
      {
        type: 'expect',
        locator: { strategy: 'testID', value: 'confirm-button' },
        proof: true,
      },
    ]);
  });
});

describe('App steps and pinned taps (launch times, tab-bar targets)', () => {
  const md = (steps: string, timers = '') => `# App ${Math.random()}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
${steps}
${timers ? `\n## Timers\n\n${timers}\n` : ''}`;

  it('parses App commands, a pinned tap, and timers that start on an App step', () => {
    const s = parseScenario(
      md(
        `2. App: terminate the app
3. App: activate the app
4. Expect: login [check: testID=login]
5. App: background the app for 35 s
6. App: start the clock
7. Expect: wallet [check: any testID=wallet-account-name-button | testID=account-picker]
8. Tap the Rewards tab [tap: testID=tab-bar-item-Rewards]`,
        `- Measure from step 3 until step 4 (Android 3000 ms, iOS 3000 ms): launch
- Measure from step 6 until step 7 (Android 3000 ms, iOS 2500 ms): unlock`,
      ),
    );
    expect(s.steps.map((x) => x.app?.command ?? null)).toEqual([
      null,
      'terminate',
      'activate',
      null,
      'background',
      'startClock',
      null,
      null,
    ]);
    expect(s.steps[4].app).toEqual({ command: 'background', seconds: 35 });
    expect(s.steps[7]).toMatchObject({
      text: 'Tap the Rewards tab',
      tap: { strategy: 'testID', value: 'tab-bar-item-Rewards' },
    });
  });

  it('rejects unknown App commands and App timers without a pinned end on the next step', () => {
    expect(() => parseScenario(md('2. App: reinstall the app'))).toThrow(
      /unknown App command/,
    );
    expect(() =>
      parseScenario(
        md(
          '2. App: activate the app\n3. Expect: login',
          '- Measure from step 2 until step 3 (Android 1 ms, iOS 1 ms): t',
        ),
      ),
    ).toThrow(/needs a pinned/);
    expect(() =>
      parseScenario(
        md(
          '2. App: activate the app\n3. Tap x\n4. Expect: login [check: testID=login]',
          '- Measure from step 2 until step 4 (Android 1 ms, iOS 1 ms): t',
        ),
      ),
    ).toThrow(/very next step/);
  });

  it('runs App steps in code and times from the end of the App command, with no model call', async () => {
    const order: string[] = [];
    let screen = page(node('total-balance-text'));
    const fake = statefulFakes({
      screens: { s: screen },
      start: 's',
      taps: {},
      replies: () => {
        throw new Error('no model');
      },
    });
    fake.device.waitFor = async (locator) => {
      order.push(`wait ${locator.value}`);
      if (!visibleIn(parseScreenNodes(screen), locator))
        throw new Error('absent');
    };
    const addTimer = jest.fn();
    const result = await new ScenarioAgent({
      scenario: parseScenario(
        md(
          `2. App: terminate the app
3. App: activate the app
4. Expect: login [check: testID=login]`,
          '- Measure from step 3 until step 4 (Android 3000 ms, iOS 3000 ms): launch',
        ),
      ),
      platform: 'android',
      cachePath: tempCachePath(),
      tracker: { addTimer },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      runAppStep: async (app) => {
        order.push(app.command);
        if (app.command === 'activate') screen = page(node('login'));
      },
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
      settlePollMs: 1,
    }).run();
    expect(result.status).toBe('PASS');
    expect(order).toEqual(['terminate', 'activate', 'wait login']);
    expect(result.timers).toEqual([
      expect.objectContaining({ name: 'launch', valid: true }),
    ]);
    expect(addTimer).toHaveBeenCalledTimes(1);
    expect(result.modelCalls).toBe(0);
  });

  it('taps the pinned element as the timer trigger even when the model would pick another', async () => {
    const screens = {
      home: page(
        node('wallet-rewards-button', 'Rewards'),
        node('tab-bar-item-Rewards', 'Rewards', 2100),
      ),
      rewards: page(node('rewards-view-title', 'Rewards')),
    };
    const fake = statefulFakes({
      screens,
      start: 'home',
      taps: {
        'home:tab-bar-item-Rewards': 'rewards',
        'home:wallet-rewards-button': 'rewards',
      },
      replies: () => tap('wallet-rewards-button'),
    });
    const taps: string[] = [];
    const perform = fake.device.perform;
    fake.device.perform = async (action, hooks) => {
      if (action.type === 'tap') taps.push(action.locator.value);
      return perform(action, hooks);
    };
    const cachePath = tempCachePath();
    const result = await new ScenarioAgent({
      scenario: parseScenario(
        md(
          `2. Tap the Rewards tab in the bottom tab bar [tap: testID=tab-bar-item-Rewards]
3. Expect: Rewards content [check: any testID=onboarding-step-container | testID=rewards-view-title]`,
          '- Measure from step 2 until step 3 (Android 3000 ms, iOS 8000 ms): rewards',
        ),
      ),
      platform: 'android',
      cachePath,
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
      settlePollMs: 1,
    }).run();
    expect(result.status).toBe('PASS');
    expect(taps).toEqual(['tab-bar-item-Rewards']);
    expect(result.modelCalls).toBe(0);
    expect(result.steps.find((s) => s.number === 2)?.source).toBe('fixed');
  });
});

describe('code checks and [if:] conditions (asset-balances, perps-add-funds)', () => {
  const md = (steps: string, timers = '') => `# Code ${Math.random()}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
${steps}
${timers ? `\n## Timers\n\n${timers}\n` : ''}`;

  const run = (
    markdown: string,
    extra: Partial<ConstructorParameters<typeof ScenarioAgent>[0]>,
  ) => {
    const fake = statefulFakes({
      screens: {
        s: page(
          node('perps-tutorial-skip-button', 'Skip'),
          node('', 'Add funds', 900),
        ),
      },
      start: 's',
      taps: {},
      replies: () => {
        throw new Error('no model');
      },
    });
    return new ScenarioAgent({
      scenario: parseScenario(markdown),
      platform: 'android',
      cachePath: tempCachePath(),
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
      settlePollMs: 1,
      ...extra,
    }).run();
  };

  it('parses code checks and conditions, and keeps a timer inside one condition', () => {
    const s = parseScenario(
      md(
        `2. App: start the clock [if: perps-gtm-onboarding]
3. Expect: tutorial [if: perps-gtm-onboarding] [check: any text="What are perps?"]
4. Expect: balance stable [check: code=balance-stable]`,
        '- Measure from step 2 until step 3 (Android 1 ms, iOS 1 ms): t',
      ),
    );
    expect(s.steps[1]).toMatchObject({
      kind: 'app',
      condition: 'perps-gtm-onboarding',
    });
    expect(s.steps[2].checks?.[0].anyOf).toEqual([
      { strategy: 'text', value: 'What are perps?' },
    ]);
    expect(s.steps[3].checks?.[0].code).toBe('balance-stable');
    expect(() =>
      parseScenario(
        md(
          `2. App: start the clock [if: x]\n3. Expect: e [check: testID=a]`,
          '- Measure from step 2 until step 3 (Android 1 ms, iOS 1 ms): t',
        ),
      ),
    ).toThrow(/same \[if/);
    expect(() =>
      parseScenario(md('2. Tap a [check: code=balance-stable]')),
    ).toThrow(/code check/);
  });

  it('times a code check from a clock mark and skips conditional steps and their timer', async () => {
    const codeChecks: string[] = [];
    const evaluate = jest.fn().mockResolvedValue(false);
    const result = await run(
      md(
        `2. App: start the clock [if: perps-gtm-onboarding]
3. Expect: tutorial [if: perps-gtm-onboarding] [check: any text="What are perps?"]
4. Tap Skip [if: perps-gtm-onboarding] [tap: testID=perps-tutorial-skip-button]
5. App: start the clock
6. Expect: balance stable [check: code=balance-stable]`,
        `- Measure from step 2 until step 3 (Android 4200 ms, iOS 1500 ms): select
- Measure from step 5 until step 6 (Android 20000 ms, iOS 40000 ms): balance`,
      ),
      {
        evaluateCondition: evaluate,
        runCodeCheck: async (name) => {
          codeChecks.push(name);
        },
      },
    );
    expect(result.status).toBe('PASS');
    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(codeChecks).toEqual(['balance-stable']);
    expect(result.timers.map((t) => [t.name, t.valid])).toEqual([
      ['balance', true],
    ]);
    expect(result.modelCalls).toBe(0);
  });

  it('fails the timer when the code check throws', async () => {
    const result = await run(
      md(
        '2. App: start the clock\n3. Expect: stable [check: code=balance-stable]',
        '- Measure from step 2 until step 3 (Android 1 ms, iOS 1 ms): t',
      ),
      {
        runCodeCheck: async () => {
          throw new Error('balance kept changing');
        },
      },
    );
    expect(result.status).toBe('FAIL');
    expect(result.timers[0]).toMatchObject({ valid: false });
  });
});

describe('a step right before "App: start the clock"', () => {
  it('returns as soon as its action is done (no proof wait), so the clock starts like the original', async () => {
    const screens = {
      home: page(node('homepage-section-title-perps', 'Perps')),
      tutorial: page(
        node('', 'What are perps?', 300),
        node('perps-tutorial-skip-button', 'Skip'),
      ),
    };
    const fake = statefulFakes({
      screens,
      start: 'home',
      taps: { 'home:homepage-section-title-perps': 'tutorial' },
      replies: (prompt) => {
        if (prompt.includes('Check the current screen'))
          throw new Error('no proof call expected');
        return tap('homepage-section-title-perps');
      },
    });
    const cachePath = tempCachePath();
    const result = await new ScenarioAgent({
      scenario: parseScenario(`# Clock ${Math.random()}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
2. Tap the Perps section header
3. App: start the clock
4. Expect: tutorial [check: any text="What are perps?"]

## Timers

- Measure from step 3 until step 4 (Android 4200 ms, iOS 1500 ms): Select Perps Main Screen
`),
      platform: 'android',
      cachePath,
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
      settlePollMs: 1,
    }).run();
    expect(result.status).toBe('PASS');
    expect(result.modelCalls).toBe(1);
    expect(
      JSON.parse(fs.readFileSync(cachePath, 'utf8'))[
        'Tap the Perps section header'
      ],
    ).toEqual([
      {
        type: 'tap',
        locator: { strategy: 'testID', value: 'homepage-section-title-perps' },
      },
    ]);
  });
});

describe('CI readiness: no cache, no key, no secret', () => {
  const md = (steps: string, timers = '') => `# CI ${Math.random()}

Tags: @PerformanceShadow
Team: @qa-team
Platforms: Android

## Steps

1. Secret: Log in to the wallet
${steps}
${timers ? `\n## Timers\n\n${timers}\n` : ''}`;

  it('learns on the fly when the scenario has no cache yet, writes it, then replays with no calls', async () => {
    const cachePath = tempCachePath();
    expect(fs.existsSync(cachePath)).toBe(false);
    const scenario = swapScenario();
    const first = fakes();
    const learned = await new ScenarioAgent({
      scenario,
      platform: 'android',
      cachePath,
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: first.brain,
      device: first.device,
      log: jest.fn(),
      settlePollMs: 1,
    }).run();
    expect(learned.status).toBe('PASS');
    expect(learned.modelCalls).toBeGreaterThan(0);
    expect(fs.existsSync(cachePath)).toBe(true);

    const second = fakes();
    const replay = await new ScenarioAgent({
      scenario,
      platform: 'android',
      cachePath,
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: second.brain,
      device: second.device,
      log: jest.fn(),
      settlePollMs: 1,
    }).run();
    expect(replay.status).toBe('PASS');
    expect(replay.modelCalls).toBe(0);
  });

  it('fails the step clearly, without a cache, when a model call is needed and ANTHROPIC_API_KEY is unset', async () => {
    // Jest's process.env ignores `delete`; an empty value is unset for
    // ClaudeProvider, as it is in CI. The guard keeps this test offline.
    const saved = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = '';
    try {
      const { device } = fakes();
      const cachePath = tempCachePath();
      const result = await new ScenarioAgent({
        scenario: swapScenario(),
        platform: 'android',
        cachePath,
        tracker: { addTimer: jest.fn() },
        runSecretStep: jest.fn().mockResolvedValue(undefined),
        device,
        log: jest.fn(),
        settlePollMs: 1,
      }).run();
      expect(result.status).toBe('FAIL');
      expect(result.steps.find((s) => s.error)?.error).toMatch(
        /ANTHROPIC_API_KEY is required/,
      );
      expect(fs.existsSync(cachePath)).toBe(false);
    } finally {
      process.env.ANTHROPIC_API_KEY = saved ?? '';
    }
  });

  it('names a missing secret without its value, and lists only missing names', () => {
    const env = testEnv({
      TEST_SRP_2: 'alpha beta gamma',
      TEST_SRP_3: '',
    });
    expect(missingEnv(['TEST_SRP_2', 'TEST_SRP_3', 'TEST_SRP_4'], env)).toEqual(
      ['TEST_SRP_3', 'TEST_SRP_4'],
    );
    expect(requireSecretEnv('TEST_SRP_2', env)).toBe('alpha beta gamma');
    expect(() => requireSecretEnv('TEST_SRP_3', env)).toThrow(
      'TEST_SRP_3 environment variable is required for this scenario',
    );
  });

  it('fails a Secret step whose secret is missing, and the error carries the name only', async () => {
    const { brain, device } = fakes();
    const result = await new ScenarioAgent({
      scenario: swapScenario(),
      platform: 'android',
      cachePath: tempCachePath(),
      tracker: { addTimer: jest.fn() },
      runSecretStep: async () => {
        requireSecretEnv('SCENARIO_TEST_UNSET_SECRET', testEnv({}));
      },
      brain,
      device,
      log: jest.fn(),
      settlePollMs: 1,
    }).run();
    expect(result.status).toBe('FAIL');
    expect(result.steps.find((s) => s.error)?.error).toMatch(
      /SCENARIO_TEST_UNSET_SECRET environment variable is required/,
    );
    expect(result.modelCalls).toBe(0);
  });

  it('parses "(no threshold)" timers (originals without a threshold)', () => {
    const s = parseScenario(
      md(
        '2. App: start the clock\n3. Expect: list [check: code=account-list]',
        '- Measure from step 2 until step 3 (no threshold): account list',
      ),
    );
    expect(s.timers[0]).toMatchObject({
      name: 'account list',
      from: 2,
      until: 3,
    });
    expect(s.timers[0].threshold).toBeUndefined();
  });

  it('hands the timer to a timed code check (measureCreatePasswordToWalletHome)', async () => {
    const fake = statefulFakes({
      screens: { s: page() },
      start: 's',
      taps: {},
      replies: () => {
        throw new Error('no model');
      },
    });
    const seen: unknown[] = [];
    const result = await new ScenarioAgent({
      scenario: parseScenario(
        md(
          '2. App: start the clock\n3. Expect: wallet home [check: code=seedless-create-password-to-wallet]',
          '- Measure from step 2 until step 3 (Android 5000 ms, iOS 30000 ms): final',
        ),
      ),
      platform: 'android',
      cachePath: tempCachePath(),
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      runCodeCheck: async () => {
        throw new Error('plain code check must not run');
      },
      runTimedCodeCheck: async (name, timer) => {
        seen.push(name);
        await timer.measure(async () => undefined);
        return true;
      },
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
      settlePollMs: 1,
    }).run();
    expect(result.status).toBe('PASS');
    expect(seen).toEqual(['seedless-create-password-to-wallet']);
    expect(result.timers.map((t) => [t.name, t.valid])).toEqual([
      ['final', true],
    ]);
    expect(result.modelCalls).toBe(0);
  });

  it('needs no proof call for a pinned tap followed by a pinned Expect', async () => {
    const fake = statefulFakes({
      screens: {
        landing: page(
          node(
            'wallet-setup-screen-create-new-wallet-button-id',
            'Create a new wallet',
          ),
        ),
        sheet: page(
          node(
            'onboarding-sheet-import-seed-button-id',
            'Use Secret Recovery Phrase',
          ),
        ),
      },
      start: 'landing',
      taps: {
        'landing:wallet-setup-screen-create-new-wallet-button-id': 'sheet',
      },
      replies: () => {
        throw new Error('no model call expected');
      },
    });
    const result = await new ScenarioAgent({
      scenario: parseScenario(
        md(`2. Tap Create a new wallet [tap: testID=wallet-setup-screen-create-new-wallet-button-id]
3. Expect: the sheet [check: testID=onboarding-sheet-import-seed-button-id]`),
      ),
      platform: 'android',
      cachePath: tempCachePath(),
      tracker: { addTimer: jest.fn() },
      runSecretStep: jest.fn().mockResolvedValue(undefined),
      brain: fake.brain,
      device: fake.device,
      log: jest.fn(),
      settlePollMs: 1,
    }).run();
    expect(result.status).toBe('PASS');
    expect(result.modelCalls).toBe(0);
    expect(fake.screenName()).toBe('sheet');
  });
});
