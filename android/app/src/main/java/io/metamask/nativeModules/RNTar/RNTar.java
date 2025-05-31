package io.metamask.nativeModules.RNTar;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import android.util.Log;
import com.facebook.react.bridge.Promise;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.zip.GZIPInputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.Path;
import android.os.Build;

public class RNTar extends ReactContextBaseJavaModule {
  private static String MODULE_NAME = "RNTar";

  public RNTar(ReactApplicationContext context) {
    super(context);
  }

  @NonNull
  @Override
  public String getName() {
    return MODULE_NAME;
  }

  private void createDirectories(String path) throws IOException {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Files.createDirectories(Paths.get(path));
    } else {
      File dir = new File(path);
      if (!dir.exists()) {
        dir.mkdirs();
      }
    }
  }

  private boolean isReadableWritable(String path) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Path dirPath = Paths.get(path);
      return Files.isReadable(dirPath) && Files.isWritable(dirPath);
    } else {
      File dir = new File(path);
      return dir.canRead() && dir.canWrite();
    }
  }

  private boolean exists(String path) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      return Files.exists(Paths.get(path));
    } else {
      return new File(path).exists();
    }
  }

  private String extractTgzFile(String tgzPath, String outputPath) throws IOException {
    try {
      // Check if .tgz file exists
      if (!exists(tgzPath)) {
        throw new IOException("The specified .tgz file does not exist.");
      }

      // Create output directory if it doesn't exist
      createDirectories(outputPath);

      // Check if the output directory is readable and writable
      if (!isReadableWritable(outputPath)) {
        throw new IOException("The output directory is not readable and/or writable.");
      }

      // Set up the input streams for reading the .tgz file
      try (FileInputStream fileInputStream = new FileInputStream(tgzPath);
           GZIPInputStream gzipInputStream = new GZIPInputStream(fileInputStream);
           TarArchiveInputStream tarInputStream = new TarArchiveInputStream(new BufferedInputStream(gzipInputStream))) {

        TarArchiveEntry entry;

        // Loop through the entries in the .tgz file
        while ((entry = (TarArchiveEntry) tarInputStream.getNextEntry()) != null) {
          File outputFile = new File(outputPath, entry.getName());
          Path outputPathNormalized = Paths.get(outputFile.getCanonicalPath()).normalize();
          Path outputDirNormalized = Paths.get(new File(outputPath).getCanonicalPath()).normalize();

          if (!outputPathNormalized.startsWith(outputDirNormalized)) {
            throw new IOException("Bad tar entry: " + entry.getName());
          }

          // If it is a directory, create the output directory
          if (entry.isDirectory()) {
            createDirectories(outputFile.getAbsolutePath());
          } else {
            // Create parent directories if they don't exist
            createDirectories(outputFile.getParent());

            // Set up the output streams for writing the file
            try (FileOutputStream fos = new FileOutputStream(outputFile);
                 BufferedOutputStream dest = new BufferedOutputStream(fos)) {

              // Read and write the file data as bytes
              byte[] buffer = new byte[4096];
              int length;
              while ((length = tarInputStream.read(buffer)) != -1) {
                dest.write(buffer, 0, length);
              }
            }
          }
        }
      }
      // Return the output directory path
      return new File(outputPath, "package").getAbsolutePath();
    } catch (IOException e) {
      Log.e("DecompressTgzFile", "Error decompressing tgz file", e);
      throw new IOException("Error decompressing tgz file: " + e.getMessage(), e);
    }
  }

  @ReactMethod
  public void unTar(String pathToRead, String pathToWrite, final Promise promise) {
    Log.d(MODULE_NAME, "Create event called with name: " + pathToRead
      + " and location: " + pathToWrite);
    new Thread(() -> {
      try {
        String decompressedPath = extractTgzFile(pathToRead, pathToWrite);
        promise.resolve(decompressedPath);
      } catch(Exception e) {
        promise.reject("Error uncompressing file:", e);
      }
    }).start();
  }
}
