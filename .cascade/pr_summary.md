# Summary
- Upgrade `@metamask/phishing-controller` dependency to `14.0.0` to align with MetaMask Product Safety requirements from issue #20345.
- Regenerated `yarn.lock` to capture the new controller release delivering bulk token scanning and transaction simulation screening improvements.

# Testing
- `NODE_OPTIONS="--max-old-space-size=4096" yarn test:unit --runTestsByPath app/util/phishingDetection.test.ts --coverage=false`
