import { createContext, useContext } from 'react';

/**
 * Height of the chrome pinned over a Social shell tab page (the pill-tab row;
 * the header above it is already cleared by the pager's own top offset).
 *
 * The shell renders the pill row as an overlay on top of the pager, so a
 * page's scroll view reaches the top of its page and its content passes under
 * the glass chrome — the same behavior the Trade hub gets from
 * `FixedHubChromeSpacer`. Each page adds this inset to the top of its scroll
 * content so the content starts below the pills at rest.
 *
 * 0 outside the shell (e.g. a page rendered standalone keeps its own padding).
 */
const ShellChromeInsetContext = createContext(0);

export const ShellChromeInsetProvider = ShellChromeInsetContext.Provider;

/** Space the scroll content needs so it starts below the pinned pill row. */
export const useShellChromeInset = (): number =>
  useContext(ShellChromeInsetContext);
