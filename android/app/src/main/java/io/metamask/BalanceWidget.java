package io.metamask;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.RemoteViews;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Implementation of App Widget functionality.
 */
public class BalanceWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
      try {
        SharedPreferences sharedPref = context.getSharedPreferences("DATA", Context.MODE_PRIVATE);
        Log.d("sharedPref", sharedPref.getAll().toString());

        String accountName = sharedPref.getString("accountName", "no data");
        String balance = sharedPref.getString("balance", "no data");
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.balance_widget);

        Log.d("accountName", accountName);
        Log.d("balance", balance);

        views.setTextViewText(R.id.balance_widget_account_name_text, accountName);
        views.setTextViewText(R.id.balance_widget_balance_text, balance);
        appWidgetManager.updateAppWidget(appWidgetId, views);
      }catch (Exception e) {
        Log.e("BalanceWidget updateAppWidget", e.getMessage());
        e.printStackTrace();
      }
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
      // There may be multiple widgets active, so update all of them
      for (int appWidgetId : appWidgetIds) {
        updateAppWidget(context, appWidgetManager, appWidgetId);
      }
    }

    @Override
    public void onEnabled(Context context) {
      // Enter relevant functionality for when the first widget is created
    }

    @Override
    public void onDisabled(Context context) {
      // Enter relevant functionality for when the last widget is disabled
    }
}



