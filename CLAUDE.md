# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MetaMask Mobile Development Guide

This is the MetaMask Mobile React Native application codebase supporting iOS and Android platforms with multichain wallet functionality.

## Common Development Commands

### Setup and Dependencies

- `yarn setup` - Initial project setup (includes dependencies and build steps)
- `yarn setup:expo` - Expo-only setup for JS development without native compilation
- `yarn clean` - Clean all build artifacts and reinstall dependencies

### Development

- `yarn watch` - Start Metro bundler for development
- `yarn start:ios` - Build and run iOS debug version
- `yarn start:android` - Build and run Android debug version
- `yarn start:ios:flask` - Run iOS with Flask build variant
- `yarn start:android:flask` - Run Android with Flask build variant
- `yarn start:ios:device` - Run iOS on physical device
- `yarn start:android:e2e` - Android build for E2E testing
- `yarn start:ios:e2e` - iOS build for E2E testing

### Testing

- `yarn test` or `yarn test:unit` - Run unit tests with Jest
- `jest path/to/specific.test.ts` - Run single test file
- `jest --testNamePattern="test name"` - Run specific test by name
- `yarn test:e2e:ios:debug:run` - Run iOS E2E tests with Detox
- `yarn test:e2e:android:debug:run` - Run Android E2E tests with Detox
- `yarn test:wdio:ios` - Run WebDriverIO tests for iOS
- `yarn test:wdio:android` - Run WebDriverIO tests for Android

### Code Quality

- `yarn lint` - ESLint check for all TypeScript/JavaScript files
- `yarn lint:fix` - Auto-fix linting issues
- `yarn lint:tsc` - TypeScript type checking
- `yarn format` - Format code with Prettier
- `yarn format:check:changed` - Check formatting on changed files only

### Building for Production

- `yarn build:android:release` - Android release build
- `yarn build:ios:release` - iOS release build
- `yarn build:android:main:prod` - Android production build for main variant
- `yarn build:ios:main:prod` - iOS production build for main variant

## Project Architecture

### Core Structure

- `app/` - Main application code
  - `core/` - Core services and business logic
    - `Engine/` - Main controller engine managing all blockchain operations
    - `BackgroundBridge/` - Bridge for background script communication
    - `SDKConnect/` - SDK connection management
    - `WalletConnect/` - WalletConnect protocol implementation
  - `components/` - React Native UI components
    - `component-library/` - Design system components
    - `UI/` - Legacy UI components
    - `Views/` - Screen-level components
  - `actions/` - Redux action creators
  - `reducers/` - Redux state management
  - `selectors/` - Redux state selectors with reselect
  - `store/` - Redux store configuration and migrations
  - `util/` - Utility functions and helpers

### Key Controllers (in app/core/)

- `Engine.ts` - Central controller orchestrating all blockchain operations
- `BackgroundBridge/` - Handles communication between UI and background processes
- `NetworkController` - Multi-network management (Ethereum, Polygon, etc.)
- `TransactionController` - Transaction lifecycle management
- `KeyringController` - Private key and account management
- `PermissionsController` - DApp permissions and connection management

### Build Variants

The app supports multiple build variants:

- **main** - Production MetaMask
- **flask** - Beta/experimental features
- **qa** - QA testing builds

### State Management

- Redux with redux-persist for state persistence
- Complex migration system in `app/store/migrations/`
- Selectors use reselect for performance optimization

### Testing Strategy

- **Unit Tests**: Jest for components and utilities
- **E2E Tests**: Detox for native app testing
- **WebDriver Tests**: WebDriverIO for cross-platform testing
- **Component Tests**: Storybook for component development

### Development Approaches

**Expo Development (Recommended)**:

- Fastest way to start developing - no native environment setup required
- Use `yarn setup:expo` for JS-only development
- Download pre-built development builds from Runway buckets
- Use `yarn watch` to start Metro bundler, then connect via QR code or simulator
- Only requires node, yarn, and watchman installation

**Native Development**:

- Required when modifying native code or adding libraries with native dependencies
- Full environment setup with Xcode/Android Studio required
- Use `yarn setup` for complete native compilation setup
- **Build Types**: Debug, release, and various environment-specific builds

### Key Dependencies

- React Native 0.76.9 with TypeScript
- @metamask/\* packages for blockchain functionality
- Redux ecosystem for state management
- Detox and WebDriverIO for testing
- Expo for development tooling

### Multichain Support

- Ethereum and EVM-compatible chains
- Bitcoin integration via Snaps
- Solana support through wallet snaps
- Cross-chain transaction management

### Security Features

- Hardware wallet support (Ledger, Keystone)
- Biometric authentication
- Encrypted storage via react-native-keychain
- PPOM (Protection Protocol for Off-chain Messaging) integration

## Development Notes

### Firebase Setup Required

The app requires Firebase configuration files for push notifications:

- Android: `android/app/google-services.json`
- iOS: `ios/GoogleServices/GoogleService-Info.plist`
- Environment variables: `GOOGLE_SERVICES_B64_ANDROID` and `GOOGLE_SERVICES_B64_IOS`

### Performance Considerations

- Use `yarn circular:deps` to check for circular dependencies
- Metro bundler configuration in `metro.config.js`
- Performance monitoring via React Native Performance
- Bundle size tracking with `yarn js-bundle-stats`

### Additional Useful Commands

- `yarn clean:ios` - Clean iOS build artifacts only
- `yarn clean:android` - Clean Android build artifacts only
- `yarn clean:node` - Remove node_modules and reinstall dependencies
- `yarn setup:flask` - Setup with Flask build variant
- `yarn setup:e2e` - Setup E2E testing environment
- `yarn pod:install` - Install CocoaPods for iOS (run in ios/ directory context)

### Code Organization Patterns

- Feature-based organization in many directories
- Shared utilities in `app/util/`
- Type definitions in `app/declarations/`
- Constants centralized in `app/constants/`
- Extensive use of hooks for component logic

### UI Development Guidelines

**CRITICAL**: Always prioritize @metamask/design-system-react-native components over custom implementations.

**Component Hierarchy (strict order)**:

1. **FIRST**: Use `@metamask/design-system-react-native` components
2. **SECOND**: Use `app/component-library` components if design system lacks the component
3. **LAST RESORT**: Custom components with StyleSheet (avoid unless absolutely necessary)

**Required Styling Approach**:

- Use `const tw = useTailwind();` hook instead of importing twrnc directly
- Use `Box` component instead of `View`
- Use `Text` component with variants instead of raw Text with styles
- Use `twClassName` prop for static styles, `tw.style()` for dynamic styles
- Use design system color tokens: `bg-default`, `text-primary`, `border-muted`
- Use component props first: `variant`, `color`, `size`, etc.

**Code Pattern Examples**:

```tsx
// Basic Container
const MyComponent = () => {
  const tw = useTailwind();
  return (
    <Box twClassName="w-full bg-default p-4">
      <Text variant={TextVariant.HeadingMd}>Title</Text>
    </Box>
  );
};

// Interactive Element with Pressable
<Pressable
  style={({ pressed }) =>
    tw.style(
      'w-full flex-row items-center justify-between px-4 py-2',
      pressed && 'bg-pressed',
    )
  }
>
```

**Never Use**:

- `import tw from 'twrnc'` (use useTailwind hook instead)
- `StyleSheet.create()` (use Tailwind classes)
- Raw `View` or `Text` components (use Box/Text from design system)
- Arbitrary color values like `bg-[#3B82F6]` (use design tokens)

### Testing Best Practices

- Co-located test files (`.test.ts` alongside source)
- Comprehensive mocking in `app/__mocks__/`
- E2E tests in `/e2e/` with page object pattern
- Visual regression testing capabilities

**Test Structure and Naming**:

- Use AAA pattern (Arrange, Act, Assert) for test structure
- Write meaningful test names describing purpose, not implementation
- Each test should cover one behavior and be isolated
- Use "Given/When/Then" comments for clarity

**Example Structure**:

```ts
it('displays an error when input is invalid', () => {
  // Arrange (Given)
  const input = 'invalid@';

  // Act (When)
  const result = validateEmail(input);

  // Assert (Then)
  expect(result.isValid).toBe(false);
  expect(result.error).toBe('Invalid email format');
});
```

**Testing DO/DON'T**:

- ✅ Use strong matchers: `toBeOnTheScreen()`, `toHaveText()`
- ✅ Test public behavior, not implementation details
- ✅ Use mocks only when necessary (avoid over-mocking)
- ✅ Mock time, randomness, and external systems for determinism
- ❌ Don't use weak matchers like `toBeDefined()` for UI presence
- ❌ Don't test internal state or implementation details
- ❌ Don't use snapshot tests for logic validation
- ❌ Don't combine multiple behaviors in one test

**Workflow**: Always run `yarn test:unit` after code changes

### Pull Request Guidelines

**PR Title Requirements**:

- Follow Conventional Commits format: `type: description`
- Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`
- Keep titles concise (under 72 characters) and use imperative mood
- Examples: `feat: add NFT gallery to collectibles tab`, `fix: resolve wallet connection timeout`

**Required PR Practices**:

- **CRITICAL**: Always assign the PR to yourself (the author) immediately after creation
- Use the repository PR template and complete all sections
- Include Gherkin format manual testing steps for reproducible testing
- Auto-detect team labels based on GitHub team membership when possible
- Include screenshots/recordings for UI changes
- Target `main` branch unless otherwise specified
- Keep PRs focused on single feature/fix

**Team Label Auto-Detection**:

- Check author's MetaMask team membership: `gh api user/teams --paginate`
- Match against available `team-*` labels in repository
- Only add team label if there's a clear, confident match
- Leave empty if no clear match exists (better than wrong label)
- Example matches: `mobile-platform` → `team-mobile-platform`

**Gherkin Testing Format**:

```gherkin
Scenario: Import wallet via SRP
  Given the app is freshly installed
  When I tap "Import using Secret Recovery Phrase"
  And I enter a valid 12-word SRP
  Then I should land on the Home screen
```

**Branch Naming**: Use format `<type>/<short-kebab-description>` (e.g., `feat/add-nft-gallery`, `fix/wallet-connection-issue`)
