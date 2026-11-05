jest.mock('./emulator', () => ({ EmulatorProvider: jest.fn() }));
jest.mock('./browserstack', () => ({ BrowserStackProvider: jest.fn() }));
jest.mock('./testmu', () => ({ TestMuAIProvider: jest.fn() }));

import { ProviderName } from '../../types.ts';
import type { ProjectConfig } from '../common/types.ts';
import { createServiceProvider } from './factory';
import { EmulatorProvider } from './emulator';
import { BrowserStackProvider } from './browserstack';
import { TestMuAIProvider } from './testmu';

const createProject = (provider?: string): ProjectConfig =>
  ({
    use: { device: provider ? { provider } : undefined },
  }) as unknown as ProjectConfig;

describe('createServiceProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [ProviderName.EMULATOR, EmulatorProvider],
    [ProviderName.SIMULATOR, EmulatorProvider],
    [ProviderName.BROWSERSTACK, BrowserStackProvider],
    [ProviderName.TESTMU, TestMuAIProvider],
  ])('creates the matching provider for %s', (provider, ProviderClass) => {
    const project = createProject(provider);

    const result = createServiceProvider(project);

    expect(result).toBeInstanceOf(ProviderClass);
    expect(ProviderClass).toHaveBeenCalledWith(project);
  });

  it('throws when the project has no device provider', () => {
    const project = createProject();

    const create = () => createServiceProvider(project);

    expect(create).toThrow('Device provider is not specified');
  });

  it('throws for a provider that is not supported', () => {
    const project = createProject('saucelabs');

    const create = () => createServiceProvider(project);

    expect(create).toThrow('Unknown device provider: "saucelabs"');
  });
});
