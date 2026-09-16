import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const WORKFLOW_PATH = path.join(
  __dirname,
  '../../../workflows/build-android-upload-to-browserstack.yml',
);

type WorkflowStep = {
  id?: string;
  if?: string;
  name?: string;
  uses?: string;
  with?: Record<string, string>;
  run?: string;
};

type Workflow = {
  jobs: Record<string, { steps?: WorkflowStep[] }>;
};

const WITH_SRP = 'main-e2e-bs-with-srp';
const WITHOUT_SRP = 'main-e2e-bs-without-srp';

const loadWorkflow = () =>
  yaml.load(fs.readFileSync(WORKFLOW_PATH, 'utf8')) as Workflow;

/** Substitutes the two build-name outputs with the e2e build names they carry. */
const resolveBuildNames = (value: string) =>
  value
    .replace(
      /\$\{\{ needs\.check-builds-needed\.outputs\.with-srp-build-name \}\}/g,
      WITH_SRP,
    )
    .replace(
      /\$\{\{ needs\.check-builds-needed\.outputs\.without-srp-build-name \}\}/g,
      WITHOUT_SRP,
    );

const stepsOf = (jobId: string) => loadWorkflow().jobs[jobId].steps ?? [];

const stepByName = (jobId: string, name: string) =>
  stepsOf(jobId).find((step) => step.name === name);

const uploadedArtifactNames = (jobId: string) =>
  stepsOf(jobId)
    .filter((step) => step.uses?.startsWith('actions/upload-artifact'))
    .map((step) => resolveBuildNames(step.with?.name ?? ''));

/**
 * Evaluates the lookup step's `artifact-names` expression, which selects one of
 * two `format(...)` lists depending on `main_branch_only`. Donor sourcemaps are
 * only required for as-is reuse, where no new bundle is packed.
 */
const resolveArtifactNames = (step: WorkflowStep, mainBranchOnly: boolean) => {
  const expression = step.with?.['artifact-names'] ?? '';
  const formatStrings = [...expression.matchAll(/'(\[[^']*\])'/g)].map(
    ([, list]) => list,
  );
  const selected = mainBranchOnly ? formatStrings[0] : formatStrings[1];

  // `{0}` and `{1}` are the with-SRP and without-SRP build names the workflow
  // passes to format() in that order.
  return JSON.parse(
    selected.replace(/\{0\}/g, WITH_SRP).replace(/\{1\}/g, WITHOUT_SRP),
  ) as string[];
};

describe('build-android-upload-to-browserstack sourcemap retention', () => {
  describe('as-is APK reuse', () => {
    it('requires both donor sourcemaps before reusing donor APKs', () => {
      const lookups = stepsOf('resolve-fingerprint-reuse').filter((step) =>
        step.name?.startsWith('Find reusable performance APKs'),
      );

      expect(lookups).toHaveLength(3);

      for (const lookup of lookups) {
        const required = resolveArtifactNames(lookup, true);

        expect(required).toStrictEqual([
          `android-apk-${WITH_SRP}`,
          `android-apk-${WITHOUT_SRP}`,
          `android-sourcemaps-${WITH_SRP}`,
          `android-sourcemaps-${WITHOUT_SRP}`,
        ]);
      }
    });

    it('does not require donor sourcemaps when the JS bundle is repacked', () => {
      const lookup = stepByName(
        'resolve-fingerprint-reuse',
        'Find reusable performance APKs on ci.yml',
      ) as WorkflowStep;

      expect(resolveArtifactNames(lookup, false)).toStrictEqual([
        `android-apk-${WITH_SRP}`,
        `android-apk-${WITHOUT_SRP}`,
      ]);
    });

    it('downloads each donor sourcemap variant from the donor run', () => {
      const downloads = [
        stepByName(
          'resolve-fingerprint-reuse',
          'Download candidate with-SRP sourcemaps',
        ),
        stepByName(
          'resolve-fingerprint-reuse',
          'Download candidate without-SRP sourcemaps',
        ),
      ];

      for (const [download, buildName, variantPath] of [
        [downloads[0], WITH_SRP, 'with-srp'],
        [downloads[1], WITHOUT_SRP, 'without-srp'],
      ] as [WorkflowStep, string, string][]) {
        expect(download.if).toBe(
          "steps.candidate.outputs.found == 'true' && inputs.main_branch_only",
        );
        expect(resolveBuildNames(download.with?.name ?? '')).toBe(
          `android-sourcemaps-${buildName}`,
        );
        expect(download.with?.path).toBe(`artifacts/sourcemaps/${variantPath}`);
        // Without the donor run id this would silently read the current run.
        expect(download.with?.['run-id']).toBe(
          '${{ steps.candidate.outputs.run-id }}',
        );
      }
    });

    it('rejects a donor whose sourcemap download produced no map', () => {
      const validation =
        stepByName(
          'resolve-fingerprint-reuse',
          'Validate downloaded candidate APKs',
        )?.run ?? '';

      // Reuse is only valid when both downloads succeeded and both left a
      // real .map behind, so a partial donor falls back to a fresh build.
      expect(validation).toContain(
        '[ "$DOWNLOAD_SOURCEMAPS_WITH_SRP" = "success" ] &&',
      );
      expect(validation).toContain(
        '[ "$DOWNLOAD_SOURCEMAPS_WITHOUT_SRP" = "success" ] &&',
      );
      expect(validation).toContain('[ -n "$with_srp_map" ] &&');
      expect(validation).toContain('[ -n "$without_srp_map" ];');
    });

    it('republishes the donor sourcemaps on the current run', () => {
      for (const [buildName, variantPath] of [
        [WITH_SRP, 'with-srp'],
        [WITHOUT_SRP, 'without-srp'],
      ]) {
        const publish = stepsOf('resolve-fingerprint-reuse').find(
          (step) =>
            step.uses?.startsWith('actions/upload-artifact') &&
            resolveBuildNames(step.with?.name ?? '') ===
              `android-sourcemaps-${buildName}`,
        );

        expect(publish).toMatchObject({
          if: "steps.finalize.outputs.found == 'true' && inputs.main_branch_only",
          with: {
            path: `artifacts/sourcemaps/${variantPath}`,
            'if-no-files-found': 'error',
          },
        });
      }
    });
  });

  describe('repacked APKs', () => {
    it('uploads the sourcemap Metro generated for each variant', () => {
      for (const [buildName, label] of [
        [WITH_SRP, 'with-srp'],
        [WITHOUT_SRP, 'without-srp'],
      ]) {
        const upload = stepsOf('upload-to-browserstack').find(
          (step) =>
            step.uses?.startsWith('actions/upload-artifact') &&
            resolveBuildNames(step.with?.name ?? '') ===
              `android-sourcemaps-${buildName}`,
        );

        expect(upload?.with?.path).toBe(
          `sourcemaps/android/index.android.bundle.${label}.map`,
        );
        expect(upload?.with?.['if-no-files-found']).toBe('error');
        expect(upload?.if).toContain('inputs.main_branch_only != true');
      }
    });

    it('writes each variant sourcemap to the path it uploads', () => {
      const repack =
        stepByName(
          'upload-to-browserstack',
          'Repack reused APKs with current JS (E2E-style)',
        )?.run ?? '';

      expect(repack).toContain(
        'export REPACK_SOURCEMAP_PATH="sourcemaps/android/index.android.bundle.$label.map"',
      );
    });
  });

  it('never publishes a sourcemap artifact without its APK variant', () => {
    const sourcemapArtifacts = [
      ...uploadedArtifactNames('resolve-fingerprint-reuse'),
      ...uploadedArtifactNames('upload-to-browserstack'),
    ].filter((name) => name.startsWith('android-sourcemaps-'));

    // A map that cannot be traced back to one APK variant would let the
    // analyzer pair a profile with the wrong bundle.
    expect(new Set(sourcemapArtifacts)).toStrictEqual(
      new Set([
        `android-sourcemaps-${WITH_SRP}`,
        `android-sourcemaps-${WITHOUT_SRP}`,
      ]),
    );
  });
});
