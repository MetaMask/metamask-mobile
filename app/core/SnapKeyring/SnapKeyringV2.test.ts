import {
  Messenger,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { KeyringV1Adapter } from '@metamask/keyring-sdk/v2';
import { KeyringType } from '@metamask/keyring-api/v2';
import { SnapKeyring as SnapKeyringV2 } from '@metamask/eth-snap-keyring/v2';
import {
  snapKeyringV2AdaptedAsV1Builder,
  snapKeyringV2Builder,
  SnapKeyringV2Impl,
} from './SnapKeyringV2';
import type {
  SnapKeyringBuilderAllowActions,
  SnapKeyringBuilderMessenger,
} from './types';

type RootMessenger = Messenger<
  MockAnyNamespace,
  SnapKeyringBuilderAllowActions,
  never
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

const createControllerMessenger = (): SnapKeyringBuilderMessenger => {
  const rootMessenger = getRootMessenger();
  const messenger = new Messenger<
    'SnapKeyring',
    SnapKeyringBuilderAllowActions,
    never,
    typeof rootMessenger
  >({
    namespace: 'SnapKeyring',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: ['KeyringController:getAccounts'],
    events: [],
    messenger,
  });
  return messenger;
};

describe('snapKeyringV2AdaptedAsV1Builder', () => {
  it('returns a function tagged with the Snap keyring type', () => {
    const v1Builder = snapKeyringV2AdaptedAsV1Builder(
      createControllerMessenger(),
    );

    expect(typeof v1Builder).toBe('function');
    expect(v1Builder.type).toBe(KeyringType.Snap);
  });

  it('produces a KeyringV1Adapter wrapping a SnapKeyringV2 instance', () => {
    const v1Builder = snapKeyringV2AdaptedAsV1Builder(
      createControllerMessenger(),
    );

    const keyring = v1Builder();

    expect(keyring).toBeInstanceOf(KeyringV1Adapter);
    expect((keyring as unknown as KeyringV1Adapter).unwrap()).toBeInstanceOf(
      SnapKeyringV2,
    );
  });
});

describe('snapKeyringV2Builder', () => {
  it('returns a function tagged with the Snap keyring type', () => {
    const v2Builder = snapKeyringV2Builder();

    expect(typeof v2Builder).toBe('function');
    expect(v2Builder.type).toBe(KeyringType.Snap);
  });

  it('unwraps the adapter to expose the inner SnapKeyringV2', () => {
    const v1Builder = snapKeyringV2AdaptedAsV1Builder(
      createControllerMessenger(),
    );
    const v2Builder = snapKeyringV2Builder();

    const keyring = v1Builder();
    const v2 = v2Builder(keyring, { id: 'mock-id', name: 'mock-name' });

    expect(v2).toBeInstanceOf(SnapKeyringV2);
    expect(v2).toBe((keyring as unknown as KeyringV1Adapter).unwrap());
  });

  it('throws when the keyring is not a SnapKeyringV1Adapter', () => {
    const v2Builder = snapKeyringV2Builder();

    expect(() =>
      v2Builder({} as never, { id: 'mock-id', name: 'mock-name' }),
    ).toThrow();
  });
});

describe('SnapKeyringV2Impl', () => {
  it('assertAccountCanBeUsed is a no-op', async () => {
    const impl = new SnapKeyringV2Impl(createControllerMessenger());

    await expect(
      impl.assertAccountCanBeUsed({
        id: 'mock-id',
        address: '0x0',
        type: 'eip155:eoa',
        methods: [],
        options: {},
        scopes: [],
      } as never),
    ).resolves.toBeUndefined();
  });
});
