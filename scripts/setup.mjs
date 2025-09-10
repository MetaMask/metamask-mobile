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
// GitHub CI pipeline flag - defaults to false
let GITHUB_CI = false;
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
    case '--build-on-github-ci':
      GITHUB_CI = true;
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
    const $ppom = $({ cwd: 'ppom' });

    return task.newListr(
      [
        {
          title: 'Clean',
          task: async (_, task) => {
            if (GITHUB_CI) {
              return task.skip('Skipping clean in GitHub CI.');
            }
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
        task: async (_, task) => {
          if (GITHUB_CI) {
            // In GitHub CI, we still need bundler for self-hosted runners
            try {
              await $`gem install bundler -v 2.5.8`;
            } catch (error) {
              // If bundler is already installed, continue
              if (!error.stderr?.includes('already installed')) {
                throw error;
              }
            }
          } else {
            await $`gem install bundler -v 2.5.8`;
          }
        },
      },
      {
        title: 'Install gems',
        task: async (_, task) => {
          if (GITHUB_CI) {
            // In GitHub CI, install gems for self-hosted runners
            await $`yarn gem:bundle:install`;
          } else {
            await $`yarn gem:bundle:install`;
          }
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
    // Ensure the build type is passed to the script
    const buildType = process.env.METAMASK_BUILD_TYPE || '';
    await $({ env: { METAMASK_BUILD_TYPE: buildType } })`./scripts/build-inpage-bridge.sh`;
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

const installFoundryTask = {
  title: 'Install Foundry',
  task: (_, task) =>
    task.newListr(
      [
        {
          title: 'Install Foundry binary',
          task: async () => {
            await $`yarn install:foundryup`;
          },
        },
        {
          title: 'Verify installation',
          task: async () => {
            const anvilPath = 'node_modules/.bin/anvil';
            if (!fs.existsSync(anvilPath)) {
              await $`rm -rf .metamask/cache`;
              await $`yarn install:foundryup`;
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

const expoBuildLinks = {
  title: 'Try EXPO!',
  task: async () => {
    function hyperlink(label, url) {
      return `\x1b]8;;${url}\x1b\\${label}\x1b]8;;\x1b\\`;
    }

    console.log(`
     Setup complete! Consider getting started with EXPO on MetaMask. Here are the 3 easy steps to get up and running.

     Step 1: Install EXPO Executable
      📱 ${hyperlink('iOS .ipa (physical devices) Note: it requires Apple Registration with MetaMask', 'https://app.runway.team/bucket/MV2BJmn6D5_O7nqGw8jHpATpEA4jkPrBB4EcWXC6wV7z8jgwIbAsDhE5Ncl7KwF32qRQQD9YrahAIaxdFVvLT4v3UvBcViMtT3zJdMMfkXDPjSdqVGw=')}
      🤖 ${hyperlink('iOS .app (iOS simulator unzip the file and drag in simulator)', 'https://app.runway.team/bucket/aCddXOkg1p_nDryri-FMyvkC9KRqQeVT_12sf6Nw0u6iGygGo6BlNzjD6bOt-zma260EzAxdpXmlp2GQphp3TN1s6AJE4i6d_9V0Tv5h4pHISU49dFk=')}
      🤖 ${hyperlink('Android .apk (physical devices & emulators)', 'https://app.runway.team/bucket/hykQxdZCEGgoyyZ9sBtkhli8wupv9PiTA6uRJf3Lh65FTECF1oy8vzkeXdmuJKhm7xGLeV35GzIT1Un7J5XkBADm5OhknlBXzA0CzqB767V36gi1F3yg3Uss')}
     Step 2: 👀 yarn watch or yarn watch:clean
     Step 3: 🚀 launch app on emulator or scan QR code in terminal
      `);
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

const installHuskyTask = {
  title: 'Install Husky git hooks',
  task: async () => {
    await $`yarn husky install`;
  },
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
        jetifyTask,
        runLavamoatAllowScriptsTask,
        patchPackageTask,
        installFoundryTask,
        expoBuildLinks,
        installHuskyTask,
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
    task.newListr([setupIosTask, /* buildPpomTask, */ generateTermsOfUseTask], {
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
