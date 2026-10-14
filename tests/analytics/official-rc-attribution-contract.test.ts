/* eslint-disable import-x/no-nodejs-modules */
import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../..');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github/workflows');

const OFFICIAL_ATTRIBUTION_ALLOWLIST = [
  'build-rc-auto.yml',
  'runway-rc-builds.yml',
  'runway-ota-rc.yml',
] as const;

// OTA publishes do not create a new build, so they must not post the RC build Slack notification.
const OTA_ATTRIBUTION_WORKFLOWS: readonly string[] = ['runway-ota-rc.yml'];

const OFFICIAL_ATTRIBUTION_LITERAL = 'build_attribution: official';
const SLACK_RC_NOTIFICATION = 'slack-rc-notification.yml';

const readWorkflow = (fileName: string): string =>
  fs.readFileSync(path.join(WORKFLOWS_DIR, fileName), 'utf8');

const listWorkflowFiles = (): string[] =>
  fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'));

describe('official RC analytics attribution contract', () => {
  it('allowlists only release-channel workflows to set official attribution', () => {
    const filesWithOfficialLiteral = listWorkflowFiles().filter((fileName) =>
      readWorkflow(fileName).includes(OFFICIAL_ATTRIBUTION_LITERAL),
    );

    expect(filesWithOfficialLiteral.sort()).toEqual(
      [...OFFICIAL_ATTRIBUTION_ALLOWLIST].sort(),
    );
  });

  it('requires each official build workflow to post to the release Slack channel', () => {
    const buildWorkflows = OFFICIAL_ATTRIBUTION_ALLOWLIST.filter(
      (fileName) => !OTA_ATTRIBUTION_WORKFLOWS.includes(fileName),
    );

    for (const fileName of buildWorkflows) {
      const contents = readWorkflow(fileName);

      expect(contents).toContain(OFFICIAL_ATTRIBUTION_LITERAL);
      expect(contents).toContain(SLACK_RC_NOTIFICATION);
    }
  });

  it('does not post the RC build Slack notification from official OTA workflows', () => {
    for (const fileName of OTA_ATTRIBUTION_WORKFLOWS) {
      const contents = readWorkflow(fileName);

      expect(contents).toContain(OFFICIAL_ATTRIBUTION_LITERAL);
      expect(contents).not.toContain(SLACK_RC_NOTIFICATION);
    }
  });

  it('forwards attribution through the native Auto RC build path', () => {
    const contents = readWorkflow('auto-rc-ota-build-core.yml');

    expect(contents).toContain('build_attribution:');
    expect(contents).toContain('uses: ./.github/workflows/build.yml');
    expect(contents).toContain(
      'build_attribution: ${{ inputs.build_attribution }}',
    );
  });

  it('inlines attribution into the Auto RC repack JS bundle', () => {
    const contents = readWorkflow('build-rc-repack.yml');

    expect(contents).toContain('build_attribution:');
    expect(contents).toContain(
      'METAMASK_BUILD_ATTRIBUTION: ${{ inputs.build_attribution }}',
    );
  });

  it('forwards attribution through the OTA RC publish path', () => {
    const pushEasUpdate = readWorkflow('push-eas-update.yml');
    const easUpdatePlatform = readWorkflow('eas-update-platform.yml');
    const buildYml = readWorkflow('build.yml');

    expect(pushEasUpdate).toContain(
      'build_attribution: ${{ inputs.build_attribution }}',
    );
    expect(easUpdatePlatform).toContain(
      'METAMASK_BUILD_ATTRIBUTION: ${{ inputs.build_attribution }}',
    );
    expect(buildYml).toContain(
      'METAMASK_BUILD_ATTRIBUTION: ${{ inputs.build_attribution }}',
    );
  });

  it('omits official from manual workflow_dispatch attribution choices', () => {
    const dispatchWorkflows = [
      'build.yml',
      'push-eas-update.yml',
      'build-and-upload-to-testflight.yml',
    ];

    for (const fileName of dispatchWorkflows) {
      const contents = readWorkflow(fileName);
      const dispatchBlock = contents.split('workflow_dispatch:')[1] ?? '';
      const attributionOptions = dispatchBlock.match(
        /build_attribution:[\s\S]*?options:\n((?:\s+-\s+\S+\n)+)/,
      )?.[1];

      expect(attributionOptions).toBeDefined();
      expect(attributionOptions).toContain('- unofficial');
      expect(attributionOptions).toContain('- nightly');
      expect(attributionOptions).not.toMatch(/^\s*-\s+official\s*$/m);
    }
  });
});
