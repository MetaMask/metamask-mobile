package io.metamask.nativeModules;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.Promise;

import com.mixpanel.android.mpmetrics.MixpanelAPI;
import com.mixpanel.android.mpmetrics.Tweak;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import com.facebook.react.bridge.Promise;

public class RCTAnalytics extends ReactContextBaseJavaModule {

	MixpanelAPI mixpanel;
	private static Tweak<String> remoteVariables = MixpanelAPI.stringTweak("remoteVariables","{}");


	public RCTAnalytics(ReactApplicationContext reactContext) {
		super(reactContext);
		try{
			ApplicationInfo ai = reactContext.getPackageManager().getApplicationInfo(reactContext.getPackageName(), PackageManager.GET_META_DATA);
			String mixpanelToken = (String)ai.metaData.get("com.mixpanel.android.mpmetrics.MixpanelAPI.token");
			this.mixpanel =
				MixpanelAPI.getInstance(reactContext, mixpanelToken);

		}catch (PackageManager.NameNotFoundException e){
			Log.d("RCTAnalytics","init:token missing");
		}
	}

	@Override
	public String getName() {
		return "Analytics";
	}

	@ReactMethod
	public void trackEvent(ReadableMap e) {
		String eventCategory = e.getString("category");
		JSONObject props = toJSONObject(e);
		props.remove("category");
		this.mixpanel.track(eventCategory, props);
	}

	@ReactMethod
	public void trackEventAnonymously(ReadableMap e) {
		String eventCategory = e.getString("category");
		String distinctId = this.mixpanel.getDistinctId();
		this.mixpanel.identify("0x0000000000000000");
		JSONObject props = toJSONObject(e);
		this.mixpanel.track(eventCategory, props);
		this.mixpanel.identify(distinctId);
	}

	@ReactMethod
	public void getDistinctId(Promise promise) {
		String distinctId = this.mixpanel.getDistinctId();
		promise.resolve(distinctId);
	}

	@ReactMethod
	public void peopleIdentify() {
		String distinctId = this.mixpanel.getDistinctId();
		this.mixpanel.getPeople().identify(distinctId);
	}

	@ReactMethod
	public void setUserProfileProperty(String propertyName, String propertyValue) {
		String distinctId = this.mixpanel.getDistinctId();
		this.mixpanel.getPeople().identify(distinctId);
		this.mixpanel.getPeople().set(propertyName, propertyValue);
	}

	@ReactMethod
	public void optIn(boolean val) {
		if(val){
			this.mixpanel.optInTracking();
		}else{
			this.mixpanel.optOutTracking();
		}
	}

	@ReactMethod
	public void getRemoteVariables(Promise promise) {
		try{
			String vars = remoteVariables.get();
			promise.resolve(vars);
		} catch (Error e){
			promise.reject(e);
		}

	}

	private JSONObject toJSONObject(ReadableMap readableMap){

		ReadableMapKeySetIterator iterator = readableMap.keySetIterator();
		JSONObject map = new JSONObject();
		while (iterator.hasNextKey()) {
			String key = iterator.nextKey();
			try{
				switch (readableMap.getType(key)) {
					case Null:
						map.put(key, null);
						break;
					case Boolean:
						map.put(key, readableMap.getBoolean(key));
						break;
					case Number:
						map.put(key, readableMap.getDouble(key));
						break;
					case String:
						map.put(key, readableMap.getString(key));
						break;
					case Map:
						map.put(key, toHashMap(readableMap.getMap(key)));
						break;
					case Array:
						map.put(key, toArrayList(readableMap.getArray(key)));
						break;
					default:
						throw new IllegalArgumentException("Could not convert object with key: " + key + ".");
				}
			}catch(JSONException e){
				Log.d("RCTAnalytics","JSON parse error");
			}
		}
		return map;

	}

	private HashMap<String, Object> toHashMap(ReadableMap readableMap){

		ReadableMapKeySetIterator iterator = readableMap.keySetIterator();
		HashMap<String, Object> hashMap = new HashMap<>();
		while (iterator.hasNextKey()) {
			String key = iterator.nextKey();
			switch (readableMap.getType(key)) {
				case Null:
					hashMap.put(key, null);
					break;
				case Boolean:
					hashMap.put(key, readableMap.getBoolean(key));
					break;
				case Number:
					hashMap.put(key, readableMap.getDouble(key));
					break;
				case String:
					hashMap.put(key, readableMap.getString(key));
					break;
				case Map:
					hashMap.put(key, toHashMap(readableMap.getMap(key)));
					break;
				case Array:
					hashMap.put(key, toArrayList(readableMap.getArray(key)));
					break;
				default:
					throw new IllegalArgumentException("Could not convert object with key: " + key + ".");
			}
		}
		return hashMap;

	}


	private ArrayList<Object> toArrayList(ReadableArray readableArray) {


		ArrayList<Object> arrayList = new ArrayList<>();

		for (int i = 0; i < readableArray.size(); i++) {
			switch (readableArray.getType(i)) {
				case Null:
					arrayList.add(null);
					break;
				case Boolean:
					arrayList.add(readableArray.getBoolean(i));
					break;
				case Number:
					arrayList.add(readableArray.getDouble(i));
					break;
				case String:
					arrayList.add(readableArray.getString(i));
					break;
				case Map:
					arrayList.add(toHashMap(readableArray.getMap(i)));
					break;
				case Array:
					arrayList.add(toArrayList(readableArray.getArray(i)));
					break;
				default:
					throw new IllegalArgumentException("Could not convert object at index: " + i + ".");
			}
		}
		return arrayList;

	}
}
