import { type FullConfig } from '@playwright/test';
import { WebDriverConfig } from '../../e2e/framework/types';
import { createDeviceProvider } from '../services';

async function globalSetup(config: FullConfig<WebDriverConfig>) {
  const args = process.argv;
  const projects: string[] = [];
  args.forEach((arg, index) => {
    if (arg === '--project') {
      const project = args[index + 1];
      if (project) {
        projects.push(project);
      } else {
        throw new Error('Project name is required with --project flag');
      }
    }
  });

  if (projects.length === 0) {
    // Capability to run all projects is not supported currently
    // This will be added after support for using same appium server for multiple projects is added
    throw new Error(
      'Capability to run all projects is not supported. Please specify the project name with --project flag.',
    );
  }
  config.projects.forEach(async (project) => {
    if (projects.includes(project.name)) {
      const provider = createDeviceProvider(project);
      await provider.globalSetup?.();
    }
  });
}

export default globalSetup;
