package com.metamask.nativeModules.RNTarTest;

import androidx.test.core.app.ApplicationProvider;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.junit.Assert.fail;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.ArgumentMatchers.anyString;
import java.nio.file.StandardCopyOption;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import io.metamask.nativeModules.RNTar.RNTar;

@RunWith(JUnit4.class)
public class RNTarTest {
  private RNTar tar;
  private ReactApplicationContext reactContext;
  private Promise promise;

  @Before
  public void setUp() {
    reactContext = new ReactApplicationContext(ApplicationProvider.getApplicationContext());
    tar = new RNTar(reactContext);
    promise = mock(Promise.class);
  }

  @Test
  public void testUnTar_validTgzFile() throws IOException, InterruptedException {
    // Prepare a sample .tgz file
    InputStream tgzResource = Thread.currentThread().getContextClassLoader().getResourceAsStream("validTgzFile.tgz");
    CountDownLatch latch = new CountDownLatch(1); // Create a CountDownLatch

    try {
      File tgzFile = new File(reactContext.getCacheDir(), "validTgzFile.tgz");
      Files.copy(tgzResource, tgzFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
      String outputPath = reactContext.getCacheDir().getAbsolutePath() + "/output";

      // Set up the promise to count down the latch when resolved
      doAnswer(invocation -> {
        latch.countDown();
        return null;
      }).when(promise).resolve(anyString());

      // Call unTar method
      tar.unTar(tgzFile.getAbsolutePath(), outputPath, promise);

      // Wait for the background operation to complete
      if (!latch.await(5, TimeUnit.SECONDS)) {
        fail("Timed out waiting for unTar operation to complete");
      }

      // Verify the promise was resolved with the expected path
      Path expectedDecompressedPath = Paths.get(outputPath, "package");
      verify(promise).resolve(expectedDecompressedPath.toString());
    } finally {
      tgzResource.close();
    }
  }

}
