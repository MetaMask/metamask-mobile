/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import { $ } from 'execa';
import { Listr } from 'listr2';
import path from 'path';

const IS_CI = process.env.CI;
const IS_OSX = process.platform === 'darwin';
// iOS builds are enabled by default on macOS only but can be enabled or disabled explicitly
let BUILD_IOS = IS_OSX;
let IS_NODE = false;
let BUILD_ANDROID = true
let INSTALL_PODS;
const args = process.argv.slice(2) || [];
for (const arg of args) {
  switch (arg) {
    case '--build-ios':
      BUILD_IOS = true;
      continue;
    case '--no-build-ios':
      BUILD_IOS = false;
      continue;
    case '--install-pods':
      INSTALL_PODS = true;
      continue;
    case '--no-install-pods':
      INSTALL_PODS = false;
      continue;
    case '--node':
      IS_NODE = true;
      continue;
    case '--no-build-android':
      BUILD_ANDROID = false
      continue;
    default:
      throw new Error(`Unrecognized CLI arg ${arg}`);
  }
}
if (INSTALL_PODS === undefined) {
  INSTALL_PODS = BUILD_IOS;
}
if (INSTALL_PODS && !BUILD_IOS) {
  throw new Error('Cannot install pods if iOS setup has been skipped');
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
  task: (_, task) => {
    if (IS_CI) {
      return task.skip('Skipping copying and sourcing environment variables.');
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
        rendererOptions,
      },
    );
  },
};

const buildPpomTask = {
  title: 'Build PPOM',
  task: (_, task) => {
    if (IS_NODE) {
      return task.skip('Skipping building PPOM.');
    }
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
  task: async (_, task) => {
    if (!BUILD_IOS) {
      return task.skip('Skipping iOS set up.');
    }

    const tasks = [
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
        title: 'Create xcconfig files',
        task: async () => {
          fs.writeFileSync('ios/debug.xcconfig', '');
          fs.writeFileSync('ios/release.xcconfig', '');
        },
      },
    ];

    if (INSTALL_PODS) {
      tasks.push({
        title: 'Install CocoaPods',
        task: async () => {
          await $`yarn pod:install`;
        },
      });
    }

    return task.newListr(
      tasks,
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
    if (IS_NODE) {
      return task.skip('Skipping building inpage bridge.');
    }
    await $`./scripts/build-inpage-bridge.sh`;
  },
};

const nodeifyTask = {
  // TODO: find a saner alternative to bring node modules into react native bundler. See ReactNativify
  title: 'Nodeify npm packages',
  task: async (_, task) => {
    if (IS_NODE) {
      return task.skip('Skipping nodeifying npm packages.');
    }
    await $`node_modules/.bin/rn-nodeify --install crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url,net,fs --hack`;
  },
};

const jetifyTask = {
  title: 'Jetify npm packages for Android',
  task: async (_, task) => {
    if (!BUILD_ANDROID) {
      return task.skip('Skipping jetifying npm packages.');
    }
    if (IS_NODE) {
      return task.skip('Skipping jetifying npm packages.');
    }
    await $`yarn jetify`;
  },
};

const patchPackageTask = {
  title: 'Patch npm packages',
  task: async () => {
    await $`yarn patch-package --error-on-fail`;
  },
};

const updateGitSubmodulesTask = {
  title: 'Init git submodules',
  task: async (_, task) => {
    if (IS_NODE) {
      return task.skip('Skipping init git submodules.');
    }
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

/**
 * Tasks that changes node modules and should run sequentially
 */
const prepareDependenciesTask = {
  title: 'Prepare dependencies',
  task: (_, task) =>
    task.newListr(
      [
        copyAndSourceEnvVarsTask,
        updateGitSubmodulesTask,
        // Inpage bridge must generate before node modules are altered
        buildInpageBridgeTask,
        nodeifyTask,
        jetifyTask,
        runLavamoatAllowScriptsTask,
        patchPackageTask,
      ],
      {
        exitOnError: true,
        concurrent: false,
        rendererOptions,
      },
    ),
};

/**
 * Tasks that are run concurrently
 */
const concurrentTasks = {
  title: 'Concurrent tasks',
  task: (_, task) =>
    task.newListr([setupIosTask, buildPpomTask, generateTermsOfUseTask], {
      concurrent: true,
      exitOnError: true,
      rendererOptions,
    }),
};

const tasks = new Listr([prepareDependenciesTask, concurrentTasks], {
  concurrent: false,
  exitOnError: true,
  rendererOptions,
});

await tasks.run();
