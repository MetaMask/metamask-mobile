#!/bin/bash

# Test script for fingerprint build caching system
set -e

echo "=========================================="
echo "Testing Fingerprint Build Caching System"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Generate fingerprint
echo "Test 1: Fingerprint Generation"
echo "-------------------------------"
echo "Running: yarn fingerprint:generate"
FINGERPRINT=$(yarn -s fingerprint:generate 2>/dev/null || echo "FAILED")

if [ "$FINGERPRINT" = "FAILED" ] || [ -z "$FINGERPRINT" ]; then
    echo -e "${RED}❌ FAILED: Could not generate fingerprint${NC}"
    echo "This might be because @expo/fingerprint is not installed"
    echo "Run: yarn install"
    exit 1
else
    echo -e "${GREEN}✅ SUCCESS: Generated fingerprint: $FINGERPRINT${NC}"
fi

# Check if fingerprint looks valid (should be a hex string)
if [[ $FINGERPRINT =~ ^[a-f0-9]{32,}$ ]]; then
    echo -e "${GREEN}✅ Fingerprint format looks valid (hex string)${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Fingerprint doesn't look like a typical hash: $FINGERPRINT${NC}"
fi

echo ""

# Test 2: Save and compare fingerprints
echo "Test 2: Save and Compare Fingerprints"
echo "--------------------------------------"

# Save the fingerprint
echo "$FINGERPRINT" > .app-native-fingerprint-test
echo "Saved fingerprint to .app-native-fingerprint-test"

# Test the check command
echo "Running: yarn fingerprint:check (should pass with matching fingerprint)"
cp .app-native-fingerprint-test .app-native-fingerprint

if yarn fingerprint:check > /dev/null 2>&1; then
    echo -e "${GREEN}✅ SUCCESS: Fingerprint check passed with matching fingerprint${NC}"
else
    echo -e "${RED}❌ FAILED: Fingerprint check failed even with matching fingerprint${NC}"
fi

echo ""

# Test 3: Test with different fingerprint
echo "Test 3: Test with Different Fingerprint"
echo "----------------------------------------"
echo "fake-different-fingerprint-hash" > .app-native-fingerprint

if yarn fingerprint:check > /dev/null 2>&1; then
    echo -e "${RED}❌ FAILED: Fingerprint check passed with different fingerprint (should have failed)${NC}"
else
    echo -e "${GREEN}✅ SUCCESS: Fingerprint check correctly failed with different fingerprint${NC}"
fi

echo ""

# Test 4: Test silent mode output
echo "Test 4: Test Silent Mode Output"
echo "--------------------------------"
OUTPUT_NORMAL=$(yarn fingerprint:generate 2>&1 | wc -l)
OUTPUT_SILENT=$(yarn -s fingerprint:generate 2>&1 | wc -l)

echo "Normal mode output lines: $OUTPUT_NORMAL"
echo "Silent mode output lines: $OUTPUT_SILENT"

if [ "$OUTPUT_SILENT" -eq 1 ]; then
    echo -e "${GREEN}✅ SUCCESS: Silent mode outputs only the hash (1 line)${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Silent mode output has $OUTPUT_SILENT lines (expected 1)${NC}"
fi

echo ""

# Test 5: Error handling
echo "Test 5: Error Handling"
echo "-----------------------"

# Test with missing fingerprint file
rm -f .app-native-fingerprint
if yarn fingerprint:check > /dev/null 2>&1; then
    echo -e "${RED}❌ FAILED: Check passed without saved fingerprint (should fail)${NC}"
else
    echo -e "${GREEN}✅ SUCCESS: Check correctly failed without saved fingerprint${NC}"
fi

echo ""

# Test 6: GitHub Actions simulation
echo "Test 6: GitHub Actions Simulation"
echo "----------------------------------"
echo "Simulating the save-build-fingerprint action..."

# Simulate the action script
FINGERPRINT=$(yarn -s fingerprint:generate)
if [ -z "$FINGERPRINT" ]; then
    echo -e "${RED}❌ Error: Failed to generate fingerprint${NC}"
else
    echo "$FINGERPRINT" > .app-native-fingerprint
    echo -e "${GREEN}✅ Fingerprint saved: $FINGERPRINT${NC}"

    # Simulate GitHub output
    echo "fingerprint=$FINGERPRINT" >> test-github-output.txt
    echo "GitHub output saved to test-github-output.txt"
fi

echo ""

# Test 7: Unified repacking tool validation
echo "Test 7: Unified Repacking Tool Validation"
echo "------------------------------------------"

# Test Android platform validation (should fail without files)
echo "Testing Android platform validation..."
if yarn repack --platform android --input test.apk --bundle test.js 2>/dev/null; then
    echo -e "${RED}❌ FAILED: Should have failed with missing files${NC}"
else
    echo -e "${GREEN}✅ SUCCESS: Correctly validated missing Android files${NC}"
fi

# Test iOS platform validation (should fail without files)
echo "Testing iOS platform validation..."
if yarn repack --platform ios --input test.app --bundle test.js 2>/dev/null; then
    echo -e "${RED}❌ FAILED: Should have failed with missing files${NC}"
else
    echo -e "${GREEN}✅ SUCCESS: Correctly validated missing iOS files${NC}"
fi

# Test invalid platform (should fail)
echo "Testing invalid platform validation..."
if yarn repack --platform invalid --input test --bundle test.js 2>/dev/null; then
    echo -e "${RED}❌ FAILED: Should have failed with invalid platform${NC}"
else
    echo -e "${GREEN}✅ SUCCESS: Correctly rejected invalid platform${NC}"
fi

echo ""

# Test 8: Help output validation
echo "Test 8: Help Output Validation"
echo "------------------------------"
echo "Testing unified repacking tool help..."
if yarn repack 2>&1 | grep -q "Usage:"; then
    echo -e "${GREEN}✅ SUCCESS: Help output contains usage information${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Help output may not be working correctly${NC}"
fi

echo ""

# Cleanup
echo "Cleanup"
echo "-------"
rm -f .app-native-fingerprint-test
rm -f .app-native-fingerprint
rm -f test-github-output.txt
echo "Cleaned up test files"

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}All local tests completed!${NC}"
echo ""
echo "What was tested:"
echo "✅ Fingerprint generation and validation"
echo "✅ Fingerprint comparison logic"
echo "✅ Silent mode output"
echo "✅ Error handling"
echo "✅ Unified repacking tool validation (Android & iOS)"
echo "✅ Cross-platform CLI interface"
echo ""
echo "What requires CI environment:"
echo "❓ Actual APK/.app repacking (needs real artifacts)"
echo "❓ GitHub Actions cache integration"
echo "❓ Build performance metrics"
echo ""
echo "Next steps:"
echo "1. Ensure @expo/fingerprint is installed: yarn install"
echo "2. Test in CI environment with actual GitHub Actions"
echo "3. Monitor cache hit rates after deployment"
echo ""
echo "Note: Some tests may show warnings if @expo/fingerprint"
echo "is not installed or configured differently in your environment."
