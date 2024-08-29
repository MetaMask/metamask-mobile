/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import { $ } from 'execa';
import { Listr } from 'listr2';
import path from 'path';

const IS_OSX = process.platform === 'darwin';
const input = process.argv.slice(2)?.[0];
// iOS builds are enabled by default on macOS only but can be enabled explicitly
const BUILD_IOS = input === '--build-ios' || IS_OSX;
// const IS_NODE = input === '--node';
// const IS_DIFF = input === '--diff';
const IS_CI = process.env.CI;

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
  task: (_, task) => {
    if (IS_CI) {
      task.skip('CI detected');
    }

    return task.newListr(
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
      },
    );
  },
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
      },
    );
  },
};

const setupIosTask = {
  title: 'Set up iOS',
  task: async (_, task) => {
    if (!BUILD_IOS) {
      return task.skip('Skipping iOS.');
    }

    return task.newListr(
      [
        {
          title: 'Install gems',
          task: async () => {
            await $`cd ios && bundle install`;
          },
        },
        {
          title: 'Install CocoaPods',
          task: async () => {
            await $`cd ios && bundle exec pod install`;
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
    );
  },
};

const buildInpageBridgeTask = {
  title: 'Build inpage bridge',
  task: async (_, task) => {
    if (IS_CI) {
      task.skip('CI detected');
    }

    await $`./scripts/build-inpage-bridge.sh`;
  },
};

const nodeifyTask = {
  // TODO: find a saner alternative to bring node modules into react native bundler. See ReactNativify
  title: 'Nodeify npm packages',
  task: async (_, task) => {
    if (IS_CI) {
      task.skip('CI detected');
    }
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
  task: async (_, task) => {
    if (IS_CI) {
      task.skip('CI detected');
    }
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
      },
    ),
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

// Optimize for CI performance
// const yarnSetupNodeTask = {
//   title: 'Run yarn setup:node',
//   task: async () => {
//     await $`yarn setup:node`;
//   },
// };

/**
 * Tasks that can be run concurrently
 */
let concurrentTasks = [
  prepareDependenciesTask,
  copyAndSourceEnvVarsTask,
  updateGitSubmodulesTask,
  buildPpomTask,
  generateTermsOfUseTask,
  setupIosTask,
];

// Optimized for CI performance
// if (IS_NODE) {
//   taskList = [yarnSetupNodeTask, generateTermsOfUseTask];
// }

// // Optimized for detecting diffs
// if (IS_DIFF) {
//   taskList = [yarnSetupNodeTask, cocoapodsInstallTask, generateTermsOfUseTask];
// }

const tasks = new Listr(concurrentTasks, {
  concurrent: true,
  exitOnError: true,
});

await tasks.run();
