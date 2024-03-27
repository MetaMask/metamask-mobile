import fs from 'fs';
import { $ } from 'execa';
import { Listr } from 'listr2';

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
      task: async () => {
        await $`brew tap wix/brew`;
        await $`brew install applesimutils`;
      }
    }
  ])
};

/*
 * TODO: parse example env file and add missing variables to existing .js.env
 */
const copyEnvVarsTask = {
  title: 'Copy env vars',
  task: async (_, task) => {
    const isCI = process.env.CI;
    if (isCI) {
      task.skip('CI detected. skipping')
    } else {
      const envFiles = [
        '.js.env',
        '.ios.env',
        '.android.env'];
      envFiles.forEach((envFileName) => {
        if (!fs.existsSync(envFileName)) {
          fs.cp(`${envFileName}.example`, envFileName, (err) => {
            throw new Error(err)
          });
        };
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

const mainSetupTask = {
  title: 'Dependencies setup',
  task: (_, task) => task.newListr([
    {
      title: 'Install iOS Pods',
      task: async () => {
        try {
          await $`pod install --project-directory=ios`;
        } catch (error) {
          throw new Error(error);
        }
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
      rendererOptions: { collapseErrors: false }
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
    {
      title: 'React Native nodeify',
      task: async () => {
        await $`node_modules/.bin/rn-nodeify --install 'crypto,buffer,react-native-randombytes,vm,stream,http,https,os,url,net,fs' --hack`;
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
        await $`echo "" > ios/debug.xcconfig && echo "" > ios/release.xcconfig`;
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
  mainSetupTask,
  ppomBuildTask,
  patchModulesTask
],
  {
    exitOnError: true,
    concurrent: true,
  });

await tasks.run();

