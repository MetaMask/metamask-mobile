import {
  trackActionButtonClick,
  ActionButtonType,
  ActionLocation,
  ActionPosition,
  ActionButtonProperties,
} from './actionButtonTracking';
import { MetaMetricsEvents } from '../../core/Analytics';
import { MetricsEventBuilder } from '../../core/Analytics/MetricsEventBuilder';
import { ITrackingEvent } from '../../core/Analytics/MetaMetrics.types';

// Mock dependencies
jest.mock('../../core/Analytics');
jest.mock('../../core/Analytics/MetricsEventBuilder');

const mockedMetricsEventBuilder = MetricsEventBuilder as jest.Mocked<
  typeof MetricsEventBuilder
>;

describe('actionButtonTracking', () => {
  // Mock functions
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuild = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup MetricsEventBuilder mock
    mockedMetricsEventBuilder.createEventBuilder.mockReturnValue(
      mockCreateEventBuilder as unknown as ReturnType<
        typeof MetricsEventBuilder.createEventBuilder
      >,
    );
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    mockAddProperties.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    mockBuild.mockReturnValue({
      name: 'test',
      properties: {},
      sensitiveProperties: {},
      saveDataRecording: false,
      isOptIn: false,
      isEnabled: true,
      isAnonymous: false,
      hasProperties: true,
    } as ITrackingEvent);
  });

  describe('ActionButtonType enum', () => {
    it('has correct string values', () => {
      // Given/When/Then: enum values should match expected strings
      expect(ActionButtonType.BUY).toBe('buy');
      expect(ActionButtonType.SWAP).toBe('swap');
      expect(ActionButtonType.SEND).toBe('send');
      expect(ActionButtonType.RECEIVE).toBe('receive');
    });

    it('covers all action button types', () => {
      // Given: all expected action types
      const expectedTypes = ['buy', 'swap', 'send', 'receive'];

      // When: checking enum values
      const actualTypes = Object.values(ActionButtonType);

      // Then: should match expected types
      expect(actualTypes).toEqual(expect.arrayContaining(expectedTypes));
      expect(actualTypes).toHaveLength(4);
    });
  });

  describe('ActionLocation enum', () => {
    it('has correct string values', () => {
      // Given/When/Then: enum values should match expected strings
      expect(ActionLocation.HOME).toBe('home');
      expect(ActionLocation.ASSET_DETAILS).toBe('asset details');
      expect(ActionLocation.NAVBAR).toBe('navbar');
    });

    it('covers all location types', () => {
      // Given: all expected location types
      const expectedLocations = ['home', 'asset details', 'navbar'];

      // When: checking enum values
      const actualLocations = Object.values(ActionLocation);

      // Then: should match expected locations
      expect(actualLocations).toEqual(
        expect.arrayContaining(expectedLocations),
      );
      expect(actualLocations).toHaveLength(3);
    });
  });

  describe('ActionPosition enum', () => {
    it('has correct numeric values', () => {
      // Given/When/Then: enum values should match expected numbers
      expect(ActionPosition.FIRST_POSITION).toBe(0);
      expect(ActionPosition.SECOND_POSITION).toBe(1);
      expect(ActionPosition.THIRD_POSITION).toBe(2);
      expect(ActionPosition.FOURTH_POSITION).toBe(3);
    });

    it('has corresponding ActionButtonType values', () => {
      // Given/When/Then: position values should correspond to button type values
      expect(ActionPosition.FIRST_POSITION).toBe(0);
      expect(ActionPosition.SECOND_POSITION).toBe(1);
      expect(ActionPosition.THIRD_POSITION).toBe(2);
      expect(ActionPosition.FOURTH_POSITION).toBe(3);
      // Verify ActionButtonType has corresponding string values
      expect(ActionButtonType.BUY).toBe('buy');
      expect(ActionButtonType.SWAP).toBe('swap');
      expect(ActionButtonType.SEND).toBe('send');
      expect(ActionButtonType.RECEIVE).toBe('receive');
    });
  });

  describe('trackActionButtonClick', () => {
    const mockProperties: ActionButtonProperties = {
      action_name: ActionButtonType.BUY,
      action_position: ActionPosition.FIRST_POSITION,
      button_label: 'Buy',
      location: ActionLocation.HOME,
    };

    it('tracks action button click with correct event', () => {
      // Given: valid tracking parameters
      const properties = mockProperties;

      // When: tracking action button click
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should create event builder with correct event
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ACTION_BUTTON_CLICKED,
      );
    });

    it('adds properties to event builder', () => {
      // Given: valid tracking parameters
      const properties = mockProperties;

      // When: tracking action button click
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should add properties to event builder
      expect(mockAddProperties).toHaveBeenCalledWith(properties);
    });

    it('builds and tracks the event', () => {
      // Given: valid tracking parameters
      const properties = mockProperties;

      // When: tracking action button click
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should build and track the event
      expect(mockBuild).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith({
        name: 'test',
        properties: {},
        sensitiveProperties: {},
        saveDataRecording: false,
        isOptIn: false,
        isEnabled: true,
        isAnonymous: false,
        hasProperties: true,
      });
    });

    it('tracks buy button click from home', () => {
      // Given: buy button properties
      const properties: ActionButtonProperties = {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: 'Buy',
        location: ActionLocation.HOME,
      };

      // When: tracking buy button click
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should track with correct properties
      expect(mockAddProperties).toHaveBeenCalledWith({
        action_name: 'buy',
        action_position: 0,
        button_label: 'Buy',
        location: 'home',
      });
    });

    it('tracks swap button click from asset details', () => {
      // Given: swap button properties
      const properties: ActionButtonProperties = {
        action_name: ActionButtonType.SWAP,
        action_position: ActionPosition.SECOND_POSITION,
        button_label: 'Swap',
        location: ActionLocation.ASSET_DETAILS,
      };

      // When: tracking swap button click
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should track with correct properties
      expect(mockAddProperties).toHaveBeenCalledWith({
        action_name: 'swap',
        action_position: 1,
        button_label: 'Swap',
        location: 'asset details',
      });
    });

    it('tracks send button click with i18n label', () => {
      // Given: send button properties with i18n label
      const properties: ActionButtonProperties = {
        action_name: ActionButtonType.SEND,
        action_position: ActionPosition.THIRD_POSITION,
        button_label: 'Send',
        location: ActionLocation.HOME,
      };

      // When: tracking send button click
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should track with correct properties
      expect(mockAddProperties).toHaveBeenCalledWith({
        action_name: 'send',
        action_position: 2,
        button_label: 'Send',
        location: 'home',
      });
    });

    it('tracks receive button click with i18n label', () => {
      // Given: receive button properties with i18n label
      const properties: ActionButtonProperties = {
        action_name: ActionButtonType.RECEIVE,
        action_position: ActionPosition.FOURTH_POSITION,
        button_label: 'Receive',
        location: ActionLocation.HOME,
      };

      // When: tracking receive button click
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should track with correct properties
      expect(mockAddProperties).toHaveBeenCalledWith({
        action_name: 'receive',
        action_position: 3,
        button_label: 'Receive',
        location: 'home',
      });
    });

    it('handles optional action_id property', () => {
      // Given: properties with optional action_id
      const properties: ActionButtonProperties = {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: 'Buy',
        location: ActionLocation.HOME,
        action_id: 'custom-action-123',
      };

      // When: tracking with action_id
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should include action_id in properties
      expect(mockAddProperties).toHaveBeenCalledWith({
        action_name: 'buy',
        action_position: 0,
        button_label: 'Buy',
        location: 'home',
        action_id: 'custom-action-123',
      });
    });

    it('handles all button types with parameterized test', () => {
      // Given: all button types and their expected values
      const buttonTestCases = [
        {
          type: ActionButtonType.BUY,
          position: ActionPosition.FIRST_POSITION,
          label: 'Buy',
          location: ActionLocation.HOME,
        },
        {
          type: ActionButtonType.SWAP,
          position: ActionPosition.SECOND_POSITION,
          label: 'Swap',
          location: ActionLocation.ASSET_DETAILS,
        },
        {
          type: ActionButtonType.SEND,
          position: ActionPosition.THIRD_POSITION,
          label: 'Send',
          location: ActionLocation.HOME,
        },
        {
          type: ActionButtonType.RECEIVE,
          position: ActionPosition.FOURTH_POSITION,
          label: 'Receive',
          location: ActionLocation.HOME,
        },
      ];

      buttonTestCases.forEach((testCase) => {
        // Reset mocks for each test case
        jest.clearAllMocks();
        mockCreateEventBuilder.mockReturnValue({
          addProperties: mockAddProperties,
          build: mockBuild,
        });
        mockAddProperties.mockReturnValue({
          addProperties: mockAddProperties,
          build: mockBuild,
        });

        // Given: properties for this button type
        const properties: ActionButtonProperties = {
          action_name: testCase.type,
          action_position: testCase.position,
          button_label: testCase.label,
          location: testCase.location,
        };

        // When: tracking this button type
        trackActionButtonClick(
          mockTrackEvent,
          mockCreateEventBuilder,
          properties,
        );

        // Then: should track with correct properties
        expect(mockAddProperties).toHaveBeenCalledWith({
          action_name: testCase.type,
          action_position: testCase.position,
          button_label: testCase.label,
          location: testCase.location,
        });
      });
    });

    it('handles all location types with parameterized test', () => {
      // Given: all location types
      const locationTestCases = [
        { location: ActionLocation.HOME, expected: 'home' },
        { location: ActionLocation.ASSET_DETAILS, expected: 'asset details' },
        { location: ActionLocation.NAVBAR, expected: 'navbar' },
      ];

      locationTestCases.forEach((testCase) => {
        // Reset mocks for each test case
        jest.clearAllMocks();
        mockCreateEventBuilder.mockReturnValue({
          addProperties: mockAddProperties,
          build: mockBuild,
        });
        mockAddProperties.mockReturnValue({
          addProperties: mockAddProperties,
          build: mockBuild,
        });

        // Given: properties with this location
        const properties: ActionButtonProperties = {
          action_name: ActionButtonType.BUY,
          action_position: ActionPosition.FIRST_POSITION,
          button_label: 'Buy',
          location: testCase.location,
        };

        // When: tracking with this location
        trackActionButtonClick(
          mockTrackEvent,
          mockCreateEventBuilder,
          properties,
        );

        // Then: should track with correct location
        expect(mockAddProperties).toHaveBeenCalledWith(
          expect.objectContaining({
            location: testCase.expected,
          }),
        );
      });
    });

    it('handles long button labels', () => {
      // Given: properties with long button label
      const longLabel =
        'Very Long Button Label That Might Be Used in Some Languages';
      const properties: ActionButtonProperties = {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: longLabel,
        location: ActionLocation.HOME,
      };

      // When: tracking with long label
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should handle long label correctly
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          button_label: longLabel,
        }),
      );
    });

    it('handles special characters in button labels', () => {
      // Given: properties with special characters in label
      const specialLabel = 'Buy & Sell (Crypto)';
      const properties: ActionButtonProperties = {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: specialLabel,
        location: ActionLocation.HOME,
      };

      // When: tracking with special characters
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should handle special characters correctly
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          button_label: specialLabel,
        }),
      );
    });

    it('handles unicode characters in button labels', () => {
      // Given: properties with unicode characters in label
      const unicodeLabel = 'Buy 🚀 Crypto 💰';
      const properties: ActionButtonProperties = {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: unicodeLabel,
        location: ActionLocation.HOME,
      };

      // When: tracking with unicode characters
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should handle unicode characters correctly
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          button_label: unicodeLabel,
        }),
      );
    });

    it('maintains type safety with ActionButtonProperties interface', () => {
      // Given: properties that should be type-safe
      const properties: ActionButtonProperties = {
        action_name: ActionButtonType.BUY, // Should be type-safe
        action_position: ActionPosition.FIRST_POSITION, // Should be type-safe
        button_label: 'Buy',
        location: ActionLocation.HOME, // Should be type-safe
        action_id: 'test-id', // Optional property
      };

      // When: tracking with type-safe properties
      expect(() => {
        trackActionButtonClick(
          mockTrackEvent,
          mockCreateEventBuilder,
          properties,
        );
      }).not.toThrow();

      // Then: should track successfully
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('extends JsonMap interface correctly', () => {
      // Given: properties with additional JsonMap properties
      const properties: ActionButtonProperties = {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: 'Buy',
        location: ActionLocation.HOME,
        custom_property: 'custom_value',
        numeric_property: 123,
        boolean_property: true,
      };

      // When: tracking with extended properties
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should include all properties
      expect(mockAddProperties).toHaveBeenCalledWith(properties);
    });

    it('tracks swap button from navbar without action_position', () => {
      // Given: navbar swap button properties without action_position
      const properties: ActionButtonProperties = {
        action_name: ActionButtonType.SWAP,
        button_label: 'Swap',
        location: ActionLocation.NAVBAR,
      };

      // When: tracking navbar swap button click
      trackActionButtonClick(
        mockTrackEvent,
        mockCreateEventBuilder,
        properties,
      );

      // Then: should track without action_position
      expect(mockAddProperties).toHaveBeenCalledWith({
        action_name: 'swap',
        button_label: 'Swap',
        location: 'navbar',
      });
      expect(mockBuild).toHaveBeenCalled();
    });
  });

  describe('ActionButtonProperties interface', () => {
    it('requires mandatory properties', () => {
      // Given: properties with all mandatory fields
      const validProperties: ActionButtonProperties = {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: 'Buy',
        location: ActionLocation.HOME,
      };

      // When: creating properties with mandatory fields
      // Then: should be valid
      expect(validProperties.action_name).toBeDefined();
      expect(validProperties.action_position).toBeDefined();
      expect(validProperties.button_label).toBeDefined();
      expect(validProperties.location).toBeDefined();
    });

    it('allows action_position to be optional', () => {
      // Given: properties without action_position (for navbar buttons)
      const propertiesWithoutPosition: ActionButtonProperties = {
        action_name: ActionButtonType.SWAP,
        button_label: 'Swap',
        location: ActionLocation.NAVBAR,
      };

      // When: creating properties without action_position
      // Then: should be valid
      expect(propertiesWithoutPosition.action_name).toBeDefined();
      expect(propertiesWithoutPosition.button_label).toBeDefined();
      expect(propertiesWithoutPosition.location).toBeDefined();
      expect(propertiesWithoutPosition.action_position).toBeUndefined();
    });

    it('allows optional action_id property', () => {
      // Given: properties with optional action_id
      const propertiesWithId: ActionButtonProperties = {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: 'Buy',
        location: ActionLocation.HOME,
        action_id: 'optional-id',
      };

      // When: accessing optional property
      // Then: should be accessible
      expect(propertiesWithId.action_id).toBe('optional-id');
    });

    it('allows additional JsonMap properties', () => {
      // Given: properties with additional fields
      const extendedProperties: ActionButtonProperties = {
        action_name: ActionButtonType.BUY,
        action_position: ActionPosition.FIRST_POSITION,
        button_label: 'Buy',
        location: ActionLocation.HOME,
        custom_field: 'custom_value',
        numeric_field: 42,
        boolean_field: false,
      };

      // When: accessing additional properties
      // Then: should be accessible
      expect(extendedProperties.custom_field).toBe('custom_value');
      expect(extendedProperties.numeric_field).toBe(42);
      expect(extendedProperties.boolean_field).toBe(false);
    });
  });
});
