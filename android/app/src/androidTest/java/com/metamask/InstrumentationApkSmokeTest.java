package io.metamask;

import org.junit.Test;
import org.junit.runner.RunWith;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.SmallTest;

/**
 * Placeholder instrumentation test so {@code assemble*AndroidTest} still emits an
 * APK for E2E CI cache/reuse after Detox removal (MMQA-2230). Appium does not
 * run this suite.
 */
@RunWith(AndroidJUnit4.class)
@SmallTest
public class InstrumentationApkSmokeTest {

	@Test
	public void instrumentationApkLoads() {
		// no-op
	}
}
