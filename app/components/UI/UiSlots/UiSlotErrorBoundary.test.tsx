import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { UiSlotErrorBoundary } from './UiSlotErrorBoundary';

jest.mock('../../../util/Logger');

const FailingWidget = () => {
  throw new Error('Widget failed');
};

describe('UiSlotErrorBoundary', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('recovers before rendering when the reset key changes', () => {
    const firstResetKey = {};
    const secondResetKey = {};
    const { rerender } = render(
      <UiSlotErrorBoundary
        slotId="slot"
        contentId="content-1"
        resetKey={firstResetKey}
        fallback={null}
      >
        <FailingWidget />
      </UiSlotErrorBoundary>,
    );

    rerender(
      <UiSlotErrorBoundary
        slotId="slot"
        contentId="content-2"
        resetKey={secondResetKey}
        fallback={null}
      >
        <Text>Recovered widget</Text>
      </UiSlotErrorBoundary>,
    );

    expect(screen.getByText('Recovered widget')).toBeOnTheScreen();
  });
});
