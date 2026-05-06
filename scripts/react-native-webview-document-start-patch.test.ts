import { readFileSync } from 'fs';
import { resolve } from 'path';

const patchPath = resolve(
  __dirname,
  '..',
  'patches',
  '@metamask+react-native-webview+14.6.0.patch',
);

const patch = readFileSync(patchPath, 'utf8');

describe('@metamask/react-native-webview document-start patch', () => {
  it('registers AndroidX document-start injection before loading the source', () => {
    expect(patch).toContain('WebViewFeature.DOCUMENT_START_SCRIPT');
    expect(patch).toContain('WebViewCompat.addDocumentStartJavaScript');
    expect(patch).toContain('viewWrapper.webView.resetDocumentStartJavaScript()');
  });

  it('keeps the legacy evaluateJavascript path as an unsupported-device fallback', () => {
    expect(patch).toContain('if (isDocumentStartJavaScriptSupported()) {');
    expect(patch).not.toContain('-            evaluateJavascriptWithFallback');
    expect(patch).toContain('window.self !== window.top');
  });
});
