import { UserInputEventType } from '@metamask/snaps-sdk';
import Engine from '../../../../../core/Engine/Engine';
import { handleSnapRequest } from '../../../../../core/Snaps/utils';
import { mergeValue } from '../utils';
import { HandlerType } from '@metamask/snaps-utils';

jest.mock('../../../../../core/Engine/Engine', () => ({
  controllerMessenger: {},
  context: {
    SnapInterfaceController: {
      updateInterfaceState: jest.fn(),
    },
  },
}));
jest.mock('../../../../../core/Snaps/utils');
jest.mock('../utils');

describe('Snap Interface Functions', () => {
  const mockInitialState = {
    testInput: 'initial value',
    testForm: {
      formField: 'form value',
    },
  };

  const mockContext = {};
  const mockInterfaceId = 'test-interface';
  const mockSnapId = 'test-snap';

  beforeEach(() => {
    jest.clearAllMocks();
    (mergeValue as jest.Mock).mockImplementation((state, name, value) => ({
      ...state,
      [name]: value,
    }));
  });

  describe('handleInputChange', () => {
    it('updates state and triggers snap request', () => {
      const name = 'testInput';
      const newValue = 'new value';

      const state = mergeValue(mockInitialState, name, newValue);
      Engine.context.SnapInterfaceController.updateInterfaceState(
        mockInterfaceId,
        state,
      );
      handleSnapRequest(Engine.controllerMessenger, {
        snapId: mockSnapId,
        handler: HandlerType.OnUserInput,
        request: {
          jsonrpc: '2.0',
          method: ' ',
          params: {
            event: {
              type: UserInputEventType.InputChangeEvent,
              name,
              value: newValue,
            },
            id: mockInterfaceId,
            context: mockContext,
          },
        },
      });

      expect(
        Engine.context.SnapInterfaceController.updateInterfaceState,
      ).toHaveBeenCalledWith(
        mockInterfaceId,
        expect.objectContaining({
          [name]: newValue,
        }),
      );

      expect(handleSnapRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          snapId: mockSnapId,
          handler: HandlerType.OnUserInput,
        }),
      );
    });
  });

  describe('handleFileChange', () => {
    it('handles null file correctly', () => {
      const name = 'testFile';

      const state = mergeValue(mockInitialState, name, null);
      Engine.context.SnapInterfaceController.updateInterfaceState(
        mockInterfaceId,
        state,
      );
      handleSnapRequest(Engine.controllerMessenger, {
        snapId: mockSnapId,
        handler: HandlerType.OnUserInput,
        request: {
          jsonrpc: '2.0',
          method: ' ',
          params: {
            event: {
              type: UserInputEventType.FileUploadEvent,
              name,
              value: null,
            },
            id: mockInterfaceId,
            context: mockContext,
          },
        },
      });

      expect(
        Engine.context.SnapInterfaceController.updateInterfaceState,
      ).toHaveBeenCalled();
      expect(handleSnapRequest).toHaveBeenCalled();
    });
  });

  describe('getValue', () => {
    it('retrieves values correctly', () => {
      expect(mockInitialState.testInput).toBe('initial value');

      expect(mockInitialState.testForm.formField).toBe('form value');

      expect(mockInitialState['nonexistent']).toBeUndefined();
    });
  });
});
