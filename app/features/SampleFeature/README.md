# Sample Feature

## Overview

The Sample Feature is a development and testing feature that demonstrates best practices and patterns for building features in MetaMask Mobile. This feature serves as a comprehensive reference implementation showcasing various aspects of the application architecture.

> [!WARNING]
> This is a sample feature for development/testing purposes only and should not be activated in production builds.

## Build Configuration

The Sample Feature uses code fencing to ensure it's completely excluded from production builds. It's only included when explicitly enabled via the `INCLUDE_SAMPLE_FEATURE` environment variable.

### Enabling the Feature

To include the Sample Feature in your build:

```bash
# For iOS development
INCLUDE_SAMPLE_FEATURE=true yarn start:ios

# For Android development
INCLUDE_SAMPLE_FEATURE=true yarn start:android

### How It Works

1. **Code Fencing**: All Sample Feature code is wrapped with code fence comments:
   ```typescript
   ///: BEGIN:ONLY_INCLUDE_IF(sample-feature)
   // Sample feature code here
   ///: END:ONLY_INCLUDE_IF
   ```

2. **Metro Transform**: The Metro bundler removes fenced code during build time based on the environment variable
3. **Zero Production Impact**: When `INCLUDE_SAMPLE_FEATURE` is not set, the code is completely removed from the bundle

### Default Behavior

- **Production builds**: Feature is always excluded
- **Development builds**: Feature is excluded unless explicitly enabled
- **QA/Beta builds**: Feature is excluded unless explicitly enabled

## Purpose

This feature demonstrates:
- Feature-based modular architecture
- State management using Redux Toolkit and Controllers
- Form validation and error handling
- Navigation patterns within the app
- UI component library usage and styling
- MetaMetrics tracking implementation
- Comprehensive unit testing
- End-to-end testing with Cucumber/Gherkin

## Architecture

### Directory Structure

The SampleFeature folder structure intentionally mirrors the main `/app` folder structure to demonstrate how features integrate with the broader application architecture. This allows the sample feature to showcase patterns without mixing sample code with production features.

> [!IMPORTANT]
> When creating real features, place them alongside existing production features in their respective directories:
- Components in `/app/components/`
- Redux state in `/app/reducers/`
- Controllers in `/app/core/controllers/`
- Selectors in `/app/selectors/`
- Analytics in `/app/core/Analytics/`
- ...

The SampleFeature's self-contained structure is only for demonstration purposes.

```
app/features/SampleFeature/
├── analytics/              # MetaMetrics event definitions
│   └── events.ts
├── components/             # React components
│   ├── hooks/             # Custom React hooks
│   │   ├── useSampleCounter/
│   │   ├── useSampleNetwork/
│   │   ├── useSamplePetNames/
│   │   └── useSamplePetNamesForm/
│   └── views/             # UI components
│       ├── SampleFeature.tsx           # Main feature component
│       ├── SampleCounterPane/          # Counter demo
│       ├── SampleNetworkDisplay/       # Network display
│       ├── SamplePetNames/             # Pet names management
│       └── SampleFeatureDevSettingsEntryPoint/ # The first view of the feature in the app settings
├── controllers/           # Business logic controllers
│   ├── sample-petnames-controller-init.ts
│   └── sample-petnames-controller-messenger.ts
├── reducers/              # Redux state management
│   └── sample-counter/
├── selectors/             # Redux selectors
│   └── samplePetNameController/
└── e2e/                   # End-to-end tests
    ├── edge-cases.feature
    ├── manual-test-scenarios.feature
    ├── pages/
    └── specs/
```

## Components

### 1. Sample Counter

A simple counter implementation demonstrating:
- Redux Toolkit state management
- Custom hooks (`useSampleCounter`)
- Action dispatching
- MetaMetrics event tracking

**Key Files:**
- `components/hooks/useSampleCounter/`
- `reducers/sample-counter/`
- `components/views/SampleCounterPane/`

### 2. Sample Pet Names

A more complex feature showing:
- Controller-based state management
- Form validation with error handling
- Network-specific data storage
- CRUD operations

**Key Files:**
- `controllers/sample-petnames-controller-init.ts`
- `controllers/sample-petnames-controller-messenger.ts`
- `components/hooks/useSamplePetNames/`
- `components/views/SamplePetNames/`

### 3. Sample Network Display

Demonstrates:
- Network state integration
- Dynamic UI updates based on network changes
- Component library usage

**Key Files:**
- `components/hooks/useSampleNetwork/`
- `components/views/SampleNetworkDisplay/`

## State Management Patterns

This feature demonstrates two state management approaches following MetaMask standards:

### Redux Pattern (Counter Example)

The counter demonstrates Redux Toolkit patterns following MetaMask standards. See the [MetaMask Contributor Documentation](https://github.com/MetaMask/contributor-docs/tree/main/docs) for Redux guidelines.
- Redux Toolkit slice with actions and reducers
- Selectors for accessing state
- Custom hooks for component integration
- Dispatch pattern for state updates
- Modern Redux best practices with RTK

### Controller Pattern (Pet Names Example)

The pet names feature showcases the Controller pattern:
- Controller initialization with messenger and persisted state
- Hook abstraction for component usage
- Network-specific state management
- Asynchronous operations handling

## Form Validation and Error Handling

The Pet Names form demonstrates comprehensive validation:

- **Address Validation**: Ethereum address format validation
- **Required Fields**: Name field validation
- **Duplicate Handling**: Shows confirmation dialog for existing addresses
- **Error States**: Visual feedback for validation errors
- **Keyboard Handling**: Proper keyboard dismissal and scroll behavior

## Navigation Patterns

### Accessing the Feature

1. Enable Developer Mode in app settings
2. Navigate to Settings → Developer Options
3. Tap "Navigate to Sample Feature"

### Internal Navigation

- Uses React Navigation integration
- Demonstrates proper back navigation
- Shows modal patterns (duplicate entry confirmation)

## UI Component Library Usage

The feature extensively uses the MetaMask component library:
- Text components with proper color and variant props
- Button components following design system
- TextField components with validation states
- Layout components for consistent spacing

### Styling Patterns

- Uses `useStyles` hook for theming
- Follows MetaMask design system
- Responsive layout with KeyboardAwareScrollView

## MetaMetrics Tracking

Events are defined in `analytics/events.ts` following the event builder pattern:
- Centralized event definitions in a dedicated analytics module
- Event builder helper functions for consistent event creation
- Type-safe event generation using the `generateOpt` utility
- Integration with the global MetaMetrics system
- Separation of event definition from event dispatching

## Testing

### Unit Testing

The SampleFeature demonstrates comprehensive testing patterns and best practices:

**Testing Framework:**
- React Native Testing Library for component testing
- Jest as the test runner and assertion library
- Testing hooks with `@testing-library/react-hooks`
- Redux state testing with mock stores

**Key Testing Patterns:**
- Component testing with user interaction simulation
- Hook testing in isolation
- Redux state and action testing
- Mocking external dependencies and modules
- Snapshot testing for UI consistency
- Async operation testing

**Mocking Strategies:**
- Module mocking for native dependencies
- Redux store mocking with `configureStore`
- Navigation mocking for testing navigation flows
- MetaMetrics tracking mock verification
- Controller mocking for isolated component tests

**Best Practices Demonstrated:**
- Descriptive test names following behavior-driven patterns
- Proper test setup and teardown
- Testing user interactions over implementation details
- Accessibility queries for element selection
- Waiting for async operations with `waitFor`
- Testing error states and edge cases
- Minimal snapshot usage focused on critical UI

Each component and hook has corresponding test files:

```bash
# Run specific test
yarn jest app/features/SampleFeature/components/views/SampleFeature.test.tsx

# Run all Sample feature unit test files
yarn jest app/features/SampleFeature --testMatch="**/*.test.ts?(x)"
```

**Test Coverage:**
- Component rendering
- User interactions
- State management
- Hook behavior
- Error scenarios

### End-to-End Testing

Comprehensive E2E tests written in TypeScript demonstrating best practices for Detox testing.

> [!NOTE]
> These e2e tests are for local development only and are not included in CI pipelines since this is a sample feature.

> [!IMPORTANT]
> The Sample Feature must be included in the build using the `INCLUDE_SAMPLE_FEATURE` flag for E2E tests to work.


1. Build the app with Sample Feature included for E2E testing:

    ```bash
    yarn test:e2e:sample:android:build
    ```

    Or for iOS:

    ```bash
    yarn test:e2e:sample:ios:build
    ```

2. Run Sample Feature E2E tests (environment variable included automatically):

    ```bash
    yarn test:e2e:sample:android:debug:run
    ```

    Or for iOS:

    ```bash
    yarn test:e2e:sample:ios:debug:run
    ```

**Without the flag, the Sample Feature won't be in the build and the tests will fail!**

**E2E Implementation Details:**
See [`app/features/SampleFeature/e2e/README.md`](./e2e/README.md) for:
- Page object patterns
- TypeScript configuration
- Selector strategies
- Test structure and organization

**Test Scenarios:**
- Navigation flows (Settings → Developer Options → Sample Feature)
- Counter interactions
- Pet name CRUD operations
- Form validation
- Network switching behavior

**Key E2E Testing Patterns:**
- Page Object Model for maintainable tests
- Text-based selectors for resilient element targeting
- Proper async handling with Detox waitFor utilities
- Integration with main app E2E page objects
- TypeScript for type-safe test code

## Development Guidelines

### Adding New Components

1. Create component in `components/views/`
2. Add corresponding hook in `components/hooks/` if needed
3. Write unit tests alongside the component
4. Add E2E test scenarios
5. Update analytics events if tracking is needed

### State Management Decision Tree

- **Simple UI State**: Use React hooks (useState, useReducer)
- **Feature-wide State**: Use Redux Toolkit slice
- **Cross-feature State**: Use Controller pattern
- **Form State**: Use custom form hooks with validation

### Code Quality

This feature follows MetaMask's coding standards. See the [MetaMask Contributor Documentation](https://github.com/MetaMask/contributor-docs/tree/main/docs) for guidelines on JavaScript, TypeScript, React, and testing.

> [!IMPORTANT]
> Add `@sampleFeature` JSDoc tag to indicate non-production code.

### Testing Requirements

This feature demonstrates testing patterns aligned with MetaMask standards. See the [testing guidelines](https://github.com/MetaMask/contributor-docs/tree/main/docs/testing) for unit testing, UI integration testing, and E2E testing best practices.

## Common Patterns

### Error Handling

The feature demonstrates proper error handling:
- Try-catch blocks for async operations
- User-friendly error messages
- Analytics tracking for failures
- Recovery strategies

### Form Validation

Address validation includes:
- Ethereum address format checking
- Required field validation
- Real-time validation feedback
- Clear error messaging

### Network-Specific Data

The pet names feature demonstrates network-specific data storage:
- Pet names are isolated per network using chainId
- Each network maintains its own list of pet names
- Switching networks automatically filters the displayed data
- Controller state is partitioned by network identifier

## Troubleshooting

### Feature Not Visible

1. Ensure Developer Mode is enabled
2. Check that the feature flag is enabled (if applicable)
3. Verify the build includes development features

### State Not Persisting

- Counter state persists only during session
- Pet names persist across sessions via Controller state
- Check Redux DevTools for state updates

### Testing Issues

- Clear test cache: `yarn jest --clearCache`
- Run with verbose output: `yarn jest --verbose`
- Check test environment setup

## Resources

- [MetaMask Contributor Documentation](https://github.com/MetaMask/contributor-docs)
- [MetaMask Mobile Architecture Guide](../../docs/architecture.md)
- [Component Library Documentation](../../component-library/README.md)

## Contributing

When contributing to this sample feature:

1. Maintain it as a reference implementation
2. Keep examples simple and focused
3. Document any new patterns thoroughly
4. Ensure all tests pass
5. Update this README with significant changes

> [!NOTE]
> This feature is for demonstration purposes. Real features should follow these patterns but be production-ready.
