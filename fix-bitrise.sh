#!/bin/bash
# Backup the original file
cp bitrise.yml bitrise.yml.bak

# Remove the envs property from run_regression_e2e_ios_android_stage
sed -i '' '/run_regression_e2e_ios_android_stage:/,/workflows:/ {
    s/  envs://
    s/    - METAMASK_BUILD_TYPE: .*//
}' bitrise.yml

# Add METAMASK_BUILD_TYPE to the app envs section
sed -i '' '/app:/,/envs:/ s/  envs:/  envs:\n    - METAMASK_BUILD_TYPE: "flask"/' bitrise.yml

echo "Fixed bitrise.yml file. Original backed up to bitrise.yml.bak" 