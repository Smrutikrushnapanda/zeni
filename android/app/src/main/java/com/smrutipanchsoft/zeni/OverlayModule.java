package com.smrutipanchsoft.zeni;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class OverlayModule extends ReactContextBaseJavaModule {
    
    private static final String TAG = "OverlayModule";
    private static final int OVERLAY_PERMISSION_REQUEST_CODE = 1234;
    private final ReactApplicationContext reactContext;

    public OverlayModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @NonNull
    @Override
    public String getName() {
        return "OverlayModule";
    }

    @ReactMethod
    public void checkOverlayPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                boolean canDraw = Settings.canDrawOverlays(reactContext);
                Log.d(TAG, "✅ Overlay permission check: " + canDraw);
                promise.resolve(canDraw);
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error checking permission", e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void requestOverlayPermission(Promise promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Activity activity = getCurrentActivity();
                if (activity != null) {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                            Uri.parse("package:" + reactContext.getPackageName()));
                    activity.startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST_CODE);
                    Log.d(TAG, "📱 Requesting overlay permission");
                    promise.resolve(true);
                } else {
                    promise.reject("ERROR", "No activity available");
                }
            } else {
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Error requesting permission", e);
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void startOverlay(Promise promise) {
        try {
            Log.d(TAG, "========== START OVERLAY REQUEST ==========");
            Intent intent = new Intent(reactContext, OverlayService.class);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent);
            } else {
                reactContext.startService(intent);
            }
            
            promise.resolve(true);
            Log.d(TAG, "========== START OVERLAY COMPLETE ==========");
        } catch (Exception e) {
            Log.e(TAG, "❌ CRITICAL ERROR starting overlay", e);
            e.printStackTrace();
            promise.reject("ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void stopOverlay(Promise promise) {
        try {
            Log.d(TAG, "========== STOP OVERLAY REQUEST ==========");
            
            // Check if service is even running
            if (OverlayService.instance == null) {
                Log.d(TAG, "⚠️ Service already stopped");
                promise.resolve(true);
                return;
            }
            
            Log.d(TAG, "🛑 Stopping overlay service...");
            Intent intent = new Intent(reactContext, OverlayService.class);
            boolean stopped = reactContext.stopService(intent);
            Log.d(TAG, "stopService() returned: " + stopped);
            
            // Wait for cleanup to complete
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                try {
                    boolean stillRunning = OverlayService.instance != null;
                    Log.d(TAG, "After 300ms delay - Still running: " + stillRunning);
                    
                    if (stillRunning) {
                        Log.w(TAG, "⚠️ Service didn't stop properly, forcing null...");
                        OverlayService.instance = null;
                    }
                    
                    promise.resolve(true);
                    Log.d(TAG, "========== STOP OVERLAY COMPLETE ==========");
                } catch (Exception e) {
                    Log.e(TAG, "❌ Error in delayed callback", e);
                    e.printStackTrace();
                    promise.resolve(true); // Still resolve to avoid crash
                }
            }, 300); // 300ms delay for cleanup
            
        } catch (Exception e) {
            Log.e(TAG, "❌ CRITICAL ERROR in stopOverlay", e);
            e.printStackTrace();
            promise.resolve(false); // Don't reject to avoid crash
        }
    }

    @ReactMethod
    public void isOverlayRunning(Promise promise) {
        try {
            boolean running = OverlayService.instance != null;
            Log.d(TAG, "🔍 Overlay running check: " + running);
            promise.resolve(running);
        } catch (Exception e) {
            Log.e(TAG, "❌ Error checking overlay status", e);
            promise.reject("ERROR", e.getMessage());
        }
    }
}