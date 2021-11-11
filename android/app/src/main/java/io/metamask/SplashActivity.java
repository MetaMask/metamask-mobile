package io.metamask;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import androidx.appcompat.app.AppCompatActivity;

public class SplashActivity extends AppCompatActivity {
	@Override
	protected void onCreate(Bundle savedInstanceState) {
		long onCreateS = System.currentTimeMillis();

		super.onCreate(savedInstanceState);

		Intent intent = new Intent(this, MainActivity.class);
		startActivity(intent);
		finish();
		Log.i(MainActivity.class.getSimpleName() + " MM onCreate", Long.toString(System.currentTimeMillis() - onCreateS ));
	}
}
