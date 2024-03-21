import { $ } from 'execa';
import { Listr } from 'listr2';

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
  title: 'Setup',
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
  ],
    {
      exitOnError: false,
      concurrent: true,
      rendererOptions: { collapseErrors: false }
    })
};

;

const postInstallTask = {
  title: 'Run postinstall',
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
  postInstallTask,
],
  {
    exitOnError: true,
    concurrent: true,
  });

await tasks.run();

