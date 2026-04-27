// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { render, screen } from '@testing-library/react-native';

// Internal dependencies.
import TextField from './TextField';
import {
  TEXTFIELD_TEST_ID,
  TEXTFIELD_STARTACCESSORY_TEST_ID,
  TEXTFIELD_ENDACCESSORY_TEST_ID,
} from './TextField.constants';

describe('TextField', () => {
  it('renders default settings correctly', () => {
    const { toJSON } = render(<TextField />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders TextField component', () => {
    render(<TextField />);

    expect(screen.getByTestId(TEXTFIELD_TEST_ID)).toBeDefined();
  });

  it('renders startAccessory when provided', () => {
    render(<TextField startAccessory={<View />} />);

    expect(screen.getByTestId(TEXTFIELD_STARTACCESSORY_TEST_ID)).toBeDefined();
  });

  it('renders endAccessory when provided', () => {
    render(<TextField endAccessory={<View />} />);

    expect(screen.getByTestId(TEXTFIELD_ENDACCESSORY_TEST_ID)).toBeDefined();
  });

  it('renders as single line by default', () => {
    const { toJSON } = render(<TextField />);

    // Verify single line rendering via snapshot
    expect(toJSON()).toMatchSnapshot();
  });
});
