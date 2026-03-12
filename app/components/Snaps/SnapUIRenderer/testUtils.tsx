import { JSXElement } from '@metamask/snaps-sdk/jsx';
import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { RootState } from '../../../reducers';
import { PayloadAction } from '@reduxjs/toolkit';
import { FormState, SnapId } from '@metamask/snaps-sdk';
import { SnapUIRenderer } from './SnapUIRenderer';
import { act } from '@testing-library/react-native';

export const MOCK_SNAP_ID = 'npm:@metamask/test-snap-bip44' as SnapId;
export const MOCK_INTERFACE_ID = 'interfaceId';

interface RenderInterfaceOptions {
  snapId?: SnapId;
  useFooter?: boolean;
  onCancel?: () => void;
  contentBackgroundColor?: string;
  state?: Record<string, unknown>;
  stateSettings?: Record<string, unknown>;
  backgroundState?: Record<string, unknown>;
}

const noOp = () => {
  // no-op
};

/**
 * Renders a Snap UI interface.
 *
 * @param content - The JSXElement to render.
 * @param options - The options for rendering the interface.
 * @param options.snapId - The ID of the Snap.
 * @param options.useFooter - Whether to render the footer.
 * @param options.onCancel - The function to call when the interface is cancelled.
 * @param options.state - The state of the interface.
 * @param options.backgroundState - The initial background state.
 * @param options.stateSettings - The initial state settings.
 * @returns The rendered interface.
 */
export function renderInterface(
  content: JSXElement | null,
  {
    snapId = MOCK_SNAP_ID,
    useFooter = false,
    onCancel = noOp,
    state = {},
    backgroundState = {},
    stateSettings = {},
  }: RenderInterfaceOptions = {},
) {
  const storeState = {
    settings: stateSettings,
    engine: {
      backgroundState: {
        SubjectMetadataController: {
          subjectMetadata: {
            'npm:@metamask/test-snap-bip44': {
              name: '@metamask/test-snap-bip44',
              version: '1.2.3',
              subjectType: 'snap',
            },
          },
        },
        SnapController: {
          snaps: {
            [snapId]: {
              id: snapId,
              origin: 'npm:@metamask/test-snap-bip44',
              version: '5.1.2',
              iconUrl: null,
              initialPermissions: {
                'endowment:ethereum-provider': {},
              },
              manifest: {
                description: 'An example Snap that signs messages using BLS.',
                proposedName: 'BIP-44 Test Snap',
                repository: {
                  type: 'git',
                  url: 'https://github.com/MetaMask/test-snaps.git',
                },
                source: {
                  location: {
                    npm: {
                      filePath: 'dist/bundle.js',
                      packageName: '@metamask/test-snap-bip44',
                      registry: 'https://registry.npmjs.org',
                    },
                  },
                  shasum: 'L1k+dT9Q+y3KfIqzaH09MpDZVPS9ZowEh9w01ZMTWMU=',
                },
                version: '5.1.2',
              },
              versionHistory: [
                {
                  date: 1680686075921,
                  origin: 'https://metamask.github.io',
                  version: '5.1.2',
                },
              ],
            },
          },
        },
        SnapInterfaceController: {
          interfaces: {
            [MOCK_INTERFACE_ID]: {
              snapId,
              content,
              state,
              context: null,
              contentType: null,
            },
          },
        },
        KeyringController: {
          keyrings: [],
        },
        AccountsController: {
          internalAccounts: {
            accounts: {
              foo: {
                address: '0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcdb',
                metadata: {
                  name: 'My Account',
                },
              },
            },
          },
        },
        AddressBookController: {
          addressBook: {
            '0x1': {
              '0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcda': {
                address: '0xab16a96D359eC26a11e2C2b3d8f8B8942d5Bfcda',
                name: 'Test Contact',
              },
            },
          },
        },
        ...backgroundState,
      },
    },
  };

  const result = renderWithProvider(
    <SnapUIRenderer
      snapId={snapId}
      interfaceId={MOCK_INTERFACE_ID}
      useFooter={useFooter}
      onCancel={onCancel}
      PERF_DEBUG
    />,
    { state: storeState as unknown as RootState },
  );

  const reducer = (
    reducerState: RootState | undefined,
    action: PayloadAction<{ content: JSXElement; state: FormState }>,
  ): RootState => {
    // Handle initial state
    const currentState = reducerState || result.store.getState();

    if (action.type === 'updateInterface') {
      return {
        ...currentState,
        engine: {
          ...currentState.engine,
          backgroundState: {
            ...currentState.engine.backgroundState,
            SnapInterfaceController: {
              interfaces: {
                [MOCK_INTERFACE_ID]: {
                  snapId: snapId as SnapId,
                  content: action.payload.content,
                  state: action.payload.state ?? state,
                  context: null,
                  contentType: null,
                },
              },
            },
          },
        },
      };
    }
    return currentState;
  };

  const { store } = result;

  store.replaceReducer(reducer);

  const updateInterface = (
    newContent: JSXElement,
    newState: FormState | null = null,
  ) => {
    act(() => {
      store.dispatch({
        type: 'updateInterface',
        payload: {
          content: newContent,
          state: newState,
        },
      });
    });
  };

  const getRenderCount = () =>
    parseInt(result.getByTestId('performance').props['data-renders'], 10);

  return { ...result, updateInterface, getRenderCount };
}
