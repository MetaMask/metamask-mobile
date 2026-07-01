import type { Json } from '@metamask/utils';
import { BrowserViewSelectorsIDs } from '../../app/components/Views/BrowserTab/BrowserView.testIds';
import type { EncapsulatedElementType } from '../framework/EncapsulatedElement';
import type { PlaywrightElement } from '../framework/PlaywrightAdapter';
import Assertions from '../framework/Assertions';
import Gestures from '../framework/Gestures';
import Matchers from '../framework/Matchers';
import PlaywrightMatchers from '../framework/PlaywrightMatchers';
import { getDriver } from '../framework/PlaywrightUtilities';
import UnifiedGestures from '../framework/UnifiedGestures';
import Utilities, { sleep } from '../framework/Utilities';
import {
  TestSnapInputSelectorWebIDS,
  TestSnapViewSelectorWebIDS,
} from '../selectors/Browser/TestSnaps.selectors';

type ButtonKey = keyof typeof TestSnapViewSelectorWebIDS;
type InputKey = keyof typeof TestSnapInputSelectorWebIDS;

type NativeTapTarget =
  | { kind: 'label'; label: string }
  | { kind: 'sectionButton'; section: string; label: string };

/** Visible labels on metamask.github.io test-snaps (smoke suite buttons only). */
const NATIVE_BUTTON_TARGETS: Partial<Record<ButtonKey, NativeTapTarget>> = {
  connectClientStatusSnapButton: {
    kind: 'label',
    label: 'Connect to Client Status Snap',
  },
  sendClientStatusButton: {
    kind: 'sectionButton',
    section: 'Client Status Snap',
    label: 'Submit',
  },
  connectLifeCycleButton: {
    kind: 'label',
    label: 'Connect to Lifecycle Hooks Snap',
  },
  connectBip32Button: { kind: 'label', label: 'Connect to BIP-32 Snap' },
  connectJsonRpcButton: { kind: 'label', label: 'Connect to JSON-RPC Snap' },
  sendRpcButton: { kind: 'label', label: 'Invoke Snap' },
  connectWasmButton: { kind: 'label', label: 'Connect to WebAssembly Snap' },
  sendWasmMessageButton: { kind: 'label', label: 'Calculate' },
  connectGetPreferencesButton: {
    kind: 'label',
    label: 'Connect to Preferences Snap',
  },
  getPreferencesButton: {
    kind: 'sectionButton',
    section: 'Preferences Snap',
    label: 'Submit',
  },
  connectCronjobSnapButton: {
    kind: 'label',
    label: 'Connect to Cronjobs Snap',
  },
  connectErrorSnapButton: { kind: 'label', label: 'Connect to Errors Snap' },
  sendErrorButton: { kind: 'label', label: 'Send Test to Error Snap' },
  connectDialogSnapButton: { kind: 'label', label: 'Connect to Dialogs Snap' },
  sendConfirmationButton: { kind: 'label', label: 'Confirmation' },
};

const NATIVE_INPUT_TARGETS: Partial<
  Record<InputKey, { section: string; fieldLabel: string }>
> = {
  wasmInput: { section: 'WebAssembly Snap', fieldLabel: 'Input' },
};

export const ANDROID_TEST_SNAPS_LOAD_LABEL = 'Connect to Client Status Snap';

const SCROLL_TIMEOUT_MS = 30_000;
const SCROLL_ATTEMPTS = 12;

export async function waitForAndroidTestSnapsNativeLoad(): Promise<void> {
  await Assertions.expectTextDisplayed(ANDROID_TEST_SNAPS_LOAD_LABEL, {
    timeout: SCROLL_TIMEOUT_MS,
  });
}

export async function tapAndroidTestSnapsButton(
  buttonKey: ButtonKey,
): Promise<void> {
  const target = NATIVE_BUTTON_TARGETS[buttonKey];
  if (!target) {
    throw new Error(
      `No native Android label mapped for Test Snaps button: ${buttonKey}`,
    );
  }

  const element =
    target.kind === 'label'
      ? await scrollNativeTextIntoView(target.label)
      : await scrollNativeSectionButtonIntoView(target.section, target.label);

  await Gestures.tap(asEncapsulated(element), {
    elemDescription: `Android native Test Snaps button: ${buttonKey}`,
  });
}

export async function fillAndroidTestSnapsInput(
  inputKey: InputKey,
  value: string,
): Promise<void> {
  const target = NATIVE_INPUT_TARGETS[inputKey];
  if (!target) {
    throw new Error(
      `No native Android input mapping for Test Snaps field: ${inputKey}`,
    );
  }

  const escapedSection = escapeXPathLiteral(target.section);
  const xpath = `//*[contains(@text,${escapedSection})]/following::android.widget.EditText[1]`;
  const input = await scrollNativeElementIntoView(
    () => PlaywrightMatchers.getElementByXPath(xpath),
    target.fieldLabel,
  );

  await input.clear();
  await input.fill(value);
}

export async function assertAndroidTestSnapsTextContains(
  expectedMessage: string,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const normalized = expectedMessage.replace(/^"|"$/g, '');
  await Utilities.executeWithRetry(
    async () => {
      const texts = await collectNativeTexts();
      if (!texts.some((text) => text.includes(normalized))) {
        throw new Error(`Expected native page text to contain "${normalized}"`);
      }
    },
    {
      timeout: options.timeout ?? 5_000,
      interval: options.interval ?? 100,
      description: `Assert native text contains "${normalized}"`,
    },
  );
}

export async function assertAndroidTestSnapsJson(
  expectedJson: Json,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  await Utilities.executeWithRetry(
    async () => {
      const actualJson = await findJsonOnNativePage();
      if (
        typeof expectedJson === 'object' &&
        expectedJson !== null &&
        !Array.isArray(expectedJson)
      ) {
        await Assertions.checkIfObjectContains(
          actualJson as Record<string, unknown>,
          expectedJson as Record<string, unknown>,
        );
        return;
      }

      await Assertions.checkIfJsonEqual(actualJson, expectedJson);
    },
    {
      timeout: options.timeout ?? 5_000,
      interval: options.interval ?? 100,
      description: 'Assert native JSON result on Test Snaps page',
    },
  );
}

export async function assertAndroidTestSnapsClientStatus(
  expectedStatus: Record<string, Json>,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { clientVersion: expectedClientVersion, ...statusWithoutVersion } =
    expectedStatus;

  await Utilities.executeWithRetry(
    async () => {
      const actualJson = await findJsonOnNativePage();
      const { clientVersion: actualClientVersion, ...actualStatus } =
        actualJson as Record<string, Json>;

      await Assertions.checkIfJsonEqual(actualStatus, statusWithoutVersion);

      if (
        typeof expectedClientVersion !== 'string' ||
        typeof actualClientVersion !== 'string' ||
        !actualClientVersion.startsWith(expectedClientVersion)
      ) {
        throw new Error(
          `Client version mismatch: expected prefix "${String(
            expectedClientVersion,
          )}", got "${String(actualClientVersion)}"`,
        );
      }
    },
    {
      timeout: options.timeout ?? 5_000,
      interval: options.interval ?? 100,
      description: 'Assert native client status JSON on Test Snaps page',
    },
  );
}

async function scrollNativeTextIntoView(text: string) {
  return scrollNativeElementIntoView(
    () => PlaywrightMatchers.getElementByText(text, false),
    text,
  );
}

async function scrollNativeSectionButtonIntoView(
  section: string,
  label: string,
) {
  const escapedSection = escapeXPathLiteral(section);
  const escapedLabel = escapeXPathLiteral(label);
  const xpath = `//*[contains(@text,${escapedSection})]/following::*[@text=${escapedLabel}][1]`;
  return scrollNativeElementIntoView(
    () => PlaywrightMatchers.getElementByXPath(xpath),
    `${section} → ${label}`,
  );
}

async function scrollNativeElementIntoView(
  findElement: () => ReturnType<typeof PlaywrightMatchers.getElementByText>,
  description: string,
) {
  const scrollContainer = Matchers.scrollContainer(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
  );
  const swipeTarget = Matchers.getElementByID(
    BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
  );

  for (let attempt = 0; attempt < SCROLL_ATTEMPTS; attempt += 1) {
    try {
      const element = await findElement();
      if (await Utilities.isElementVisible(asEncapsulated(element), 500)) {
        await Gestures.scrollToElement(
          asEncapsulated(element),
          scrollContainer,
          {
            timeout: 5_000,
            elemDescription: `Scroll native Test Snaps target: ${description}`,
          },
        );
        return element;
      }
    } catch {
      // Element not in the native accessibility tree yet — keep scrolling.
    }

    await UnifiedGestures.swipe(swipeTarget, 'up', {
      percentage: 0.55,
      description: 'Scroll Test Snaps page (native WebView)',
    });
    await sleep(300);
  }

  throw new Error(
    `Could not scroll native Test Snaps target into view: ${description}`,
  );
}

async function collectNativeTexts(): Promise<string[]> {
  const drv = getDriver();
  const nodes = await drv.$$('//*[@text!=""]');
  const texts: string[] = [];

  for (const node of nodes) {
    const text = await node.getText();
    if (text) {
      texts.push(text);
    }
  }

  return texts;
}

async function findJsonOnNativePage(): Promise<Json> {
  const texts = await collectNativeTexts();
  const candidates = texts.filter((text) => text.includes('{'));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as Json;
    } catch {
      const match = candidate.match(/\{[\s\S]*\}/);
      if (!match) {
        continue;
      }

      try {
        return JSON.parse(match[0]) as Json;
      } catch {
        continue;
      }
    }
  }

  throw new Error(
    `No JSON result found in native Test Snaps page text: ${candidates.join(
      ' | ',
    )}`,
  );
}

function asEncapsulated(element: PlaywrightElement): EncapsulatedElementType {
  return element as unknown as EncapsulatedElementType;
}

function escapeXPathLiteral(value: string): string {
  if (!value.includes("'")) {
    return `'${value}'`;
  }

  if (!value.includes('"')) {
    return `"${value}"`;
  }

  const parts = value.split("'");
  return `concat(${parts.map((part, index) => {
    const chunk = `'${part}'`;
    return index < parts.length - 1 ? `${chunk}, "'", ` : chunk;
  })})`;
}
