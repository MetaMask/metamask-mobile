import React from 'react';
import { render } from '@testing-library/react-native';
import ExtensionHandoffAnimation from './ExtensionHandoffAnimation';

jest.mock('../../../animations/loading_mm_fox.riv', () => 'mock-rive-file');

describe('ExtensionHandoffAnimation', () => {
  it('renders the supplied loading fox animation', () => {
    const { getByTestId } = render(<ExtensionHandoffAnimation />);

    expect(getByTestId('extension-handoff-fox')).toBeOnTheScreen();
  });
});
