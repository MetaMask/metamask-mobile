// TODO: This should either be only a string or a number
type TabId = string | number | null;

type Tab = {
  id: TabId;
  url: string;
  linkType?: string;
};

/**
 * Browser state
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BrowserState = {
  history: { url: string; name: string }[];
  whitelist: string[];
  tabs: Tab[];
  favicons: { origin: string; url: string }[];
  activeTab: TabId;
  visitedDappsByHostname: Record<string, boolean>;
};
