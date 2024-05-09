import fs from 'fs';
import { $ } from 'execa';
import { Listr } from 'listr2';

const IS_OSX = process.platform === 'darwin';
// iOS builds are enabled by default on macOS only but can be enabled explicitly
const BUILD_IOS = process.argv.slice(2)?.[0] === '--build-ios' || IS_OSX;

const rendererOptions = {
  collapseErrors: false,
  showSkipMessage: false,
  suffixSkips: true,
  collapseSubtasks: false
};

/*
 * FIXME: We shouldn't be making system wide installs without user consent.
 * Should make it optional on non-CI environments
*/
const detoxGlobalInstallTask = {
  title: 'Install Detox utils',
  task: (_, task) => task.newListr([
    {
      title: 'Install detox-cli globally',
      task: async () => {
        await $`yarn global add detox-cli`;
      }
    },
    {
      title: 'Install applesimutils globally',
      task: async (_, appSimTask) => {
        if (!IS_OSX) {
          appSimTask.skip('Not macOS.');
        } else {
          await $`brew tap wix/brew`;
          await $`brew install applesimutils`;
        }
      }
    }
  ],
    {
     rendererOptions
    }
  )
};

/*
 * TODO: parse example env file and add missing variables to existing .js.env
 */
const copyEnvVarsTask = {
  title: 'Copy env vars',
  task: async (_, task) => {
    const isCI = process.env.CI;
    if (isCI) {
      task.skip('CI detected')
    } else {
      const envFiles = [
        '.js.env',
        '.ios.env',
        '.android.env'];
      envFiles.forEach((envFileName) => {
        try {
          fs.copyFileSync(`${envFileName}.example`, envFileName, fs.constants.COPYFILE_EXCL);
        } catch (err) {
          // Ignore if file already exists
          return;

        }
      })
    }
  }
};

const ppomBuildTask = {
  title: 'Build PPOM',
  task: (_, task) => {

    const $ppom = $({ cwd: 'ppom' });

    return task.newListr([
      {
        title: 'Clean',
        task: async () => {
          await $ppom`yarn clean`;
        }
      },
      {
        title: 'Install deps',
        task: async () => {
          await $ppom`yarn`;
        }
      },
      {
        title: 'Lint',
        task: async () => {
          await $ppom`yarn lint`;
        }
      },
      {
        title: 'Build',
        task: async () => {
          await $ppom`yarn build`;
        }
      }
    ], {
      concurrent: false,
      exitOnError: true,
    })
  }
}

const gemInstallTask = {
  title: 'Install gems',
  task: (_, task) => task.newListr([
    {
      title: 'Install gems using bundler',
      task: async (_, gemInstallTask) => {
        if (!BUILD_IOS) {
          return gemInstallTask.skip('Skipping iOS.')
        }
        await $`bundle install`;
      },
    },
  ], {
    exitOnError: true,
    concurrent: false,
    rendererOptions
  })
}

const mainSetupTask = {
  title: 'Dependencies setup',
  task: (_, task) => task.newListr([
    {
      title: 'Install CocoaPods',
      task: async (_, podInstallTask) => {
        if (!BUILD_IOS) {
          return podInstallTask.skip('Skipping iOS.')
        }
        await $`bundle exec pod install --project-directory=ios`;
      },
    },
    {
      title: 'Run lavamoat allow-scripts',
      task: async () => {
        await $`yarn allow-scripts`;
      },
    },
    copyEnvVarsTask,
    detoxGlobalInstallTask
  ],
    {
      exitOnError: false,
      concurrent: true,
      rendererOptions
    })
};

const patchModulesTask = {
  title: 'Patch modules',
  task: (_, task) => task.newListr([
    {
      title: 'Build Inpage Bridge',
      task: async () => {
        await $`./scripts/build-inpage-bridge.sh`;
      }
    },
    // TODO: find a saner alternative to bring node modules into react native bundler. See ReactNativify
    {
      title: 'React Native nodeify',
      task: async () => {
        await $`node_modules/.bin/rn-nodeify --install crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url,net,fs --hack`;
      }
    },
    {
      title: 'Jetify',
      task: async () => {
        await $`yarn jetify`;
      }
    },
    {
      title: 'Patch npm packages',
      task: async () => {
        await $`yarn patch-package`;
      }
    },
    {
      title: 'Create xcconfig files',
      task: async () => {
        fs.writeFileSync('ios/debug.xcconfig', '');
        fs.writeFileSync('ios/release.xcconfig', '');
      }
    },
    {
      title: 'Init git submodules',
      task: async () => {
        await $`git submodule update --init`;
      }
    },
  ],
    {
      concurrent: false,
      exitOnError: true,
    })
}
const tasks = new Listr([
  gemInstallTask,
  patchModulesTask,
  mainSetupTask,
  ppomBuildTask,
],
  {
    exitOnError: true,
    concurrent: false,
  });

await tasks.run();

