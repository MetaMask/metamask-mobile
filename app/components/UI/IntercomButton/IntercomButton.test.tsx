import React from 'react';
import { render } from '@testing-library/react-native';
import IntercomButton from './IntercomButton';

jest.mock('../../../util/intercom/IntercomEmailPrompt', () => ({
  useIntercomInitialization: jest.fn(),
  useIntercom: () => ({
    handlePress: jest.fn(),
    handleLongPress: jest.fn(),
    EmailPrompt: () => null,
  }),
}));

jest.mock('../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      intercomButton: {},
    },
  }),
}));

describe('IntercomButton', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<IntercomButton />);
    expect(getByTestId('global-intercom-button')).toBeDefined();
  });
});
