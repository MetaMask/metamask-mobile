import { renderHook, act } from '@testing-library/react-hooks';
import React from 'react';
import { UserInputEventType } from '@metamask/snaps-sdk';
import { HandlerType } from '@metamask/snaps-utils';
import {
  SnapInterfaceContextProvider,
  useSnapInterfaceContext,
} from './SnapInterfaceContext';
import { mergeValue } from '../Snaps/SnapUIRenderer/utils';
import { handleSnapRequest } from '../../core/Snaps/utils';
import Engine from '../../core/Engine/Engine';

// Mock setup
jest.mock('../../core/Engine/Engine', () => ({
  controllerMessenger: {},
  context: {
    SnapInterfaceController: {
      updateInterfaceState: jest.fn(),
    },
  },
}));
jest.mock('../../core/Snaps/utils');
jest.mock('../Snaps/SnapUIRenderer/utils');

describe('SnapInterfaceContext', () => {
  const mockInitialState = {
    testInput: 'initial value',
    testForm: {
      formField: 'form value',
    },
  };

  const mockContext = {};
  const mockInterfaceId = 'test-interface';
  const mockSnapId = 'test-snap';

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SnapInterfaceContextProvider
      interfaceId={mockInterfaceId}
      snapId={mockSnapId}
      initialState={mockInitialState}
    >
      {children}
    </SnapInterfaceContextProvider>
  );

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

  describe('useSnapInterfaceContext', () => {
    it('provides context with all required methods and values', () => {
      const { result } = renderHook(() => useSnapInterfaceContext(), {
        wrapper,
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          handleEvent: expect.any(Function),
          getValue: expect.any(Function),
          handleInputChange: expect.any(Function),
          setCurrentFocusedInput: expect.any(Function),
          focusedInput: null,
          snapId: mockSnapId,
        }),
      );
    });

    it('handles input focus state', () => {
      const { result, rerender } = renderHook(() => useSnapInterfaceContext(), {
        wrapper,
      });

      act(() => {
        result.current.setCurrentFocusedInput('testInput');
      });

      rerender();

      expect(result.current.focusedInput).toBe('testInput');
    });

    it('handles getValue correctly', () => {
      const { result } = renderHook(() => useSnapInterfaceContext(), {
        wrapper,
      });

      expect(result.current.getValue('testInput')).toBe('initial value');
      expect(result.current.getValue('formField', 'testForm')).toBe(
        'form value',
      );
      expect(result.current.getValue('nonexistent')).toBeUndefined();
    });

    describe('handleEvent', () => {
      it('handles button click events', () => {
        const { result } = renderHook(() => useSnapInterfaceContext(), {
          wrapper,
        });

        act(() => {
          result.current.handleEvent({
            event: UserInputEventType.ButtonClickEvent,
            name: 'testButton',
          });
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

      it('handles input change events', () => {
        const { result } = renderHook(() => useSnapInterfaceContext(), {
          wrapper,
        });

        act(() => {
          result.current.handleInputChange('testInput', 'new value');
        });

        expect(
          Engine.context.SnapInterfaceController.updateInterfaceState,
        ).toHaveBeenCalled();
        expect(handleSnapRequest).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            snapId: mockSnapId,
            handler: HandlerType.OnUserInput,
            request: expect.objectContaining({
              params: expect.objectContaining({
                event: {
                  type: UserInputEventType.InputChangeEvent,
                  name: 'testInput',
                  value: 'new value',
                },
              }),
            }),
          }),
        );
      });
    });

    describe('handleInputChange', () => {
      it('updates form field state correctly', () => {
        const { result } = renderHook(() => useSnapInterfaceContext(), {
          wrapper,
        });

        act(() => {
          result.current.handleInputChange('newField', 'new value', 'testForm');
        });

        expect(
          Engine.context.SnapInterfaceController.updateInterfaceState,
        ).toHaveBeenCalledWith(
          mockInterfaceId,
          expect.objectContaining({
            testForm: expect.objectContaining({
              newField: 'new value',
            }),
          }),
        );
      });

      it('handles null values', () => {
        const { result } = renderHook(() => useSnapInterfaceContext(), {
          wrapper,
        });

        act(() => {
          result.current.handleInputChange('testInput', null);
        });

        expect(
          Engine.context.SnapInterfaceController.updateInterfaceState,
        ).toHaveBeenCalledWith(
          mockInterfaceId,
          expect.objectContaining({
            testInput: null,
          }),
        );
      });
    });
  });
});
