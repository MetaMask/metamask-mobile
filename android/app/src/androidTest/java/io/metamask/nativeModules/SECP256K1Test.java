package io.metamask.nativeModules;

import android.content.BroadcastReceiver;
import android.content.ComponentCallbacks;
import android.content.ComponentName;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.IntentSender;
import android.content.ServiceConnection;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.AssetManager;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.database.DatabaseErrorHandler;
import android.database.sqlite.SQLiteDatabase;
import android.graphics.Bitmap;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.UserHandle;
import android.view.Display;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;

import junit.framework.TestCase;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.Executor;

public class SECP256K1Test extends TestCase {

	public void testGetPoint() {
		SECP256K1 test = new SECP256K1(new mockReactContext(new mockContext()));
		//MM Private Key 0
		WritableArray pointValues = test.getPoint("c2ef448dd6bbb0eb81fb74ce89e218da4acb7f258c1899233c5b2962de0b09ed");
		assertEquals("X Coordinate", "9ee354bf351314f4bf28d2ba5ad99c99f55c3da5d6e84f84cb9a76d2666d5f9b", pointValues.getString(0));
		assertEquals("Y Coordinate", "34b02f368de97272048ffb0dcb53067bdb77bd1cc46cd384dd430d856aaf59a3", pointValues.getString(1));

		pointValues = test.getPoint("c2ef448dd6bbb0eb81fb74ce89e218da4acb7f258c1899233c5b2962de0b09ed".toUpperCase());
		assertEquals("X Coordinate", "9ee354bf351314f4bf28d2ba5ad99c99f55c3da5d6e84f84cb9a76d2666d5f9b", pointValues.getString(0));
		assertEquals("Y Coordinate", "34b02f368de97272048ffb0dcb53067bdb77bd1cc46cd384dd430d856aaf59a3", pointValues.getString(1));


		//MM Private Key 1
		pointValues = test.getPoint("bce8be7587c4773d4dc3e69416d2f065f2f929fe42acfb8d74c59cfbb1c7a165");
		assertEquals("X Coordinate", "882f1fe35041fc769faeacb0731a309a8135c15eb5b37aa81489a467196d463b", pointValues.getString(0));
		assertEquals("Y Coordinate", "214578c4cbe09932a82c92e9e4fd51f84e3bdbb792dd051054b50e9d4cfb9925", pointValues.getString(1));

		pointValues = test.getPoint("bce8be7587c4773d4dc3e69416d2f065f2f929fe42acfb8d74c59cfbb1c7a165".toUpperCase());
		assertEquals("X Coordinate", "882f1fe35041fc769faeacb0731a309a8135c15eb5b37aa81489a467196d463b", pointValues.getString(0));
		assertEquals("Y Coordinate", "214578c4cbe09932a82c92e9e4fd51f84e3bdbb792dd051054b50e9d4cfb9925", pointValues.getString(1));

		//MM Private Key 2
		pointValues = test.getPoint("ad95d9b9e22dc2fed21a921fb24bc3aea3fed718c24377994fe3d8c6ecff7aeb");
		assertEquals("X Coordinate", "48ebe2e313de2b474ae549150f11fc8bed7d64ade4d9d97fe313fbf9be33733f", pointValues.getString(0));
		assertEquals("Y Coordinate", "533609c203d1d4939ce69564d1cba87126ac1fa777ac9ddebfdbfb16b6a75c0b", pointValues.getString(1));

		pointValues = test.getPoint("ad95d9b9e22dc2fed21a921fb24bc3aea3fed718c24377994fe3d8c6ecff7aeb");
		assertEquals("X Coordinate", "48ebe2e313de2b474ae549150f11fc8bed7d64ade4d9d97fe313fbf9be33733f", pointValues.getString(0));
		assertEquals("Y Coordinate", "533609c203d1d4939ce69564d1cba87126ac1fa777ac9ddebfdbfb16b6a75c0b", pointValues.getString(1));

		//Keys don't match
		pointValues = test.getPoint("ad95d9b9e22dc2fed21a921fb24bc3aea3fed718c24377994fe3d8c6ecff7000");
		assertNotSame("X Coordinate", "48ebe2e313de2b474ae549150f11fc8bed7d64ade4d9d97fe313fbf9be33733f", pointValues.getString(0));
		assertNotSame("Y Coordinate", "533609c203d1d4939ce69564d1cba87126ac1fa777ac9ddebfdbfb16b6a75c0b", pointValues.getString(1));

		//Keys don't match
		pointValues = test.getPoint("ad95d9b9e22dc2fed21a921fb2");


//		WritableArray pointValues = test.getPoint("c2ef448dd6bbb0eb81fb74ce89e218da4acb7f258c1899233c5b2962de0b09ed");
//		assertNotNull(pointValues);
//
//		WritableArray pointValues = test.getPoint("c2ef448dd6bbb0eb81fb74ce89e218da4acb7f258c1899233c5b2962de0b09ed");
//		assertNotNull(pointValues);
//
//		WritableArray pointValues = test.getPoint("c2ef448dd6bbb0eb81fb74ce89e218da4acb7f258c1899233c5b2962de0b09ed");
//		assertNotNull(pointValues);

	}
}

class mockReactContext extends ReactApplicationContext {
	public mockReactContext(Context context) {
		super(context);
	}
}

class mockContext extends Context {
	public mockContext() {
		super();
	}

	@Override
	public Executor getMainExecutor() {
		return super.getMainExecutor();
	}

	@Override
	public void registerComponentCallbacks(ComponentCallbacks callback) {
		super.registerComponentCallbacks(callback);
	}

	@Override
	public void unregisterComponentCallbacks(ComponentCallbacks callback) {
		super.unregisterComponentCallbacks(callback);
	}

	@Override
	public String getOpPackageName() {
		return super.getOpPackageName();
	}

	@Override
	public String getAttributionTag() {
		return super.getAttributionTag();
	}

	@Override
	public void sendBroadcastWithMultiplePermissions( Intent intent,  String[] receiverPermissions) {
		super.sendBroadcastWithMultiplePermissions(intent, receiverPermissions);
	}

	@Override
	public void sendOrderedBroadcast( Intent intent,  String receiverPermission,  String receiverAppOp,  BroadcastReceiver resultReceiver,  Handler scheduler, int initialCode,  String initialData,  Bundle initialExtras) {
		super.sendOrderedBroadcast(intent, receiverPermission, receiverAppOp, resultReceiver, scheduler, initialCode, initialData, initialExtras);
	}

	@Override
	public boolean bindService( Intent service, int flags,  Executor executor,  ServiceConnection conn) {
		return super.bindService(service, flags, executor, conn);
	}

	@Override
	public boolean bindIsolatedService( Intent service, int flags,  String instanceName,  Executor executor,  ServiceConnection conn) {
		return super.bindIsolatedService(service, flags, instanceName, executor, conn);
	}

	@Override
	public boolean bindServiceAsUser( Intent service,  ServiceConnection conn, int flags,  UserHandle user) {
		return super.bindServiceAsUser(service, conn, flags, user);
	}

	@Override
	public void updateServiceGroup( ServiceConnection conn, int group, int importance) {
		super.updateServiceGroup(conn, group, importance);
	}


	@Override
	public Context createWindowContext(int type,  Bundle options) {
		return super.createWindowContext(type, options);
	}


	@Override
	public Context createAttributionContext( String attributionTag) {
		return super.createAttributionContext(attributionTag);
	}


	@Override
	public Display getDisplay() {
		return super.getDisplay();
	}

	@Override
	public boolean isRestricted() {
		return super.isRestricted();
	}

	@Override
	public AssetManager getAssets() {
		return null;
	}

	@Override
	public Resources getResources() {
		return null;
	}

	@Override
	public PackageManager getPackageManager() {
		return null;
	}

	@Override
	public ContentResolver getContentResolver() {
		return null;
	}

	@Override
	public Looper getMainLooper() {
		return null;
	}

	@Override
	public Context getApplicationContext() {
		return null;
	}

	@Override
	public void setTheme(int resid) {

	}

	@Override
	public Resources.Theme getTheme() {
		return null;
	}

	@Override
	public ClassLoader getClassLoader() {
		return null;
	}

	@Override
	public String getPackageName() {
		return null;
	}

	@Override
	public ApplicationInfo getApplicationInfo() {
		return null;
	}

	@Override
	public String getPackageResourcePath() {
		return null;
	}

	@Override
	public String getPackageCodePath() {
		return null;
	}

	@Override
	public SharedPreferences getSharedPreferences(String name, int mode) {
		return null;
	}

	@Override
	public boolean moveSharedPreferencesFrom(Context sourceContext, String name) {
		return false;
	}

	@Override
	public boolean deleteSharedPreferences(String name) {
		return false;
	}

	@Override
	public FileInputStream openFileInput(String name) throws FileNotFoundException {
		return null;
	}

	@Override
	public FileOutputStream openFileOutput(String name, int mode) throws FileNotFoundException {
		return null;
	}

	@Override
	public boolean deleteFile(String name) {
		return false;
	}

	@Override
	public File getFileStreamPath(String name) {
		return null;
	}

	@Override
	public File getDataDir() {
		return null;
	}

	@Override
	public File getFilesDir() {
		return null;
	}

	@Override
	public File getNoBackupFilesDir() {
		return null;
	}


	@Override
	public File getExternalFilesDir( String type) {
		return null;
	}

	@Override
	public File[] getExternalFilesDirs(String type) {
		return new File[0];
	}

	@Override
	public File getObbDir() {
		return null;
	}

	@Override
	public File[] getObbDirs() {
		return new File[0];
	}

	@Override
	public File getCacheDir() {
		return null;
	}

	@Override
	public File getCodeCacheDir() {
		return null;
	}


	@Override
	public File getExternalCacheDir() {
		return null;
	}

	@Override
	public File[] getExternalCacheDirs() {
		return new File[0];
	}

	@Override
	public File[] getExternalMediaDirs() {
		return new File[0];
	}

	@Override
	public String[] fileList() {
		return new String[0];
	}

	@Override
	public File getDir(String name, int mode) {
		return null;
	}

	@Override
	public SQLiteDatabase openOrCreateDatabase(String name, int mode, SQLiteDatabase.CursorFactory factory) {
		return null;
	}

	@Override
	public SQLiteDatabase openOrCreateDatabase(String name, int mode, SQLiteDatabase.CursorFactory factory,  DatabaseErrorHandler errorHandler) {
		return null;
	}

	@Override
	public boolean moveDatabaseFrom(Context sourceContext, String name) {
		return false;
	}

	@Override
	public boolean deleteDatabase(String name) {
		return false;
	}

	@Override
	public File getDatabasePath(String name) {
		return null;
	}

	@Override
	public String[] databaseList() {
		return new String[0];
	}

	@Override
	public Drawable getWallpaper() {
		return null;
	}

	@Override
	public Drawable peekWallpaper() {
		return null;
	}

	@Override
	public int getWallpaperDesiredMinimumWidth() {
		return 0;
	}

	@Override
	public int getWallpaperDesiredMinimumHeight() {
		return 0;
	}

	@Override
	public void setWallpaper(Bitmap bitmap) throws IOException {

	}

	@Override
	public void setWallpaper(InputStream data) throws IOException {

	}

	@Override
	public void clearWallpaper() throws IOException {

	}

	@Override
	public void startActivity(Intent intent) {

	}

	@Override
	public void startActivity(Intent intent,  Bundle options) {

	}

	@Override
	public void startActivities(Intent[] intents) {

	}

	@Override
	public void startActivities(Intent[] intents, Bundle options) {

	}

	@Override
	public void startIntentSender(IntentSender intent,  Intent fillInIntent, int flagsMask, int flagsValues, int extraFlags) throws IntentSender.SendIntentException {

	}

	@Override
	public void startIntentSender(IntentSender intent,  Intent fillInIntent, int flagsMask, int flagsValues, int extraFlags,  Bundle options) throws IntentSender.SendIntentException {

	}

	@Override
	public void sendBroadcast(Intent intent) {

	}

	@Override
	public void sendBroadcast(Intent intent,  String receiverPermission) {

	}

	@Override
	public void sendOrderedBroadcast(Intent intent,  String receiverPermission) {

	}

	@Override
	public void sendOrderedBroadcast( Intent intent,  String receiverPermission,  BroadcastReceiver resultReceiver,  Handler scheduler, int initialCode,  String initialData,  Bundle initialExtras) {

	}

	@Override
	public void sendBroadcastAsUser(Intent intent, UserHandle user) {

	}

	@Override
	public void sendBroadcastAsUser(Intent intent, UserHandle user,  String receiverPermission) {

	}

	@Override
	public void sendOrderedBroadcastAsUser(Intent intent, UserHandle user,  String receiverPermission, BroadcastReceiver resultReceiver,  Handler scheduler, int initialCode,  String initialData,  Bundle initialExtras) {

	}

	@Override
	public void sendStickyBroadcast(Intent intent) {

	}

	@Override
	public void sendStickyOrderedBroadcast(Intent intent, BroadcastReceiver resultReceiver,  Handler scheduler, int initialCode,  String initialData,  Bundle initialExtras) {

	}

	@Override
	public void removeStickyBroadcast(Intent intent) {

	}

	@Override
	public void sendStickyBroadcastAsUser(Intent intent, UserHandle user) {

	}

	@Override
	public void sendStickyOrderedBroadcastAsUser(Intent intent, UserHandle user, BroadcastReceiver resultReceiver,  Handler scheduler, int initialCode,  String initialData,  Bundle initialExtras) {

	}

	@Override
	public void removeStickyBroadcastAsUser(Intent intent, UserHandle user) {

	}


	@Override
	public Intent registerReceiver( BroadcastReceiver receiver, IntentFilter filter) {
		return null;
	}


	@Override
	public Intent registerReceiver( BroadcastReceiver receiver, IntentFilter filter, int flags) {
		return null;
	}


	@Override
	public Intent registerReceiver(BroadcastReceiver receiver, IntentFilter filter,  String broadcastPermission,  Handler scheduler) {
		return null;
	}


	@Override
	public Intent registerReceiver(BroadcastReceiver receiver, IntentFilter filter,  String broadcastPermission,  Handler scheduler, int flags) {
		return null;
	}

	@Override
	public void unregisterReceiver(BroadcastReceiver receiver) {

	}


	@Override
	public ComponentName startService(Intent service) {
		return null;
	}


	@Override
	public ComponentName startForegroundService(Intent service) {
		return null;
	}

	@Override
	public boolean stopService(Intent service) {
		return false;
	}

	@Override
	public boolean bindService(Intent service,  ServiceConnection conn, int flags) {
		return false;
	}

	@Override
	public void unbindService( ServiceConnection conn) {

	}

	@Override
	public boolean startInstrumentation( ComponentName className,  String profileFile,  Bundle arguments) {
		return false;
	}

	@Override
	public Object getSystemService( String name) {
		return null;
	}


	@Override
	public String getSystemServiceName( Class<?> serviceClass) {
		return null;
	}

	@Override
	public int checkPermission( String permission, int pid, int uid) {
		return 0;
	}

	@Override
	public int checkCallingPermission( String permission) {
		return 0;
	}

	@Override
	public int checkCallingOrSelfPermission( String permission) {
		return 0;
	}

	@Override
	public int checkSelfPermission( String permission) {
		return 0;
	}

	@Override
	public void enforcePermission( String permission, int pid, int uid,  String message) {

	}

	@Override
	public void enforceCallingPermission( String permission,  String message) {

	}

	@Override
	public void enforceCallingOrSelfPermission( String permission,  String message) {

	}

	@Override
	public void grantUriPermission(String toPackage, Uri uri, int modeFlags) {

	}

	@Override
	public void revokeUriPermission(Uri uri, int modeFlags) {

	}

	@Override
	public void revokeUriPermission(String toPackage, Uri uri, int modeFlags) {

	}

	@Override
	public int checkUriPermission(Uri uri, int pid, int uid, int modeFlags) {
		return 0;
	}

	@Override
	public int checkCallingUriPermission(Uri uri, int modeFlags) {
		return 0;
	}

	@Override
	public int checkCallingOrSelfUriPermission(Uri uri, int modeFlags) {
		return 0;
	}

	@Override
	public int checkUriPermission( Uri uri,  String readPermission,  String writePermission, int pid, int uid, int modeFlags) {
		return 0;
	}

	@Override
	public void enforceUriPermission(Uri uri, int pid, int uid, int modeFlags, String message) {

	}

	@Override
	public void enforceCallingUriPermission(Uri uri, int modeFlags, String message) {

	}

	@Override
	public void enforceCallingOrSelfUriPermission(Uri uri, int modeFlags, String message) {

	}

	@Override
	public void enforceUriPermission( Uri uri,  String readPermission,  String writePermission, int pid, int uid, int modeFlags,  String message) {

	}

	@Override
	public Context createPackageContext(String packageName, int flags) throws PackageManager.NameNotFoundException {
		return null;
	}

	@Override
	public Context createContextForSplit(String splitName) throws PackageManager.NameNotFoundException {
		return null;
	}

	@Override
	public Context createConfigurationContext( Configuration overrideConfiguration) {
		return null;
	}

	@Override
	public Context createDisplayContext( Display display) {
		return null;
	}

	@Override
	public Context createDeviceProtectedStorageContext() {
		return null;
	}

	@Override
	public boolean isDeviceProtectedStorage() {
		return false;
	}
}
