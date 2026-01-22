import { type FullConfig } from '@playwright/test';
import { WebDriverConfig } from '../types';
import { createServiceProvider } from '../services';
import { createLogger } from '../logger';

const logger = createLogger({ name: 'GlobalSetup' });

/**
 * Parse project names from command line arguments
 */
function parseProjectNames(): string[] {
  const args = process.argv;
  const projects: string[] = [];

  args.forEach((arg, index) => {
    if (arg === '--project') {
      const projectName = args[index + 1];
      if (projectName) {
        projects.push(projectName);
      } else {
        throw new Error('Project name is required with --project flag');
      }
    }
  });

  return projects;
}

/**
 * Helper to display available projects in a readable format
 */
function displayAvailableProjects(config: FullConfig<WebDriverConfig>): void {
  logger.info('\n📋 Available projects:');
  config.projects.forEach((project) => {
    const provider = project.use?.device?.provider || 'unknown';
    const platform = project.use?.platform || 'unknown';
    const device = project.use?.device?.name || 'unknown';
    logger.info(`  • ${project.name} (${provider}/${platform} - ${device})`);
  });
  logger.info('');
}

/**
 * Validate and display helpful error messages for missing projects
 */
function validateProjects(
  config: FullConfig<WebDriverConfig>,
  requestedProjects: string[],
): void {
  const availableProjectNames = config.projects.map((p) => p.name);
  const missingProjects = requestedProjects.filter(
    (name) => !availableProjectNames.includes(name),
  );

  if (missingProjects.length > 0) {
    logger.error(`\n❌ Project(s) not found: ${missingProjects.join(', ')}\n`);
    displayAvailableProjects(config);
    throw new Error(
      `Invalid project name(s). Use one of the projects listed above.`,
    );
  }
}

/**
 * Global setup hook - runs once before all tests
 * Validates configuration and initializes service providers
 */
async function globalSetup(config: FullConfig<WebDriverConfig>) {
  const requestedProjects = parseProjectNames();

  if (requestedProjects.length === 0) {
    logger.error('\n❌ Error: --project flag is required\n');
    displayAvailableProjects(config);
    throw new Error(
      'Please specify a project name with --project flag. Example: yarn playwright test --project dummy-test-local',
    );
  }

  // Validate requested projects exist
  validateProjects(config, requestedProjects);

  // Filter projects that were requested
  const projectsToSetup = config.projects.filter((project) =>
    requestedProjects.includes(project.name),
  );

  logger.info(`\n🚀 Setting up project(s): ${requestedProjects.join(', ')}\n`);

  // Setup all requested projects in parallel (with proper error handling)
  await Promise.all(
    projectsToSetup.map(async (project) => {
      try {
        const provider = createServiceProvider(project);
        await provider.globalSetup?.();
        logger.info(`✅ Setup complete for: ${project.name}`);
      } catch (error) {
        logger.error(`❌ Setup failed for: ${project.name}`);
        throw new Error(
          `Failed to setup project "${project.name}": ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }),
  );

  logger.info('✨ All projects ready!\n');
}

export default globalSetup;
