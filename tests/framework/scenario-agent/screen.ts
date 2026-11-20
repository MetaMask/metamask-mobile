import type { Locator, Point } from './types.ts';

export interface ScreenNode {
  text: string;
  desc: string;
  id: string;
  top: number;
  center: Point;
  box: [number, number, number, number];
}

const decodeXml = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/** Visible nodes with bounds from one Android page source fetch. */
export function parseScreenNodes(xml: string): ScreenNode[] {
  const nodes: ScreenNode[] = [];
  for (const match of xml.matchAll(/<[\w.$]+\s([^>]*?)\/?>/g)) {
    const attrs = match[1];
    const attr = (name: string) =>
      decodeXml(
        attrs.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1] ?? '',
      );
    const bounds = attr('bounds').match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!bounds || attr('displayed') === 'false') continue;
    const [x1, y1, x2, y2] = bounds.slice(1).map(Number);
    if (x2 <= x1 || y2 <= y1) continue;
    nodes.push({
      text: attr('text'),
      desc: attr('content-desc'),
      id: attr('resource-id'),
      top: y1,
      box: [x1, y1, x2, y2],
      center: { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) },
    });
  }
  return nodes;
}

/** Nodes the locator matches in a parsed page source (nativeXPath: none). */
export function matchingNodes(
  nodes: ScreenNode[],
  locator: Locator,
): ScreenNode[] {
  switch (locator.strategy) {
    case 'testID':
      return nodes.filter((n) => n.id === locator.value);
    case 'text':
      return nodes.filter((n) => n.text === locator.value);
    case 'label':
      return nodes.filter(
        (n) => n.desc === locator.value || n.text === locator.value,
      );
    default:
      return [];
  }
}

/** Visible text of the nodes inside a box (an element and its children). */
export function textInBox(
  nodes: ScreenNode[],
  [x1, y1, x2, y2]: ScreenNode['box'],
  except?: ScreenNode,
): string {
  return nodes
    .filter(
      (n) =>
        n !== except &&
        n.center.x >= x1 &&
        n.center.x <= x2 &&
        n.center.y >= y1 &&
        n.center.y <= y2,
    )
    .flatMap((n) => [n.text, n.desc].filter(Boolean))
    .join(' ');
}

/** Whether the element (and its text, when given) is in a parsed page source. */
export function visibleIn(
  nodes: ScreenNode[],
  locator: Locator,
  textPattern?: string,
): boolean {
  const matches = matchingNodes(nodes, locator);
  if (!textPattern) return matches.length > 0;
  const pattern = new RegExp(textPattern);
  return matches.some((n) => pattern.test(textInBox(nodes, n.box)));
}

/** What a field shows in a parsed page source: its own text, or text inside it. */
export function fieldTextIn(
  nodes: ScreenNode[],
  locator: Locator,
): string | null {
  const [field] = matchingNodes(nodes, locator);
  if (!field) return null;
  return field.text.trim() || textInBox(nodes, field.box, field).trim();
}

/**
 * What a person would notice changing on the screen. Status bar, prices,
 * balances and clocks are left out, since they change by themselves.
 */
export function screenSignature(nodes: ScreenNode[]): string {
  const numeric = /^[\s\d$€£¥%+\-−.,:()<>~≈]*$/;
  const clean = (value: string) => (numeric.test(value) ? '#' : value);
  return [
    ...new Set(
      nodes
        .filter((n) => !n.id.startsWith('com.android.systemui'))
        .map((n) => `${n.id}|${clean(n.text)}|${clean(n.desc)}`),
    ),
  ]
    .sort()
    .join('\n');
}

/** Words that name structure, not content: a match proves nothing. */
const STRUCTURE_WORDS = new Set([
  'container',
  'scroll',
  'scrollview',
  'view',
  'wrapper',
  'root',
  'layout',
  'content',
  'frame',
  'body',
  'safe',
  'area',
  'main',
  'list',
  'flatlist',
  'section',
  'navbar',
  'header',
  'bar',
  'tabbar',
  'screen',
  'page',
  'id',
]);
/** Screens that are on display most of the run (the wallet home). */
const SCREEN_WORDS = new Set(['home', 'homepage', 'wallet', 'app']);

/**
 * Why an element cannot prove an expectation or a step's effect, or null.
 * Rejects generic containers (homepage-container, scroll views, class-only
 * XPaths), controls such as buttons and tabs, and the name of the place to
 * look ("Activity" for "... listed in Activity"), unless the step text is
 * literally about that element.
 */
export function genericLocatorReason(
  locator: Locator,
  stepText: string,
): string | null {
  const step = stepText.toLowerCase();
  const name = `${locator.strategy}=${locator.value}`;
  if (locator.strategy === 'nativeXPath') {
    return /@(?:text|content-desc|resource-id)\s*=/.test(locator.value)
      ? null
      : `${name} matches by element class only, so it proves nothing about this step`;
  }
  if (locator.strategy === 'testID') {
    const words = locator.value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    const meaningful = words.filter((w) => !STRUCTURE_WORDS.has(w));
    if (meaningful.length === 0) {
      return `${name} is a generic container`;
    }
    if (
      meaningful.every((w) => SCREEN_WORDS.has(w)) &&
      !meaningful.some((w) => step.includes(w.replace('page', '')))
    ) {
      return `${name} is a generic screen container; the step is not about that screen`;
    }
    if (
      words.some((w) => ['button', 'btn', 'tab'].includes(w)) &&
      !/\b(?:button|tab)\b/.test(step)
    ) {
      return `${name} is a control, which shows whether or not the step happened`;
    }
    return null;
  }
  // text / label: the visible words. Reject the place to look on its own.
  const place =
    /\b(?:in|on|at|from)\s+(?:the\s+)?([\w ]+?)(?:\s+(?:tab|screen|page|view|list))?\s*$/i
      .exec(stepText)?.[1]
      ?.trim()
      .toLowerCase();
  if (place && locator.value.trim().toLowerCase() === place) {
    return `${name} names where to look, not what the step expects`;
  }
  return null;
}
