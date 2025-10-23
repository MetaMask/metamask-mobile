import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';
import { waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

import { SamplePetNamesForm } from './SamplePetNamesForm';
import Engine from '../../../../../core/Engine';
import useMetrics from '../../../../../components/hooks/useMetrics/useMetrics';
import { SAMPLE_FEATURE_EVENTS } from '../../../analytics/events';
import { MetricsEventBuilder } from '../../../../../core/Analytics/MetricsEventBuilder.ts';

jest.mock('../../../../../core/Engine', () => ({
  context: {
    SamplePetnamesController: {
      assignPetname: jest.fn(),
    },
  },
}));

// Mock the useSamplePetNames hook
jest.mock('../../hooks/useSamplePetNames', () => ({
  useSamplePetNames: jest.fn(),
}));

jest.mock('../../../../../components/hooks/useMetrics/useMetrics');

import { useSamplePetNames } from '../../hooks/useSamplePetNames';

const mockUseSamplePetNames = useSamplePetNames as jest.MockedFunction<
  typeof useSamplePetNames
>;

const mockTrackEvent = jest.fn();

describe('SamplePetNamesForm', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock return value - no existing pet names
    mockUseSamplePetNames.mockReturnValue({ petNames: [] });
    // Create spy on Alert.alert
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    (useMetrics as jest.MockedFn<typeof useMetrics>).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: MetricsEventBuilder.createEventBuilder,
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
      getDeleteRegulationId: jest.fn(),
      isDataRecorded: jest.fn(),
      isEnabled: jest.fn(),
      getMetaMetricsId: jest.fn(),
    });
  });

  afterEach(() => {
    alertSpy?.mockRestore();
  });

  it('renders form fields and submit button', async () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <SamplePetNamesForm
        chainId={'0x1'}
        initialAddress={'0xc6893a7d6a966535F7884A4de710111986ebB132'}
        initialName={'Test Account'}
      />,
      { state: initialRootState },
    );

    // Assert
    await waitFor(() => {
      expect(getByTestId('pet-name-address-input')).toBeTruthy();
      expect(getByTestId('pet-name-name-input')).toBeTruthy();
      expect(getByTestId('add-pet-name-button')).toBeTruthy();
    });
  });

  it('persists pet name using SamplePetnamesController', async () => {
    // Arrange
    const mockAssignPetname = Engine.context.SamplePetnamesController
      .assignPetname as jest.Mock;

    const { getByTestId } = renderWithProvider(
      <SamplePetNamesForm
        chainId={'0x1'}
        initialAddress={'0xc6893a7d6a966535F7884A4de710111986ebB132'}
        initialName={'Test Account'}
      />,
      { state: initialRootState },
    );

    // Act
    const button = getByTestId('add-pet-name-button');
    fireEvent.press(button);

    // Assert
    await waitFor(() => {
      expect(mockAssignPetname).toHaveBeenCalledWith(
        '0x1',
        '0xc6893a7d6a966535F7884A4de710111986ebB132',
        'Test Account',
      );
    });
  });

  it('calls trackEvent when adding new pet name', async () => {
    // Arrange
    const { getByTestId } = renderWithProvider(
      <SamplePetNamesForm
        chainId={'0x1'}
        initialAddress={'0xc6893a7d6a966535F7884A4de710111986ebB132'}
        initialName={'Test Account'}
      />,
      { state: initialRootState },
    );

    // Act
    const button = getByTestId('add-pet-name-button');
    fireEvent.press(button);

    // Assert
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: SAMPLE_FEATURE_EVENTS.PETNAME_ADDED.category,
          properties: {
            totalPetNames: 0,
            chainId: '0x1',
          },
        }),
      );
    });
  });

  it('prevents duplicate addresses from being added without user confirmation', async () => {
    // Arrange
    mockUseSamplePetNames.mockReturnValue({
      petNames: [
        {
          address: '0xc6893a7d6a966535F7884A4de710111986ebB132',
          name: 'Existing Name',
        },
      ],
    });

    const mockAssignPetname = Engine.context.SamplePetnamesController
      .assignPetname as jest.Mock;

    const { getByTestId } = renderWithProvider(
      <SamplePetNamesForm
        chainId={'0x1'}
        initialAddress={'0xDifferentAddress'}
        initialName={'Test Account'}
      />,
      { state: initialRootState },
    );

    // Act - change address to duplicate and press button
    const addressInput = getByTestId('pet-name-address-input');
    fireEvent.changeText(
      addressInput,
      '0xc6893a7d6a966535F7884A4de710111986ebB132',
    );

    const button = getByTestId('add-pet-name-button');
    fireEvent.press(button);

    // Assert
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
      expect(mockAssignPetname).not.toHaveBeenCalled();
    });
  });

  it('allows updating existing pet name when user have pressed existing pet name', async () => {
    // Arrange
    mockUseSamplePetNames.mockReturnValue({
      petNames: [
        {
          address: '0xc6893a7d6a966535F7884A4de710111986ebB132',
          name: 'Existing Name',
        },
      ],
    });

    const mockAssignPetname = Engine.context.SamplePetnamesController
      .assignPetname as jest.Mock;

    const { getByTestId } = renderWithProvider(
      <SamplePetNamesForm
        chainId={'0x1'}
        initialAddress={'0xc6893a7d6a966535F7884A4de710111986ebB132'}
        initialName={'Test Account'}
      />,
      { state: initialRootState },
    );

    // Act
    const button = getByTestId('add-pet-name-button');
    fireEvent.press(button);

    // Assert
    await waitFor(() => {
      expect(alertSpy).not.toHaveBeenCalled();
      expect(mockAssignPetname).toHaveBeenCalledWith(
        '0x1',
        '0xc6893a7d6a966535F7884A4de710111986ebB132',
        'Test Account',
      );
    });
  });

  it('calls trackEvent when updating existing pet name', async () => {
    // Arrange
    mockUseSamplePetNames.mockReturnValue({
      petNames: [
        {
          address: '0xc6893a7d6a966535F7884A4de710111986ebB132',
          name: 'Existing Name',
        },
      ],
    });

    const { getByTestId } = renderWithProvider(
      <SamplePetNamesForm
        chainId={'0x1'}
        initialAddress={'0xc6893a7d6a966535F7884A4de710111986ebB132'}
        initialName={'Test Account'}
      />,
      { state: initialRootState },
    );

    // Act
    const button = getByTestId('add-pet-name-button');
    fireEvent.press(button);

    // Assert
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: SAMPLE_FEATURE_EVENTS.PETNAME_UPDATED.category,
          properties: {
            totalPetNames: 1,
            chainId: '0x1',
          },
        }),
      );
    });
  });
});
