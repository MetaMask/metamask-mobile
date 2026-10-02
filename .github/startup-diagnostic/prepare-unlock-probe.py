#!/usr/bin/env python3
"""Generate an external Playwright probe without writing into the checkout."""
from pathlib import Path
import json
import sys

checkout = Path(sys.argv[1]).resolve()
output = Path(sys.argv[2]).resolve()
label = sys.argv[3]
package = Path(__file__).resolve().parent
pin = json.loads((package / 'pins.json').read_text())['heads'][label]
output.mkdir(parents=True, exist_ok=True)
substitutions = {
    "__FIXTURES__": str(checkout / "tests/framework/fixtures/playwright/index.ts"),
    "__FIXTURE_BUILDER__": str(checkout / "tests/framework/fixtures/FixtureBuilder.ts"),
    "__FIXTURE_HELPER__": str(checkout / "tests/framework/fixtures/FixtureHelper.ts"),
    "__WALLET_FLOW__": str(checkout / "tests/flows/wallet.flow.ts"),
    "__SNAPSHOT_PATH__": str(output / "readiness.json"),
    "__HEAD_SHA__": pin['sha'],
    "__INPUT_LABEL__": label,
}
spec = (package / "startup-only.spec.ts.template").read_text()
for token, value in substitutions.items():
    spec = spec.replace(token, json.dumps(value))
(output / "startup-only.spec.ts").write_text(spec)
config_import = json.dumps(str(checkout / "tests/playwright.smoke-appium.config.ts"))
config = f"""import baseConfig from {config_import};
export default {{
  ...baseConfig,
  testDir: {json.dumps(str(output))},
  testMatch: 'startup-only.spec.ts',
  outputDir: {json.dumps(str(output / 'playwright-output'))},
  workers: 1,
  retries: 0,
  reporter: [['list']],
  projects: baseConfig.projects?.filter((project) => project.name === 'android-smoke'),
}};
"""
(output / "playwright.config.ts").write_text(config)
print("Prepared external unlock-only probe and config")
