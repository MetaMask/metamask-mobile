import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { AlertBannerWidget } from './AlertBannerWidget';
import type { UiSlot } from '../../../../core/Engine/controllers/ui-slots-controller/types';

const mockDismissContent = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      UiSlotsController: {
        dismissContent: (...args: unknown[]) => mockDismissContent(...args),
      },
    },
  },
}));

jest.mock('../../../../core/DeeplinkManager/DeeplinkManager', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(),
  },
}));

const slot: UiSlot = {
  slotId: 'predict-home.before-portfolio',
  contentId: 'banner-1',
  revision: 1,
  widget: {
    type: 'alert-banner',
    schemaVersion: 1,
    props: {
      tone: 'warning',
      title: 'Remote warning',
      description: 'Remote description',
    },
  },
  actions: [
    {
      actionId: 'dismiss',
      trigger: 'close',
      params: { scope: 'content' },
    },
  ],
};

describe('AlertBannerWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders remote props and executes the dismiss action', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AlertBannerWidget slot={slot} />,
    );

    expect(getByText('Remote warning')).toBeOnTheScreen();
    expect(getByText('Remote description')).toBeOnTheScreen();

    fireEvent.press(getByTestId('ui-slot-alert-banner-close-banner-1'));

    expect(mockDismissContent).toHaveBeenCalledWith('banner-1');
  });
});
