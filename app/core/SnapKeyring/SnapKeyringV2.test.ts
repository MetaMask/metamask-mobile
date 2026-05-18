import {
  Messenger,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import { KeyringV1Adapter } from '@metamask/keyring-sdk/v2';
import { KeyringType } from '@metamask/keyring-api/v2';
import { SnapKeyring as SnapKeyringV2 } from '@metamask/eth-snap-keyring/v2';
import {
  snapKeyringBuilderV2,
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

const helpers = {
  persistKeyringHelper: jest.fn().mockResolvedValue(undefined),
  removeAccountHelper: jest.fn().mockResolvedValue(undefined),
};

describe('snapKeyringBuilderV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a builder with the expected shape', () => {
    const builder = snapKeyringBuilderV2(createControllerMessenger(), helpers);

    expect(builder.name).toBe('SnapKeyringBuilderV2');
    expect(builder.state).toBeNull();
    expect(typeof builder.v1Builder).toBe('function');
    expect(typeof builder.v2Builder).toBe('function');
    expect(builder.v1Builder.type).toBe(KeyringType.Snap);
    expect(builder.v2Builder.type).toBe(KeyringType.Snap);
  });

  it('v1Builder produces a KeyringV1Adapter wrapping a SnapKeyringV2 instance', () => {
    const builder = snapKeyringBuilderV2(createControllerMessenger(), helpers);

    const keyring = builder.v1Builder();

    expect(keyring).toBeInstanceOf(KeyringV1Adapter);
    expect((keyring as unknown as KeyringV1Adapter).unwrap()).toBeInstanceOf(
      SnapKeyringV2,
    );
  });

  it('v2Builder unwraps the adapter to expose the inner SnapKeyringV2', () => {
    const builder = snapKeyringBuilderV2(createControllerMessenger(), helpers);

    const keyring = builder.v1Builder();
    const v2 = builder.v2Builder(keyring, {
      id: 'mock-id',
      name: 'mock-name',
    });

    expect(v2).toBeInstanceOf(SnapKeyringV2);
    expect(v2).toBe((keyring as unknown as KeyringV1Adapter).unwrap());
  });

  it('v2Builder throws when the keyring is not a KeyringV1Adapter', () => {
    const builder = snapKeyringBuilderV2(createControllerMessenger(), helpers);

    expect(() =>
      builder.v2Builder({} as never, { id: 'mock-id', name: 'mock-name' }),
    ).toThrow();
  });
});

describe('SnapKeyringV2Impl', () => {
  it('assertAccountCanBeUsed is a no-op', async () => {
    const impl = new SnapKeyringV2Impl(createControllerMessenger(), helpers);

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
