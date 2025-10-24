package io.metamask;

import com.wix.detox.Detox;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.rule.ActivityTestRule;

import com.wix.detox.config.DetoxConfig;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class DetoxTest {

    @Rule
    public ActivityTestRule<MainActivity> mActivityRule = new ActivityTestRule<>(MainActivity.class, false, false);

    @Test
    public void runDetoxTests() {
        DetoxConfig detoxConfig = new DetoxConfig();

        // Check if running in CI environment
        boolean isCI = System.getenv("CI") != null || System.getenv("GITHUB_ACTIONS") != null;

        if (isCI) {
            // Significantly increased timeouts for CI to handle async measure operations
            // from RN 0.76.9 patch which keeps mMountItemDispatcher busy
            detoxConfig.idlePolicyConfig.masterTimeoutSec = 180; // 3 minutes for CI
            detoxConfig.idlePolicyConfig.idleResourceTimeoutSec = 120; // 2 minutes for CI
            detoxConfig.rnContextLoadTimeoutSec = (BuildConfig.DEBUG ? 300 : 120); // 2-5 minutes for CI
        } else {
            // Standard timeouts for local development
            detoxConfig.idlePolicyConfig.masterTimeoutSec = 90;
            detoxConfig.idlePolicyConfig.idleResourceTimeoutSec = 60;
            detoxConfig.rnContextLoadTimeoutSec = (BuildConfig.DEBUG ? 180 : 60);
        }

        Detox.runTests(mActivityRule, detoxConfig);
    }
}
