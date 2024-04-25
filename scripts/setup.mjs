/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import { $ } from 'execa';
import { Listr } from 'listr2';
import path from 'path';

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
        '.android.env',
        '.e2e.env'];
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

const sourceEnvs = {
  title: 'Source env vars',
  task: async (_, task) => {
    const isCI = process.env.CI;
    if (isCI) {
      task.skip('CI detected')
    } else {
      const envFiles = [
        '.js.env',
        '.ios.env',
        '.android.env',
        '.e2e.env'];
      envFiles.forEach((envFileName) => {
        `source ${envFileName}`;
      })
    }
  }
};

const downloadTermsOfUseTask = {
  title: 'Download Terms of Use',
  task: async () => {
    try {
      await $`curl -o ./docs/assets/termsOfUse.html https://legal.consensys.io/plain/terms-of-use/`;
    } catch (error) {
      throw new Error('Failed to download Terms of Use');
    }
  }
};

const generateTermsOfUseContentTask = {
  title: 'Generate Terms of Use Content',
  task: async () => {
    const termsOfUsePath = path.resolve('./docs/assets/termsOfUse.html');
    const outputDir = path.resolve('./app/util/termsOfUse');
    const outputPath = path.join(outputDir, 'termsOfUseContent.js'); 

    let termsOfUse = '';
    try {
      termsOfUse = fs.readFileSync(termsOfUsePath, 'utf8');
    } catch (error) {
      throw new Error('Failed to read Terms of Use file');
    }

    const outputContent = `export default ${JSON.stringify(termsOfUse)};`;

    try {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outputPath, outputContent, 'utf8');
    } catch (error) {
      throw new Error('Failed to write Terms of Use content file');
    }
  }
};

const tasks = new Listr([
  gemInstallTask,
  patchModulesTask,
  mainSetupTask,
  ppomBuildTask,
  sourceEnvs,
  downloadTermsOfUseTask,
  generateTermsOfUseContentTask
],
  {
    exitOnError: true,
    concurrent: false,
  });

await tasks.run();

