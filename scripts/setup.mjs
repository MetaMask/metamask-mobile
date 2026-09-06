/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import { $ as runScript } from 'execa';
import { Listr } from 'listr2';
import path from 'path';

const IS_CI = process.env.CI;
const IS_OSX = process.platform === 'darwin';

// iOS builds are enabled by default on macOS only but can be enabled or disabled explicitly
let BUILD_IOS = IS_OSX;
let IS_NODE = false;
let BUILD_ANDROID = true
let INSTALL_PODS;
let VERBOSE = IS_CI;
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
    case '--verbose':
      VERBOSE = true;
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
const $  = runScript(VERBOSE ? {stdio: 'inherit'} : undefined);

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
          await $`gem install bundler -v 2.5.8`;
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
  task: (_, task) => {
    if (IS_NODE) {
      return task.skip('Skipping Foundry installation (node-only mode).');
    }
    return task.newListr(
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
    );
  },
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
      📱 iOS simulator: ${hyperlink('yarn install:ios:dev', 'https://github.com/MetaMask/metamask-mobile/blob/main/README.md#download-and-install-the-development-build')} (requires gh auth login)
      📱 iOS device (.ipa): ${hyperlink('yarn install:ios:dev:device', 'https://github.com/MetaMask/metamask-mobile/blob/main/README.md#download-and-install-the-development-build')} (requires gh auth login + device UDID in provisioning profile)
      🤖 Android (.apk): ${hyperlink('yarn install:android:dev', 'https://github.com/MetaMask/metamask-mobile/blob/main/README.md#download-and-install-the-development-build')} (requires gh auth login)
     Step 2: 👀 yarn watch or yarn watch:clean
     Step 3: 🚀 launch app on emulator or scan QR code in terminal
      `);
  },
};

// Listr trims each captured console.log chunk, so a trailing newline, space or
// tab is removed and the next task's output butts against this one. A zero-width
// space is not in JavaScript's whitespace set, so it survives the trim while
// rendering as nothing — giving one blank line of separation.
const TRAILING_BLANK_LINE = '\u200b';

/**
 * Report which agent skills are installed.
 *
 * Skills are installed by `postinstall`, whose output Yarn swallows into a build
 * log — so without this the base set arrives silently and nobody learns that
 * team skills are opt-in. This only reads what is already on disk; it never runs
 * a sync, so `yarn setup` does not install twice.
 */
const reportAgentSkillsTask = {
  title: 'Report agent skills',
  task: async (_, task) => {
    // Agent skills are developer tooling. `postinstall` already skips installing
    // them in CI, so there would be nothing to report and the output is noise.
    if (IS_CI || IS_NODE) {
      return task.skip('Skipping agent skills report.');
    }

    const skillsDir = path.join(process.cwd(), '.claude', 'skills');

    let installed = [];
    try {
      installed = fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        // Only skills this tooling manages. Personal skills living in the same
        // directory would otherwise inflate the count.
        .filter((name) => name.startsWith('mms-'));
    } catch (error) {
      // ENOENT just means nothing has been installed yet — a fresh clone before
      // postinstall, or SKILLS_AUTO_UPDATE=0. Fall through to the empty-state
      // branch below, which points at `yarn skills`.
      //
      // Anything else (EACCES after a stray `sudo yarn`, ENOTDIR if a file
      // shadows the directory) means the state is unknown rather than empty, and
      // "none installed, run `yarn skills`" would send the reader at a command
      // that fails the same way without naming the cause.
      //
      // Reported, NOT thrown. This list runs with exitOnError, and `tasks.run()`
      // is unguarded, so throwing from a purely informational step would abort
      // Husky, the Expo build links and the whole iOS / Terms-of-Use stage that
      // follow it — over a skill count. That would also break the promise in
      // README: "Skipping `yarn skills` is fine — it only affects agent tooling,
      // not the app build."
      if (error.code !== 'ENOENT') {
        task.title = `Report agent skills — could not read ${skillsDir} (${error.code}); skills may be installed but unreadable.`;
        return undefined;
      }
    }

    if (installed.length === 0) {
      // NOT task.skip(): rendererOptions sets showSkipMessage: false, so a skip
      // message is swallowed and the user sees only "[SKIPPED]". Retitling is the
      // only way this guidance actually reaches them — and on a fresh clone this
      // is the path most likely to be taken.
      task.title =
        'Report agent skills — none installed. Run `yarn skills` to install them.';
      return undefined;
    }

    // Project-scope skills are written to .claude/skills, .cursor/rules and
    // .agents/skills, so Claude Code and Cursor see this set. Codex only ever
    // receives `scope: user` skills, which install to $HOME and are deliberately
    // not counted here.
    console.log(`
     You have ${installed.length} agent skill(s) installed for Claude Code and Cursor.

     The base set installs automatically; yarn skills adds every domain:
      🔎 Pick specific domains:       yarn skills --select
      📖 Inspect one:                 yarn metamask-skills describe <domain>/<skill>
      🔄 Refresh after pulling main:  yarn skills
${TRAILING_BLANK_LINE}`);
    return undefined;
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
        reportAgentSkillsTask,
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
    task.newListr([setupIosTask, generateTermsOfUseTask], {
      concurrent: true,
      exitOnError: true,
      rendererOptions,
    }),
};

const tasks = new Listr([prepareDependenciesTask, concurrentTasks], {
  concurrent: false,
  exitOnError: true,
  renderer: VERBOSE ? 'verbose' : 'default',
  rendererOptions,
});

await tasks.run();
