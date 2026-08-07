/**
 * Runtime shim replacing the removed `detox` package (MMQA-2230).
 * Detox smoke/CI are gone; dual-framework call sites that still hit Detox APIs
 * throw so Appium remains the only supported runner until Phase 3 Element API.
 */

const DETOX_REMOVED =
  'Detox has been removed (MMQA-2230). Use Appium Gestures/Assertions/Matchers from tests/framework.';

function detoxRemoved(api: string): never {
  throw new Error(`${DETOX_REMOVED} (called ${api})`);
}

interface Chain {
  toExist: () => Chain;
  toBeVisible: () => Chain;
  toHaveText: (_text: string) => Chain;
  toHaveLabel: (_label: string) => Chain;
  toHaveToggleValue: (_value: boolean) => Chain;
  toHaveId: (_id: string) => Chain;
  not: Chain;
  withTimeout: (_ms: number) => Promise<void>;
}

function createWaitForChain(api: string): Chain {
  const chain = {} as Chain;
  const self = (): Chain => chain;
  chain.toExist = self;
  chain.toBeVisible = self;
  chain.toHaveText = self;
  chain.toHaveLabel = self;
  chain.toHaveToggleValue = self;
  chain.toHaveId = self;
  chain.not = chain;
  chain.withTimeout = async () => detoxRemoved(api);
  return chain;
}

/** Chainable matcher stub — throws when used as a terminal Detox API. */
function createMatcherStub(api: string): DetoxMatcherStub {
  const stub: DetoxMatcherStub = {
    and: () => createMatcherStub(`${api}.and`),
    withDescendant: () => createMatcherStub(`${api}.withDescendant`),
    withAncestor: () => createMatcherStub(`${api}.withAncestor`),
    atIndex: () => detoxRemoved(`${api}.atIndex`),
  };
  return stub;
}

interface DetoxMatcherStub {
  and: (..._args: unknown[]) => DetoxMatcherStub;
  withDescendant: (..._args: unknown[]) => DetoxMatcherStub;
  withAncestor: (..._args: unknown[]) => DetoxMatcherStub;
  atIndex: (..._args: unknown[]) => never;
}

export function waitFor(_element?: unknown): Chain {
  return createWaitForChain('waitFor');
}

export const by = {
  id: (_id: string | RegExp) => createMatcherStub('by.id'),
  text: (_text: string | RegExp) => createMatcherStub('by.text'),
  label: (_label: string | RegExp) => createMatcherStub('by.label'),
  type: (_type: string) => createMatcherStub('by.type'),
  web: {
    id: (_id: string) => createMatcherStub('by.web.id'),
    cssSelector: (_selector: string) => createMatcherStub('by.web.cssSelector'),
    xpath: (_xpath: string) => createMatcherStub('by.web.xpath'),
    href: (_url: string) => createMatcherStub('by.web.href'),
  },
  system: {
    label: (_text: string) => createMatcherStub('by.system.label'),
  },
};

export function element(_matcher: unknown): DetoxMatcherStub {
  return createMatcherStub('element');
}

function createWebViewStub(api: string): {
  element: (..._args: unknown[]) => DetoxMatcherStub;
} {
  return {
    element: () => createMatcherStub(api),
  };
}

export function web(_matcher: unknown): {
  element: (..._args: unknown[]) => DetoxMatcherStub;
} {
  return createWebViewStub('web');
}

export const system = {
  element: (_matcher: unknown) => createMatcherStub('system.element'),
};

export interface LanguageAndLocale {
  language?: string;
  locale?: string;
}

export type IndexableNativeElement = DetoxMatcherStub;
export type NativeElement = DetoxMatcherStub;
export type IndexableSystemElement = DetoxMatcherStub;
export type IndexableWebElement = DetoxMatcherStub;
export type NativeMatcher = DetoxMatcherStub;
export type WebViewElement = ReturnType<typeof createWebViewStub>;
