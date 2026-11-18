import {
  fieldTextIn,
  genericLocatorReason,
  parseScreenNodes,
  screenSignature,
  visibleIn,
} from './screen.ts';
import type { Locator } from './types.ts';

const node = (id: string, text = '', y = 500, desc = '') =>
  `<android.view.View resource-id="${id}" text="${text}" content-desc="${desc}" bounds="[0,${y}][1000,${y + 100}]" displayed="true"/>`;
const page = (...nodes: string[]) => `<hierarchy>${nodes.join('')}</hierarchy>`;

describe('screen', () => {
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
});
