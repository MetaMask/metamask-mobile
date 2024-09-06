/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import { $ } from 'execa';
import { Listr } from 'listr2';
import path from 'path';

const IS_CI = process.env.CI;
const IS_OSX = process.platform === 'darwin';
// iOS builds are enabled by default on macOS only but can be enabled explicitly
let BUILD_IOS = IS_OSX;
let IS_NODE = false;
const args = process.argv.slice(2) || [];
for (const arg of args) {
  switch (arg) {
    case '--build-ios':
      BUILD_IOS = true;
      continue;
    case '--node':
      IS_NODE = true;
      continue;
    default:
      throw new Error(`Unrecognized CLI arg ${arg}`);
  }
}

const rendererOptions = {
  collapseErrors: false,
  showSkipMessage: false,
  suffixSkips: true,
  collapseSubtasks: false,
};

/*
 * TODO: parse example env file and add missing variables to existing .js.env
 */
const copyAndSourceEnvVarsTask = {
  title: 'Copy and source environment variables',
  task: (_, task) =>
    task.newListr(
      [
        {
          title: 'Copy env vars',
          task: async () => {
            const envFiles = [
              '.js.env',
              '.ios.env',
              '.android.env',
              '.e2e.env',
            ];
            envFiles.forEach((envFileName) => {
              try {
                fs.copyFileSync(
                  `${envFileName}.example`,
                  envFileName,
                  fs.constants.COPYFILE_EXCL,
                );
              } catch (err) {
                // Ignore if file already exists
                return;
              }
            });
          },
        },
        {
          title: 'Source env vars',
          task: async () => {
            const envFiles = [
              '.js.env',
              '.ios.env',
              '.android.env',
              '.e2e.env',
            ];
            envFiles.forEach((envFileName) => {
              `source ${envFileName}`;
            });
          },
        },
      ],
      {
        concurrent: false,
        exitOnError: true,
        rendererOptions,
      },
    ),
};

const buildPpomTask = {
  title: 'Build PPOM',
  task: (_, task) => {
    const $ppom = $({ cwd: 'ppom' });

    return task.newListr(
      [
        {
          title: 'Clean',
          task: async () => {
            await $ppom`yarn clean`;
          },
        },
        {
          title: 'Install deps',
          task: async () => {
            await $ppom`yarn`;
          },
        },
        {
          title: 'Lint',
          task: async () => {
            await $ppom`yarn lint`;
          },
        },
        {
          title: 'Build',
          task: async () => {
            await $ppom`yarn build`;
          },
        },
      ],
      {
        concurrent: false,
        exitOnError: true,
        rendererOptions,
      },
    );
  },
};

const setupIosTask = {
  title: 'Set up iOS',
  task: async (_, task) =>
    task.newListr(
      [
        {
          title: 'Install bundler gem',
          task: async () => {
            await $`gem install bundler -v 2.5.8`;
          },
        },
        {
          title: 'Install gems',
          task: async () => {
            await $`yarn gem:bundle:install`;
          },
        },
        {
          title: 'Install CocoaPods',
          task: async () => {
            await $`yarn pod:install`;
          },
        },
        {
          title: 'Create xcconfig files',
          task: async () => {
            fs.writeFileSync('ios/debug.xcconfig', '');
            fs.writeFileSync('ios/release.xcconfig', '');
          },
        },
      ],
      {
        concurrent: false,
        exitOnError: true,
      },
    ),
};

const buildInpageBridgeTask = {
  title: 'Build inpage bridge',
  task: async () => {
    await $`./scripts/build-inpage-bridge.sh`;
  },
};

const nodeifyTask = {
  // TODO: find a saner alternative to bring node modules into react native bundler. See ReactNativify
  title: 'Nodeify npm packages',
  task: async () => {
    await $`node_modules/.bin/rn-nodeify --install crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url,net,fs --hack`;
  },
};

const patchPackageTask = {
  title: 'Patch npm packages',
  task: async () => {
    await $`yarn patch-package`;
  },
};

const updateGitSubmodulesTask = {
  title: 'Init git submodules',
  task: async () => {
    await $`git submodule update --init`;
  },
};

const runLavamoatAllowScriptsTask = {
  title: 'Run lavamoat allow-scripts',
  task: async () => {
    await $`yarn allow-scripts`;
  },
};

const generateTermsOfUseTask = {
  title: 'Generate Terms of Use',
  task: (_, task) =>
    task.newListr(
      [
        {
          title: 'Download Terms of Use',
          task: async () => {
            try {
              await $`curl -o ./docs/assets/termsOfUse.html https://legal.consensys.io/plain/terms-of-use/`;
            } catch (error) {
              throw new Error('Failed to download Terms of Use');
            }
          },
        },
        {
          title: 'Write Terms of Use file',
          task: async () => {
            const termsOfUsePath = path.resolve(
              './docs/assets/termsOfUse.html',
            );
            const outputDir = path.resolve('./app/util/termsOfUse');
            const outputPath = path.join(outputDir, 'termsOfUseContent.ts');

            let termsOfUse = '';
            try {
              termsOfUse = fs.readFileSync(termsOfUsePath, 'utf8');
            } catch (error) {
              throw new Error('Failed to read Terms of Use file');
            }

            const outputContent = `export default ${JSON.stringify(
              termsOfUse,
            )};`;

            try {
              fs.mkdirSync(outputDir, { recursive: true });
              fs.writeFileSync(outputPath, outputContent, 'utf8');
            } catch (error) {
              throw new Error('Failed to write Terms of Use content file');
            }
          },
        },
      ],
      {
        concurrent: false,
        exitOnError: true,
        rendererOptions,
      },
    ),
};

const yarnSetupNodeTask = {
  title: 'Yarn setup node',
  task: (_, task) =>
    task.newListr([runLavamoatAllowScriptsTask, patchPackageTask], {
      concurrent: false,
      exitOnError: true,
      rendererOptions,
    }),
};

/**
 * Tasks that changes node modules and should run asynchronously
 */
const prepareDependenciesTask = {
  title: 'Prepare dependencies',
  task: (_, task) =>
    task.newListr(
      [
        // Inpage bridge must generate before node modules are altered
        buildInpageBridgeTask,
        nodeifyTask,
        runLavamoatAllowScriptsTask,
        patchPackageTask,
      ],
      {
        exitOnError: false,
        concurrent: false,
        rendererOptions,
      },
    ),
};

/**
 * Tasks that are run sequentially
 */
let sequentialTasks = [
  ...(IS_NODE
    ? [yarnSetupNodeTask]
    : [
        prepareDependenciesTask,
        ...(IS_CI ? [] : [copyAndSourceEnvVarsTask]),
        updateGitSubmodulesTask,
      ]),
];

/**
 * Tasks that are run concurrently
 */
const concurrentTasks = [
  ...(BUILD_IOS ? [setupIosTask] : []),
  // Optimized for CI performance
  ...(IS_NODE ? [] : [buildPpomTask]),
  generateTermsOfUseTask,
];

const tasks = new Listr(
  [
    {
      title: 'Sequential tasks',
      task: (_, task) =>
        task.newListr(sequentialTasks, {
          concurrent: false,
          exitOnError: true,
          rendererOptions,
        }),
    },
    {
      title: 'Concurrent tasks',
      task: (_, task) =>
        task.newListr(concurrentTasks, {
          concurrent: true,
          exitOnError: true,
          rendererOptions,
        }),
    },
  ],
  {
    concurrent: false,
    exitOnError: true,
    rendererOptions,
  },
);

await tasks.run();
