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
import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;


public class RNTar extends ReactContextBaseJavaModule {
  private static String MODULE_NAME = "RNTar";

  RNTar(ReactApplicationContext context) {
    super(context);
  }

  @NonNull
  @Override
  public String getName() {
    return MODULE_NAME;
  }

  private String extractTgzFile(String tgzPath, String outputPath) throws IOException {
    try {
      // Check if .tgz file exists
      File tgzFile = new File(tgzPath);
      if (!tgzFile.exists()) {
        throw new IOException("The specified .tgz file does not exist.");
      }

      // Create output directory if it doesn't exist
      File outputDirectory = new File(outputPath);
      if (!outputDirectory.exists()) {
        outputDirectory.mkdirs();
      }

      // Check if the output directory is readable and writable
      if (!outputDirectory.canRead() || !outputDirectory.canWrite()) {
        throw new IOException("The output directory is not readable and/or writable.");
      }

      // Set up the input streams for reading the .tgz file
      FileInputStream fileInputStream = new FileInputStream(tgzFile);
      GZIPInputStream gzipInputStream = new GZIPInputStream(fileInputStream);
      TarArchiveInputStream tarInputStream = new TarArchiveInputStream(new BufferedInputStream(gzipInputStream));

      TarArchiveEntry entry;

      // Loop through the entries in the .tgz file
      while ((entry = (TarArchiveEntry) tarInputStream.getNextEntry()) != null) {
        File outputFile = new File(outputDirectory, entry.getName());
        System.out.println("Snaps/ entry " + entry.getName());

        // If it is a directory, create the output directory
        if (entry.isDirectory()) {
          outputFile.mkdirs();
        } else {
          // Create parent directories if they don't exist
          outputFile.getParentFile().mkdirs();

          // Set up the output streams for writing the file
          FileOutputStream fos = new FileOutputStream(outputFile);
          BufferedWriter dest = new BufferedWriter(new OutputStreamWriter(fos, StandardCharsets.UTF_8));

          // Set up a BufferedReader for reading the file from the .tgz file
          BufferedReader tarReader = new BufferedReader(new InputStreamReader(tarInputStream, StandardCharsets.UTF_8));

          // Read the file line by line and convert line endings to the system default
          String line;
          while ((line = tarReader.readLine()) != null) {
            dest.write(line);
            dest.newLine();
          }

          dest.flush();
          dest.close();
        }
      }
      fileInputStream.close();
      gzipInputStream.close();
      tarInputStream.close();

      // Return the output directory path
      return new File(outputDirectory, "package").getAbsolutePath();
    } catch (IOException e) {
      Log.e("DecompressTgzFile", "Error decompressing tgz file", e);
      throw new IOException("Error decompressing tgz file: " + e.getMessage(), e);
    }
  }

  @ReactMethod
  public void unTar(String pathToRead, String pathToWrite, final Promise promise) {
    Log.d(MODULE_NAME, "Create event called with name: " + pathToRead
      + " and location: " + pathToWrite);
    try {
      String decompressedPath = extractTgzFile(pathToRead, pathToWrite);
      promise.resolve(decompressedPath);
    } catch(Exception e) {
      promise.reject("Error uncompressing file:", e);
    }
  }
}
