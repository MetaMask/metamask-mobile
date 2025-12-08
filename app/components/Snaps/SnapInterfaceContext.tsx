import {
  FormState,
  InterfaceState,
  SnapId,
  State,
  UserInputEventType,
} from '@metamask/snaps-sdk';
import React, {
  FunctionComponent,
  createContext,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { mergeValue } from './SnapUIRenderer/utils';
import Engine from '../../core/Engine/Engine';
import { HandlerType } from '@metamask/snaps-utils';
import { handleSnapRequest } from '../../core/Snaps/utils';

export type HandleEvent = <Type extends State>(args: {
  event: UserInputEventType;
  name?: string;
  value?: Type | null;
}) => void;

export type HandleInputChange = <Type extends State>(
  name: string,
  value: Type | null,
  form?: string,
) => void;

export type GetValue = (name: string, form?: string) => State | undefined;

export type SetCurrentInputFocus = (name: string | null) => void;

export interface SnapInterfaceContextType {
  handleEvent: HandleEvent;
  getValue: GetValue;
  handleInputChange: HandleInputChange;
  setCurrentFocusedInput: SetCurrentInputFocus;
  focusedInput: string | null;
  snapId: string;
}

export const SnapInterfaceContext =
  createContext<SnapInterfaceContextType | null>(null);

export interface SnapInterfaceContextProviderProps {
  interfaceId: string;
  snapId: string;
  initialState: InterfaceState;
  children: React.ReactNode;
}
/**
 * The Snap interface context provider that handles all the interface state operations.
 *
 * @param params - The context provider params.
 * @param params.children - The childrens to wrap with the context provider.
 * @param params.interfaceId - The interface ID to use.
 * @param params.snapId - The Snap ID that requested the interface.
 * @param params.initialState - The initial state of the interface.
 * @returns The context provider.
 */
export const SnapInterfaceContextProvider: FunctionComponent<
  SnapInterfaceContextProviderProps
> = ({ children, interfaceId, snapId, initialState }) => {
  // We keep an internal copy of the state to speed up the state update in the
  // UI. It's kept in a ref to avoid useless re-rendering of the entire tree of
  // components.
  const internalState = useRef<InterfaceState>(initialState ?? {});
  const focusedInput = useRef<string | null>(null);

  // Since the internal state is kept in a reference, it won't update when the
  // interface is updated. We have to manually update it.
  useEffect(() => {
    internalState.current = initialState;
  }, [initialState]);

  const controllerMessenger = Engine.controllerMessenger;

  const rawSnapRequestFunction = (
    event: UserInputEventType,
    name?: string,
    value?: unknown,
  ) => {
    handleSnapRequest(controllerMessenger, {
      snapId: snapId as SnapId,
      origin: 'metamask',
      handler: HandlerType.OnUserInput,
      request: {
        jsonrpc: '2.0',
        method: ' ',
        params: {
          event: {
            type: event,
            ...(name === undefined ? {} : { name }),
            ...(value === undefined ? {} : { value }),
          },
          id: interfaceId,
        },
      },
    });
  };

  const updateState = (state: InterfaceState) =>
    Engine.context.SnapInterfaceController.updateInterfaceState(
      interfaceId,
      state,
    );
  /**
   * Handle the submission of an user input event to the Snap.
   *
   * @param options - An options bag.
   * @param options.event - The event type.
   * @param options.name - The name of the component emitting the event.
   * @param options.value - The value of the component emitting the event.
   */
  const handleEvent: HandleEvent = ({
    event,
    name,
    value = name ? internalState.current[name] : undefined,
  }) => rawSnapRequestFunction(event, name, value);

  const submitInputChange = (name: string, value: State | null) =>
    handleEvent({
      event: UserInputEventType.InputChangeEvent,
      name,
      value,
    });

  /**
   * Handle the value change of an input.
   *
   * @param name - The name of the input.
   * @param value - The new value.
   * @param form - The name of the form containing the input.
   * Optional if the input is not contained in a form.
   */
  const handleInputChange: HandleInputChange = (name, value, form) => {
    const state = mergeValue(internalState.current, name, value, form);

    internalState.current = state;
    updateState(state);
    submitInputChange(name, value);
  };

  /**
   * Get the value of an input from the interface state.
   *
   * @param name - The name of the input.
   * @param form - The name of the form containing the input.
   * Optional if the input is not contained in a form.
   * @returns The value of the input or undefined if the input has no value.
   */
  const getValue: GetValue = (name, form) => {
    const value = form
      ? (initialState[form] as FormState)?.[name]
      : (initialState as FormState)?.[name];

    if (value !== undefined && value !== null) {
      return value;
    }

    return undefined;
  };

  const setCurrentFocusedInput: SetCurrentInputFocus = (name) => {
    focusedInput.current = name;
  };

  return (
    <SnapInterfaceContext.Provider
      value={{
        handleEvent,
        getValue,
        handleInputChange,
        setCurrentFocusedInput,
        focusedInput: focusedInput.current,
        snapId,
      }}
    >
      {children}
    </SnapInterfaceContext.Provider>
  );
};

/**
 * The utility hook to consume the Snap inteface context.
 *
 * @returns The snap interface context.
 */
export function useSnapInterfaceContext() {
  return useContext(SnapInterfaceContext) as SnapInterfaceContextType;
}
