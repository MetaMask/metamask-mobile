# Migration and Testing Guidelines

## Overview

This document outlines best practices and guidelines for writing migration scripts and their corresponding test cases. The focus is on ensuring data integrity, handling errors gracefully, and maintaining consistency across mobile app versions.

## Migration Guidelines

1. **Pre-Validation Checks**: Before proceeding with the migration logic, ensure the state to be migrated is valid. Use utility functions like `ensureValidState` to verify the version and integrity of the state.

2. **Error Handling**: Use `captureException` from `@sentry/react-native` to log errors, which is crucial for diagnosing issues post-migration. Ensure that error messages are descriptive, including the migration number and a clear description of the issue. If an exception is detected, indicating potential data corruption, halt the migration process and return the state as is. This approach prevents further manipulation of potentially corrupted data, emphasizing the need for corrective action before proceeding.

3. **State Integrity Checks**: Perform thorough checks on the state's structure and types. Use functions like `isObject` and `hasProperty` to validate the state and its nested properties. Log errors and halt the migration for any inconsistencies to prevent data corruption.

4. **Avoid Type Casting**: Refrain from using type casting (e.g., `as` keyword in TypeScript) to manipulate the state or its properties. Type casting can mask underlying data structure issues, making the code less resilient to changes in dependencies or data structures. Instead, use type guards and runtime checks to ensure data integrity and compatibility.

5. **Return State**: Always return the state at the end of the migration function, whether it was modified or not. This ensures that the migration process completes and the state continues through any subsequent migrations.

## Testing Guidelines

1. **Mocking**: Use `jest.mock` to mock external dependencies, such as `@sentry/react-native`. This isolates the migration test and prevents external side effects.

2. **Initial State Setup**: Create an initial state that reflects possible real-world scenarios, including edge cases. Use utilities like `merge` from `lodash` to combine base states with specific test case modifications.

3. **Invalid State Scenarios**: Test how the migration handles invalid states. This includes null values, incorrect types, and missing properties. Ensure that the migration logs the appropriate errors without modifying the state.

4. **Data Synchronization Tests**: For migrations that synchronize data between controllers, write tests that verify the correct synchronization of data. Check for both the presence and accuracy of the synchronized data.

5. **Error Assertions**: Verify that errors are logged correctly for invalid states or unexpected conditions. Use `expect` to assert that `captureException` was called with the expected error messages.

6. **Ensure State Immutability**: Always use deep cloning (e.g., `cloneDeep` from `lodash`) on the old state before passing it to the migration function in tests. This practice ensures that the original state object is not mutated during the migration process, preserving the integrity of your test data across different test cases. Mutating the state directly can lead to hard-to-track bugs and false positives or negatives in your tests because subsequent tests might not start with the original state as intended. Deep cloning guarantees that each test case operates on an exact, untouched copy of the state, ensuring test reliability and accuracy.

## Conclusion

Following these guidelines will help ensure that migrations are robust, error-resistant, and maintain data integrity. Testing migrations thoroughly is crucial for identifying potential issues before they affect users. Always aim for clarity and thoroughness in both migration scripts and tests.
