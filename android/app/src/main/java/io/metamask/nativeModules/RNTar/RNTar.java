package io.metamask.nativeModules.RNTar;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.util.Map;
import java.util.HashMap;
import android.util.Log;
import com.facebook.react.bridge.Promise;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.zip.GZIPInputStream;
import java.util.zip.TarEntry;
import java.util.zip.TarInputStream;


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


  private String decompressTgzFile(String sourceFilePath, String destinationDirPath) {
  try {
      FileInputStream fis = new FileInputStream(sourceFilePath);
      GZIPInputStream gzis = new GZIPInputStream(fis);
      TarInputStream tis = new TarInputStream(gzis);

      File destinationDir = new File(destinationDirPath);
      if (!destinationDir.exists()) {
          destinationDir.mkdirs();
      }

      TarEntry entry;
      while ((entry = tis.getNextEntry()) != null) {
          String fileName = entry.getName();
          File outputFile = new File(destinationDirPath + File.separator + fileName);

          if (entry.isDirectory()) {
              if (!outputFile.exists()) {
                  outputFile.mkdirs();
              }
          } else {
              byte[] buffer = new byte[1024];
              FileOutputStream fos = new FileOutputStream(outputFile);
              int len;
              while ((len = tis.read(buffer)) > 0) {
                  fos.write(buffer, 0, len);
              }
              fos.close();
          }
      }

      tis.close();
      gzis.close();
      fis.close();

  } catch (IOException e) {
      Log.e("DecompressTgzFile", "Error decompressing tgz file", e);
  }
}
  @ReactMethod
  public void unTar(String pathToRead, String pathToWrite, final Promise promise) {
    Log.d(MODULE_NAME, "Create event called with name: " + pathToRead
      + " and location: " + pathToWrite);
    try {
      promise.resolve("source/code");
    } catch(Exception e) {
      promise.reject("Error uncompressing file:", e);
    }
  }
}
