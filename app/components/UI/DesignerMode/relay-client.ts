import type {
  RNComponentInfo,
  ChangesetEntry,
  DesignerModeRNOptions,
} from './types';

function formatProps(
  props: Record<string, unknown> | null,
): [string, string][] {
  if (!props) return [];
  return Object.entries(props)
    .filter(
      ([k, v]) =>
        k !== 'style' &&
        k !== 'children' &&
        typeof v !== 'function' &&
        typeof v !== 'object',
    )
    .slice(0, 15)
    .map(([k, v]) => [k, String(v)]);
}

export function buildAgentPrompt(
  info: RNComponentInfo,
  changeset: ChangesetEntry[],
  message: string,
): string {
  const lines: string[] = [
    '=== DESIGNER MODE REQUEST (React Native) ===',
    '',
    'Selected Component',
    `  Component : ${info.componentName}`,
  ];

  if (info.parentComponent) lines.push(`  Parent    : ${info.parentComponent}`);
  if (info.ancestorChain.length > 1)
    lines.push(`  Path      : ${info.ancestorChain.join(' > ')}`);
  if (info.textContent) lines.push(`  Text      : ${info.textContent}`);
  if (info.accessibilityLabel)
    lines.push(`  A11y Label: ${info.accessibilityLabel}`);
  if (info.filePath)
    lines.push(
      `  File      : ${info.filePath}${info.lineNumber ? `:${info.lineNumber}` : ''}`,
    );
  if (info.callSiteComponent)
    lines.push(`  Call Site : <${info.callSiteComponent}> (authored above)`);
  if (info.testID) lines.push(`  Test ID   : ${info.testID}`);

  // Composition chain with source locations — lets the agent target the right
  // instance instead of editing a shared design-system primitive.
  if (info.componentChain && info.componentChain.length > 0) {
    lines.push('', 'Component Chain (tapped → up)');
    for (const entry of info.componentChain) {
      const loc = entry.fileName
        ? ` — ${entry.fileName}${entry.lineNumber ? `:${entry.lineNumber}` : ''}`
        : '';
      lines.push(`  ${entry.name}${loc}`);
    }
    lines.push(
      '',
      'NOTE: If "File" points at a shared primitive (component-library / design-system),',
      'do NOT edit the primitive. Use the first app-code entry in the chain above',
      '(the call site) plus Text / A11y Label / Test ID to locate the specific instance.',
    );
  }

  // Parent component props (the user component wrapping the tapped element)
  const parentPropEntries = formatProps(info.parentProps);
  if (parentPropEntries.length > 0) {
    lines.push('', `${info.parentComponent ?? 'Parent'} Props`);
    for (const [k, v] of parentPropEntries) {
      lines.push(`  ${k.padEnd(14)}: ${v}`);
    }
  }

  // Direct element props
  const propEntries = formatProps(info.props);
  if (propEntries.length > 0) {
    lines.push('', 'Element Props');
    for (const [k, v] of propEntries) {
      lines.push(`  ${k.padEnd(14)}: ${v}`);
    }
  }

  if (info.styleNames.length > 0) {
    lines.push('', 'Style Names');
    lines.push(`  ${info.styleNames.map((n) => `styles.${n}`).join(', ')}`);
  }

  if (info.layout) {
    lines.push('', 'Layout');
    lines.push(`  width   : ${Math.round(info.layout.width)}`);
    lines.push(`  height  : ${Math.round(info.layout.height)}`);
    lines.push(`  x       : ${Math.round(info.layout.pageX)}`);
    lines.push(`  y       : ${Math.round(info.layout.pageY)}`);
  }

  if (info.style && Object.keys(info.style).length > 0) {
    lines.push('', 'Styles');
    for (const [key, value] of Object.entries(info.style)) {
      lines.push(
        `  ${key} : ${typeof value === 'object' ? JSON.stringify(value) : value}`,
      );
    }
  }

  if (changeset.length > 0) {
    const styleNameChanges = changeset.filter((e) =>
      e.property.startsWith('style:'),
    );
    const propChanges = changeset.filter(
      (e) => !e.property.startsWith('style:'),
    );

    if (propChanges.length > 0) {
      lines.push('', 'Changeset (inline edits)');
      for (const entry of propChanges) {
        lines.push(
          `  ${entry.property} : ${entry.original} → ${entry.current}`,
        );
      }
    }

    if (styleNameChanges.length > 0) {
      lines.push(
        '',
        "Style Name Changes (modify the component's style={[...]} array)",
      );
      for (const entry of styleNameChanges) {
        if (entry.property.startsWith('style:add')) {
          lines.push(`  ADD    : styles.${entry.current}`);
        } else {
          lines.push(`  REMOVE : styles.${entry.original}`);
        }
      }
    }
  }

  if (message) {
    lines.push('', 'Designer Message');
    lines.push(`  "${message}"`);
  }

  lines.push('', '=== END ===');
  return lines.join('\n');
}

export async function sendToRelay(
  relayUrl: string,
  prompt: string,
): Promise<void> {
  const response = await fetch(`${relayUrl}/api/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: prompt,
  });
  if (!response.ok) {
    throw new Error(`Relay server responded ${response.status}`);
  }
}

export async function pollForResponse(
  relayUrl: string,
  signal: AbortSignal,
): Promise<string | null> {
  while (!signal.aborted) {
    try {
      const response = await fetch(`${relayUrl}/api/poll`, { signal });
      if (response.status === 200) {
        return await response.text();
      }
    } catch {
      // Aborted (superseded by a newer request) — exit now instead of sleeping.
      if (signal.aborted) break;
      // Otherwise a network error — fall through and retry after a short wait.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return null;
}

export async function checkRelayHealth(relayUrl: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);
  try {
    const r = await fetch(`${relayUrl}/api/health`, {
      signal: controller.signal,
    });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
