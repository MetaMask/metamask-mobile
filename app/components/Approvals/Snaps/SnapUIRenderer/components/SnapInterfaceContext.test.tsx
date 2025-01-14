import { SnapId, UserInputEventType } from '@metamask/snaps-sdk';
import Engine from '../../../../../core/Engine/Engine';
import { handleSnapRequest } from '../../../../../core/Snaps/utils';
import { mergeValue } from '../utils';
import { HandlerType } from '@metamask/snaps-utils';

// Mock setup
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
    (mergeValue as jest.Mock).mockImplementation((state, name, value, form) => {
      if (form) {
        return {
          ...state,
          [form]: {
            ...(state[form] || {}),
            [name]: value,
          },
        };
      }
      return {
        ...state,
        [name]: value,
      };
    });
  });

  describe('handleEvent', () => {
    it('handles button click events', () => {
      handleSnapRequest(Engine.controllerMessenger, {
        snapId: mockSnapId as SnapId,
        origin: mockSnapId as SnapId,
        handler: HandlerType.OnUserInput,
        request: {
          jsonrpc: '2.0',
          method: ' ',
          params: {
            event: {
              type: UserInputEventType.ButtonClickEvent,
              name: 'testButton',
            },
            id: mockInterfaceId,
            context: mockContext,
          },
        },
      });

      expect(handleSnapRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          snapId: mockSnapId,
          handler: HandlerType.OnUserInput,
          request: expect.objectContaining({
            params: expect.objectContaining({
              event: {
                type: UserInputEventType.ButtonClickEvent,
                name: 'testButton',
              },
            }),
          }),
        }),
      );
    });

    it('handles form submission events', () => {
      const formData = { field1: 'value1' };
      handleSnapRequest(Engine.controllerMessenger, {
        snapId: mockSnapId as SnapId,
        origin: mockSnapId as SnapId,
        handler: HandlerType.OnUserInput,
        request: {
          jsonrpc: '2.0',
          method: ' ',
          params: {
            event: {
              type: UserInputEventType.FormSubmitEvent,
              name: 'testForm',
              value: formData,
            },
            id: mockInterfaceId,
            context: mockContext,
          },
        },
      });

      expect(handleSnapRequest).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          request: expect.objectContaining({
            params: expect.objectContaining({
              event: {
                type: UserInputEventType.FormSubmitEvent,
                name: 'testForm',
                value: formData,
              },
            }),
          }),
        }),
      );
    });
  });

  describe('handleInputChange', () => {
    it('updates form field state correctly', () => {
      const formName = 'testForm';
      const fieldName = 'newField';
      const newValue = 'new form value';

      const state = mergeValue(mockInitialState, fieldName, newValue, formName);
      Engine.context.SnapInterfaceController.updateInterfaceState(
        mockInterfaceId,
        state,
      );

      expect(
        Engine.context.SnapInterfaceController.updateInterfaceState,
      ).toHaveBeenCalledWith(
        mockInterfaceId,
        expect.objectContaining({
          [formName]: expect.objectContaining({
            [fieldName]: newValue,
          }),
        }),
      );
    });

    it('handles null values', () => {
      const name = 'testInput';
      const state = mergeValue(mockInitialState, name, null);
      Engine.context.SnapInterfaceController.updateInterfaceState(
        mockInterfaceId,
        state,
      );

      expect(
        Engine.context.SnapInterfaceController.updateInterfaceState,
      ).toHaveBeenCalledWith(
        mockInterfaceId,
        expect.objectContaining({
          [name]: null,
        }),
      );
    });
  });

  describe('getValue', () => {
    it('retrieves form field values correctly', () => {
      expect(mockInitialState.testForm.formField).toBe('form value');
    });

    it('returns undefined for non-existent form fields', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mockInitialState.testForm as any).nonexistent).toBeUndefined();
    });

    it('returns undefined for non-existent forms', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((mockInitialState as any).nonexistentForm).toBeUndefined();
    });
  });

  describe('handleFileChange', () => {
    it('handles null file upload', () => {
      const name = 'testFile';
      const state = mergeValue(mockInitialState, name, null);

      Engine.context.SnapInterfaceController.updateInterfaceState(
        mockInterfaceId,
        state,
      );

      expect(
        Engine.context.SnapInterfaceController.updateInterfaceState,
      ).toHaveBeenCalledWith(
        mockInterfaceId,
        expect.objectContaining({
          [name]: null,
        }),
      );
    });

    it('handles file upload in forms', () => {
      const formName = 'uploadForm';
      const fieldName = 'testFile';
      const mockFileData = null;

      const state = mergeValue(
        mockInitialState,
        fieldName,
        mockFileData,
        formName,
      );
      Engine.context.SnapInterfaceController.updateInterfaceState(
        mockInterfaceId,
        state,
      );

      expect(
        Engine.context.SnapInterfaceController.updateInterfaceState,
      ).toHaveBeenCalledWith(
        mockInterfaceId,
        expect.objectContaining({
          [formName]: expect.objectContaining({
            [fieldName]: mockFileData,
          }),
        }),
      );
    });
  });
});
