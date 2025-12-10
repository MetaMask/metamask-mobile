# Deeplink Manager Briefing: Old vs New Link Handling

## Executive Summary

The MetaMask Mobile deeplink system is undergoing a migration from a **legacy switch-case based handler system** to a **modern handler-based routing architecture**. Both systems currently coexist, with the new system gradually taking over as handlers are migrated.

---

## Architecture Overview

### Entry Point Flow

```
User Clicks Link
    ↓
Branch.io / React Native Linking
    ↓
handleDeeplink() [handleDeeplink.ts]
    ↓
Redux Action: checkForDeeplink()
    ↓
DeeplinkManager.parse() [DeeplinkManager.ts]
    ↓
parseDeeplink() [parseDeeplink.ts]
    ↓
Protocol Detection & Routing
```

---

## Legacy System (Current Production)

### Architecture Pattern

**Location**: `app/core/DeeplinkManager/handlers/legacy/`

**Key Characteristics**:

- **Monolithic switch-case routing** in `handleUniversalLink.ts`
- **Direct function calls** to individual handler files
- **Tightly coupled** to DeeplinkManager instance
- **Mixed concerns**: URL parsing, signature verification, modal display, and routing all in one file

### Flow Diagram

```
parseDeeplink()
    ↓
Protocol Switch (HTTPS/METAMASK/WC/ETHEREUM/DAPP)
    ↓
handleUniversalLink() [for HTTPS/METAMASK]
    ↓
1. Domain Validation
2. Signature Verification
3. Link Type Determination (PUBLIC/PRIVATE/INVALID/UNSUPPORTED)
4. Interstitial Modal Display
5. Action Switch-Case Routing
    ↓
Individual Handler Functions:
- handleSwapUrl()
- handlePerpsUrl()
- handleRewardsUrl()
- handleBrowserUrl()
- handleEthereumUrl()
- ... (15+ handlers)
```

### Key Files

1. **`parseDeeplink.ts`**
   - Protocol detection and initial routing
   - Maps `metamask://` to `https://link.metamask.io/`
   - Routes to protocol-specific handlers

2. **`handleUniversalLink.ts`** (318 lines)
   - **Core routing logic** with massive switch-case
   - Signature verification integration
   - Interstitial modal management
   - Action-specific handler invocation
   - **Supported Actions**: SWAP, BUY, SELL, PERPS, REWARDS, WC, SEND, DAPP, etc.

3. **Individual Handler Files** (e.g., `handleSwapUrl.ts`, `handlePerpsUrl.ts`)
   - Action-specific logic
   - Navigation calls
   - Parameter parsing

### Strengths

✅ **Battle-tested**: Production-proven, handles all current deeplink types  
✅ **Complete**: All actions are implemented  
✅ **Direct**: Simple function calls, easy to trace

### Weaknesses

❌ **Monolithic**: 300+ line switch-case is hard to maintain  
❌ **Tightly Coupled**: Handlers depend on DeeplinkManager instance  
❌ **Hard to Extend**: Adding new actions requires modifying core routing file  
❌ **Mixed Concerns**: Routing, validation, and UI logic intertwined  
❌ **No Priority System**: All handlers treated equally  
❌ **Limited Testability**: Hard to test handlers in isolation

---

## New System (V2 - In Development)

### Architecture Pattern

**Location**: `app/core/DeeplinkManager/handlers/v2/`, `router/`, `registry/`, `normalization/`

**Key Characteristics**:

- **Handler-based architecture** with registry pattern
- **Separation of concerns**: Normalization → Registry → Router → Handlers
- **Priority-based execution** (lower number = higher priority)
- **Type-safe** with TypeScript interfaces
- **Pluggable**: Easy to add/remove handlers without touching core code
- **Testable**: Each component can be tested independently

### Flow Diagram

```
parseDeeplink()
    ↓
Protocol Detection
    ↓
UniversalRouterIntegration.processWithNewRouter()
    ↓
UniversalRouter.route()
    ↓
1. CoreLinkNormalizer.normalize() → CoreUniversalLink
2. HandlerRegistry.findHandlers() → [Handler1, Handler2, ...]
3. Execute handlers in priority order
4. Handler.handle() → HandlerResult
5. If not handled → delegateToLegacy()
```

### Core Components

#### 1. **CoreLinkNormalizer** (`normalization/CoreLinkNormalizer.ts`)

**Purpose**: Convert any deeplink format into standardized `CoreUniversalLink`

**Key Features**:

- Normalizes `metamask://`, `https://`, `dapp://` protocols
- Extracts action and parameters consistently
- Handles action-specific paths (swapPath, perpsPath, etc.)
- Validates supported actions

**Example**:

```typescript
Input:  "https://link.metamask.io/swap?sourceToken=ETH&destToken=USDC"
Output: {
  protocol: 'https',
  action: 'swap',
  params: { sourceToken: 'ETH', destToken: 'USDC', swapPath: 'swap?sourceToken=ETH&destToken=USDC' },
  source: 'browser',
  isValid: true,
  isSupportedAction: true
}
```

#### 2. **HandlerRegistry** (`registry/HandlerRegistry.ts`)

**Purpose**: Manage handler registration and discovery

**Key Features**:

- Maps actions to handlers: `'swap' → [SwapHandler]`
- Supports global handlers (run for all actions)
- Priority-based sorting
- Handler filtering via `canHandle()`

**Registration Example**:

```typescript
registry.register(new SwapHandler()); // Priority: 50
registry.register(new NavigationHandler()); // Priority: 10
```

#### 3. **UniversalRouter** (`router/UniversalRouter.ts`)

**Purpose**: Main routing orchestrator

**Key Features**:

- Normalizes URL → finds handlers → executes in order
- Lifecycle hooks: `beforeHandle()`, `afterHandle()`
- Fallback to legacy system if no handler succeeds
- Analytics tracking
- Error handling with fallback

**Execution Flow**:

```typescript
for (const handler of handlers) {
  handler.beforeHandle?.(link);
  const result = await handler.handle(link, context);
  handler.afterHandle?.(link, result);

  if (result.handled) return result;
  if (result.fallbackToLegacy) return delegateToLegacy();
}
```

#### 4. **BaseHandler** (`handlers/v2/BaseHandler.ts`)

**Purpose**: Abstract base class with common utilities

**Provides**:

- Navigation helpers (`navigate()`, `navigateToHome()`)
- Authentication checks (`isAuthenticated()`)
- Parameter validation (`validateParams()`)
- Error/success result builders
- Analytics tracking

#### 5. **Concrete Handlers** (`handlers/v2/`)

**Current Implementations**:

- **SwapHandler**: Handles `swap` action (priority 50)
- **SendHandler**: Handles `send` and `approve` actions (priority 50)
- **NavigationHandler**: Handles `home`, `rewards`, `perps`, etc. (priority 10)

**Handler Structure**:

```typescript
class SwapHandler extends BaseHandler {
  readonly supportedActions = [ACTIONS.SWAP];
  readonly priority = 50;

  async handle(
    link: CoreUniversalLink,
    context: HandlerContext,
  ): Promise<HandlerResult> {
    // Extract params, validate, navigate, return result
  }
}
```

### Integration Layer

#### **UniversalRouterIntegration** (`router/UniversalRouterIntegration.ts`)

**Purpose**: Bridge between new router and legacy system

**Key Features**:

- Feature flag check: `MM_UNIVERSAL_ROUTER`
- Creates handler context from DeeplinkManager instance
- Routes to UniversalRouter if flag enabled
- Falls back to legacy if flag disabled or routing fails

**Usage**:

```typescript
// In handleUniversalLink.ts (future integration point)
if (UniversalRouterIntegration.shouldUseNewRouter()) {
  const handled = await UniversalRouterIntegration.processWithNewRouter(
    url,
    source,
    instance,
  );
  if (handled) return;
}
// Continue with legacy switch-case...
```

#### **LegacyLinkAdapter** (`normalization/LegacyLinkAdapter.ts`)

**Purpose**: Bidirectional conversion between new and legacy formats

**Key Features**:

- `toLegacyFormat()`: Convert `CoreUniversalLink` → legacy `urlObj` + `params`
- `fromLegacyFormat()`: Convert legacy format → `CoreUniversalLink`
- `wrapHandler()`: Wrap legacy handlers to accept new format
- `extractActionParams()`: Extract action-specific paths

**Use Case**: Allows gradual migration - legacy handlers can be wrapped to work with new system

---

## Type System

### CoreUniversalLink

**Location**: `types/CoreUniversalLink.ts`

**Structure**:

```typescript
interface CoreUniversalLink {
  protocol: 'metamask' | 'https' | 'http' | 'wc' | 'ethereum' | 'dapp';
  host?: string;
  action: string;
  params: CoreLinkParams;
  source: string;
  timestamp: number;
  originalUrl: string;
  normalizedUrl: string;
  isValid: boolean;
  isSupportedAction: boolean;
  isPrivateLink: boolean;
  requiresAuth: boolean;
}
```

**Benefits**:

- Type-safe parameter access
- Consistent format across all protocols
- Metadata for debugging and analytics

### HandlerContext

**Location**: `types/UniversalLinkHandler.ts`

**Structure**:

```typescript
interface HandlerContext {
  navigation: {
    navigate: (routeName: string, params?: Record<string, unknown>) => void;
  };
  dispatch: (action: Record<string, unknown>) => void;
  instance: DeeplinkManager;
  featureFlags?: Record<string, boolean>;
  browserCallBack?: (url: string) => void;
}
```

**Purpose**: Provides handlers with all necessary dependencies without tight coupling

### HandlerResult

**Location**: `types/UniversalLinkHandler.ts`

**Structure**:

```typescript
interface HandlerResult {
  handled: boolean;
  fallbackToLegacy?: boolean;
  error?: Error;
  metadata?: Record<string, unknown>;
}
```

**Purpose**: Standardized return format for handler execution

---

## Migration Strategy

### Current State

- ✅ **New infrastructure complete**: Router, Registry, Normalizer, Adapter
- ✅ **3 handlers migrated**: SwapHandler, SendHandler, NavigationHandler
- ✅ **Feature flag controlled**: `MM_UNIVERSAL_ROUTER` (currently disabled)
- ⚠️ **Legacy system still active**: All production traffic uses legacy

### Migration Path

1. **Phase 1: Infrastructure** ✅ **COMPLETE**
   - Core types and interfaces
   - Normalization layer
   - Registry and router
   - Base handler utilities

2. **Phase 2: Initial Handlers** ✅ **COMPLETE**
   - SwapHandler
   - SendHandler
   - NavigationHandler

3. **Phase 3: Integration** 🔄 **IN PROGRESS**
   - Wire UniversalRouterIntegration into `handleUniversalLink.ts`
   - Enable feature flag for testing
   - Gradual rollout

4. **Phase 4: Handler Migration** 📋 **PLANNED**
   - Migrate remaining handlers one by one:
     - `handlePerpsUrl` → PerpsHandler
     - `handleRewardsUrl` → RewardsHandler
     - `handleBrowserUrl` → BrowserHandler
     - `handleRampUrl` → RampHandler
     - etc.

5. **Phase 5: Legacy Removal** 📋 **FUTURE**
   - Remove legacy switch-case
   - Remove LegacyLinkAdapter (no longer needed)
   - Clean up legacy handler files

### Migration Benefits

- **Zero Downtime**: Feature flag allows gradual rollout
- **Easy Rollback**: Disable flag to revert to legacy
- **Incremental**: Migrate handlers one at a time
- **Testable**: New handlers can be tested independently

---

## Key Differences Summary

| Aspect             | Legacy System              | New System (V2)                |
| ------------------ | -------------------------- | ------------------------------ |
| **Routing**        | Switch-case in single file | Handler registry with priority |
| **Extensibility**  | Modify core file           | Register new handler           |
| **Coupling**       | Tight (DeeplinkManager)    | Loose (HandlerContext)         |
| **Testability**    | Hard (monolithic)          | Easy (isolated handlers)       |
| **Type Safety**    | Partial                    | Full TypeScript interfaces     |
| **Priority**       | None (order-based)         | Explicit priority system       |
| **Normalization**  | Inline parsing             | Dedicated normalizer           |
| **Error Handling** | Try-catch blocks           | Standardized HandlerResult     |
| **Analytics**      | Scattered                  | Centralized in router          |

---

## Signature Verification (Both Systems)

**Location**: `utils/verifySignature.ts`

**Process**:

1. Check for `sig` parameter
2. Extract `sig_params` list (e.g., `"screen,symbol"`)
3. Build canonical URL with only signed parameters
4. Verify ECDSA P-256 signature with public key
5. Return: `VALID` | `INVALID` | `MISSING`

**Used By**:

- Legacy: `handleUniversalLink.ts` (lines 142-168)
- New: Will be integrated into router/normalizer (future)

**Key Feature**: Dynamic parameter signing via `sig_params` allows unsigned params to be added without breaking signature

---

## Protocol Handling

### Supported Protocols

1. **`https://link.metamask.io/*`** - Universal links (primary)
2. **`metamask://*`** - Custom scheme (being phased out)
3. **`wc://*`** - WalletConnect protocol
4. **`ethereum://*`** - EIP-681 payment requests
5. **`dapp://*`** - In-app browser navigation

### Protocol Conversion

**Legacy**: `parseDeeplink.ts` converts `metamask://` → `https://link.metamask.io/`

**New**: `CoreLinkNormalizer` handles all protocols uniformly, converts to normalized format

---

## Testing Strategy

### Legacy System

- **Location**: `handlers/legacy/__tests__/`
- **Pattern**: Integration tests with DeeplinkManager instance
- **Coverage**: Each handler has dedicated test file

### New System

- **Location**: `router/`, `registry/`, `normalization/`, `handlers/v2/__tests__/`
- **Pattern**: Unit tests for each component
- **Coverage**:
  - ✅ HandlerRegistry tests
  - ✅ CoreLinkNormalizer tests
  - ✅ UniversalRouter tests
  - ✅ Individual handler tests

---

## Future Enhancements

### Planned Features

1. **Middleware System**: Pre/post processing hooks
2. **Handler Chaining**: Multiple handlers for same action
3. **Conditional Routing**: Route based on app state/feature flags
4. **Handler Analytics**: Track handler performance and success rates
5. **Dynamic Handler Loading**: Load handlers on-demand

### Potential Improvements

- **Caching**: Cache normalized links
- **Validation Layer**: Separate validation from routing
- **Error Recovery**: Retry logic for failed handlers
- **Handler Versioning**: Support multiple handler versions

---

## Code Locations Reference

### Legacy System

```
app/core/DeeplinkManager/
├── DeeplinkManager.ts          # Main class
├── parseDeeplink.ts            # Protocol routing
├── handleDeeplink.ts           # Entry point
└── handlers/legacy/
    ├── handleUniversalLink.ts   # Core routing (318 lines)
    ├── handleSwapUrl.ts
    ├── handlePerpsUrl.ts
    └── ... (15+ handlers)
```

### New System (V2)

```
app/core/DeeplinkManager/
├── router/
│   ├── UniversalRouter.ts              # Main router
│   └── UniversalRouterIntegration.ts   # Integration layer
├── registry/
│   └── HandlerRegistry.ts              # Handler registry
├── normalization/
│   ├── CoreLinkNormalizer.ts          # URL normalization
│   └── LegacyLinkAdapter.ts            # Legacy bridge
├── handlers/v2/
│   ├── BaseHandler.ts                 # Base class
│   ├── SwapHandler.ts
│   ├── SendHandler.ts
│   └── NavigationHandler.ts
└── types/
    ├── CoreUniversalLink.ts           # Core types
    └── UniversalLinkHandler.ts        # Handler interfaces
```

---

## Questions & Answers

### Q: Which system is currently active?

**A**: Legacy system handles all production traffic. New system exists but is feature-flag controlled and not yet integrated into main flow.

### Q: How do I add a new handler in the new system?

**A**:

1. Create handler class extending `BaseHandler`
2. Implement `supportedActions`, `priority`, and `handle()` method
3. Register in `UniversalRouter.initialize()`
4. No need to modify core routing code!

### Q: Can handlers be tested in isolation?

**A**: Yes! New handlers are fully testable without DeeplinkManager instance. Just provide mock `HandlerContext`.

### Q: What happens if a handler fails?

**A**: Router tries next handler in priority order. If all fail, falls back to legacy system via `delegateToLegacy()`.

### Q: How is signature verification handled?

**A**: Currently in legacy `handleUniversalLink.ts`. Will be integrated into router/normalizer in future.

### Q: When will legacy system be removed?

**A**: After all handlers are migrated and new system is proven stable. No timeline set yet.

---

## Summary

The MetaMask Mobile deeplink system is transitioning from a **monolithic switch-case architecture** to a **modern, extensible handler-based system**. The new architecture provides:

- ✅ **Better maintainability**: Modular, testable components
- ✅ **Easier extensibility**: Add handlers without touching core code
- ✅ **Type safety**: Full TypeScript support
- ✅ **Priority system**: Control handler execution order
- ✅ **Gradual migration**: Feature flag allows safe rollout

Both systems coexist, with the legacy system handling production traffic while the new system is being built and tested. The migration is incremental and can be rolled back at any time via feature flag.
