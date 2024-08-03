# Enzyme Test Migration Playbook

## Overview

This playbook provides step-by-step instructions for migrating unit tests from Enzyme to React Native Testing Library (RNTL). The migration will use our custom rendering wrappers over RNTL. The migration is performed incrementally, allowing both test libraries to coexist and enabling a smooth transition.

## Inputs from the user

1. **Existing Test Files**: Access to the current test files using Enzyme.
    - Ensure that all necessary files are accessible and there is commit access.

## Procedure

1. **Update Test File Imports**
   - Replace Enzyme imports with `renderScreen` from our custom testing library.
   - Ensure the component and any necessary initial state data are imported.

2. **Prepare Mock Initial State**
   - Define a `mockInitialState` object that reflects the necessary state for the component being tested.

3. **Update Test Rendering**
   - Use `renderScreen` to render the component with the `mockInitialState`.

4. **Update Test Assertions**
   - Modify assertions to use the `toJSON()` method for snapshot testing.

5. **Run and Update Tests**
   - Execute the test command `yarn jest <test_file_path> --updateSnapshot` to ensure tests pass and snapshots are updated.

6. **Lint and Fix**
   - Run `yarn lint:fix` to address any linting issues.

7. **Commit and Push Changes**
   - Use `git status` to confirm only the specified test file and snapshot are changed.
   - Commit the changes with a detailed message.
   - Push the changes to the appropriate branch.

## Example

Here is an example of how to migrate a test file for a component:

```javascript
import { renderScreen } from '../../../util/test/renderWithProvider';
import Component from './';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState,
  },
};

describe('Component', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      Component,
      {
        name: 'Component',
      },
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
```

## Advice & Pointers

- Refer to the [React Native Testing Library documentation](https://testing-library.com/docs/react-native-testing-library/intro) for detailed information and advanced usages.
- Use the queries documentation to select the most appropriate queries for accessing component elements.

## Forbidden Actions

- Do NOT skip portions of the test suite. Ensure every test file using Enzyme is converted.
- Do NOT use Enzyme after migration completion. Remove all Enzyme dependencies to avoid confusion.
- Do NOT bypass accessibility best practices. Use roles and labels for better accessibility in tests.
