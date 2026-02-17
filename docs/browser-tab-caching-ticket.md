# Browser tab caching – ticket description

## Summary

Implement caching for active and recently visited browser tabs:

- Allow **20 tabs** (increase from current limit).
- The **latest 5 tabs** are mounted/cached (live WebView in memory; instant switch, state retained).
- The **remaining 15 tabs** are unmounted; at the time of unmounting, the app saves the **link (URL)** and a **screenshot** for each, and shows them in the tabs list. When the user selects one, the tab is mounted again and loads the saved URL.

---

## Description

**Current behaviour:** The in-app browser has a limited number of tabs; only some stay mounted and the rest are archived (or similar). Screenshots are taken in specific moments (e.g. when opening the tabs view).

**Desired behaviour:**

1. **Allow 20 tabs**  
   Users can have up to 20 browser tabs. When at 20, the existing “max tabs” behaviour applies (modal or replace).

2. **Latest 5 tabs mounted/cached**  
   The 5 “latest” tabs (most recently activated: switched to or created) stay mounted: they keep a live WebView, switch instantly when selected, and retain scroll/navigation state.

3. **Remaining 15: link + screenshot at unmount**  
   Tabs that are not in the latest 5 are unmounted. **When** a tab leaves the mounted set, the app must save:
   - the **current URL** (link), and
   - a **screenshot** of that tab’s content.  
     Those 15 tabs appear in the tabs grid with their saved screenshot and URL. Tapping one mounts it again and loads the saved URL.

---

## Acceptance criteria

- User can open up to **20** browser tabs; at 20, no 21st tab is created (existing max-tabs flow).
- Exactly the **5 most recently activated** tabs have a live WebView (mounted); switching to them is instant and state is preserved.
- “Activated” = user switched to that tab or created it; activating updates “latest 5.”
- Tabs that are **not** in the latest 5 are unmounted. Each has a **URL** and **screenshot** saved **at the time it was unmounted** (e.g. when user switched to a 6th tab).
- The **tabs list** shows all tabs (up to 20). Unmounted tabs display their saved screenshot and URL.
- **Selecting an unmounted tab** mounts it, loads the saved URL, and makes it active (and one of the latest 5).

---

## Technical scope

**In scope**

- Max 20 tabs; max 5 mounted at any time.
- “Latest 5” = 5 most recently activated tabs (track recency, e.g. `lastActiveAt` on each tab).
- Capture screenshot + URL when a tab **leaves** the mounted set (before unmount), e.g. via `captureRef` on that tab’s WebView.
- Browser decides which tabs are mounted; BrowserTab exposes a capture API (ref + imperative handle) so Browser can request screenshot + URL before unmounting.
- Tabs view shows all 20; switching to any tab (mounted or cached) works and updates recency.

**Out of scope**

- Whether tabs persist across app restart (confirm separately; may already be handled by Redux persist).
- Whether 20-tab / 5-mounted rules apply to DiscoveryTab in the same way (confirm separately).
- Virtualization of the tab grid (follow-up unless needed for performance).
- Changes to max-tabs modal beyond using the new limit (20).

---

## Technical implementation (high level)

1. **Constants & data:** `MAX_BROWSER_TABS = 20`, `MAX_MOUNTED_TABS = 5`. Add `lastActiveAt` (timestamp) to tab state; set on create and on set active.
2. **Mounted set:** Derive “tab ids to mount” = active tab + next 4 by `lastActiveAt` (desc). Render `<BrowserTab>` only for those 5; all other tabs are unmounted (cached).
3. **Screenshot on unmount:** When the mounted set shrinks (e.g. user switches to a 6th tab), for each tab that is leaving: call BrowserTab’s capture API to get screenshot + current URL, then `updateTab(id, { url, image })`. After capture completes, allow that tab to unmount.
4. **Recency:** On `setActiveTab` and `createNewTab`, update that tab’s `lastActiveAt`. Remove or repurpose idle-based archiving so only recency drives which 5 are mounted.
5. **Switch to cached tab:** Same as today (set active + update tab); tab enters top 5 and is mounted with `initialUrl` = saved URL.
6. **Tests:** Cover 20-tab limit, 5 mounted, recency, screenshot-on-unmount, and switching to a cached tab.

**Key files:** Browser (`index.js`), BrowserTab (`BrowserTab.tsx`), browser reducer, browser constants, tab types. Existing plan doc has detailed steps and file paths.
