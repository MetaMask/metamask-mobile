/**
 * @jest-environment jsdom
 */
import {
  IMMERSVE_KYC_UI_JS,
  IMMERSVE_KYC_UI_STYLE_ID,
} from './ImmersveKYCModal';

jest.mock('../Onboarding/ImmersveKycIdentityLayout', () => () => null);

const runUiScript = () => {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const run = new Function(IMMERSVE_KYC_UI_JS) as () => void;
  run();
};

const flushMicrotasks = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const restoreDocument = () => {
  document.documentElement?.remove();
  const html = document.createElement('html');
  html.append(document.createElement('head'), document.createElement('body'));
  document.appendChild(html);
};

describe('IMMERSVE_KYC_UI_JS', () => {
  afterEach(() => {
    restoreDocument();
  });

  it('adds the style after html appears when injected before the document root exists', async () => {
    document.documentElement.remove();

    expect(() => runUiScript()).not.toThrow();
    expect(document.getElementById(IMMERSVE_KYC_UI_STYLE_ID)).toBeNull();

    document.appendChild(document.createElement('html'));
    await flushMicrotasks();

    const style = document.getElementById(IMMERSVE_KYC_UI_STYLE_ID);

    expect(style).not.toBeNull();
    expect(style?.textContent).toContain('session-progress-header');
    expect(style?.textContent).toContain('data-test="exit"');
  });

  it('adds one style element when the script runs twice', () => {
    runUiScript();
    runUiScript();

    expect(
      document.querySelectorAll(`#${IMMERSVE_KYC_UI_STYLE_ID}`),
    ).toHaveLength(1);
  });
});
