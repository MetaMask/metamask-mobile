# Token Search and Discovery Technical Documentation

## Premise
Token swapping represents a significant portion of web3 activity, creating opportunities to enhance user experience and engagement. By prominently displaying tokens in the browser interface and enabling search functionality, we provide users with expanded discovery capabilities and trading opportunities. Previously, users could only view tokens they already owned in their wallet, limiting their exposure to the broader token ecosystem.

## Ownership
The technical part of this project is currently lead by the MetaMask portfolio team. Since it integrates deeply in the wallet, we collaborate with the mobile platform, assets, and swaps teams.

## Core Modules
- UI: `DiscoveryTab`, `TokenDiscovery`, `UrlAutocomplete`, `SearchDiscoveryResult`
- Hooks: `useTokenSearch`, `usePopularTokens`
- Controllers: `TokenSearchDiscoveryController`

## UI Components

### [`DiscoveryTab`](../app/components/Views/DiscoveryTab/DiscoveryTab.tsx)
Displays the popular tokens list. Also mimics a browser tab by displaying a URL search bar + auto complete results list.

### [`TokenDiscovery`](../app/components/Views/TokenDiscovery/index.tsx)
Renders the popular tokens for discovery.

### [`SearchDiscoveryResult`](../app/components/UI/SearchDiscoveryResult/index.tsx)
Renders a search result, token or site. Also manages navigation from a search result to either asset details, swap interface, or web page.

### [`AssetLoader`](../app/components/Views/AssetLoader/index.tsx)
Intermediate loading component that fetches token display data and navigates to full asset view.

**Why Necessary**: 
- Token search results only contain basic token info (name, symbol, address, chainId)
- Full asset view requires additional data (balance, price history, metadata, swap eligibility)  
- AssetLoader bridges the gap by fetching complete token data before navigation

Data Flow:
1. DiscoveryTab navigates to this intermediary component with `{chainId, address}` as params
2. AssetLoader fetches full token display data via controller
3. `selectTokenDisplayData` selector monitors Redux state for results
4. Once data available, replaces itself with ASSET_VIEW route
5. Passes `isFromSearch: true` flag to indicate search origin

### [`UrlAutocomplete`](../app/components/UI/UrlAutocomplete/index.tsx)
Displays search results from different categories.

Search Categories:
1. Recents - recently visited sites
2. Favorites - bookmarks
3. Tokens - token results, only swappable
4. Sites - Dapp URLs

## Hooks

### [`useTokenSearch`](../app/components/hooks/TokenSearchDiscovery/useTokenSearch/useTokenSearch.ts)
Provides token search functionality to React components. Uses the portfolio API.

### [`usePopularTokens`](../app/components/hooks/TokenSearchDiscovery/usePopularTokens/usePopularTokens.ts)
Provides a list of popular tokens to React components. Uses the portfolio API.

## Controllers & Data Flow

### [`TokenSearchDiscoveryController`](../app/core/Engine/controllers/TokenSearchDiscoveryController/)

### [Data Transformation](../app/util/search-discovery/map-moralis-token-to-result.ts)

mapMoralisTokenToResult(): Transforms Moralis API response to:

```typescript
interface TokenSearchDiscoveryResult {
  category: 'tokens';
  chainId: string;
  address: string;
  name: string;
  symbol: string;
  logoUrl?: string;
  price?: string;
  pricePercentChange24h?: number;
  marketCap?: string;
}
```
