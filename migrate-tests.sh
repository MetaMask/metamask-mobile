#!/bin/bash

# Script to migrate Enzyme tests to React Native Testing Library (RNTL)

# Function to replace Enzyme imports with RNTL imports
replace_imports() {
  local file=$1
  sed -i "s|import { shallow, mount } from 'enzyme';|import { render } from '@testing-library/react-native';|g" "$file"
  sed -i "s|import { shallow } from 'enzyme';|import { render } from '@testing-library/react-native';|g" "$file"
}

# Function to replace Enzyme rendering methods with RNTL's render method
replace_render_methods() {
  local file=$1
  sed -i "s|const wrapper = shallow(|const { toJSON } = render(|g" "$file"
  sed -i "s|const wrapper = mount(|const { toJSON } = render(|g" "$file"
}

# Function to update snapshot tests to use toJSON() from RNTL
update_snapshots() {
  local file=$1
  sed -i "s|expect(wrapper).toMatchSnapshot();|expect(toJSON()).toMatchSnapshot();|g" "$file"
}

# Function to replace Enzyme's simulate with RNTL's userEvent
replace_simulate() {
  local file=$1
  sed -i "s|import { simulate } from 'enzyme';|import userEvent from '@testing-library/user-event';|g" "$file"
  sed -i "s|wrapper.simulate(|userEvent.setup().then(user => user.click(|g" "$file"
}

# Find all test files that import Enzyme, excluding this script
test_files=$(grep -rl "from 'enzyme'" /home/ubuntu/metamask-mobile --exclude=migrate-tests.sh)

# Debugging: Output the list of test files found
echo "Test files found:"
echo "$test_files"

# Iterate over each test file and apply the replacements
for file in $test_files; do
  echo "Migrating $file"
  replace_imports "$file"
  replace_render_methods "$file"
  update_snapshots "$file"
  replace_simulate "$file"
done

echo "Migration complete. Please run the test suite to verify the changes."
