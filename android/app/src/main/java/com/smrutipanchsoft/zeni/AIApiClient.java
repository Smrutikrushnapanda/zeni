package com.smrutipanchsoft.zeni;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class AIApiClient {
    private static final String TAG = "AIApiClient";
    
    // ✅ Railway Backend URL
    private static final String BASE_URL = "https://zeni-backend.up.railway.app";
    
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final String sessionId;

    public interface AICallback {
        void onSuccess(String response);
        void onError(String error);
    }
    
    // Generic Callback interface for compatibility
    public interface Callback<T> {
        void onSuccess(T response);
        void onError(String error);
    }

    public AIApiClient() {
        // Generate unique session ID for this device
        this.sessionId = "android_" + UUID.randomUUID().toString();
        Log.d(TAG, "✅ Session ID: " + sessionId);
    }

    /**
     * Send a message to Groq AI and get response (generic version)
     */
    public void sendMessage(String message, Callback<String> callback) {
        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                Log.d(TAG, "📤 Sending message: " + message);
                
                // Create URL
                URL url = new URL(BASE_URL + "/chat");
                conn = (HttpURLConnection) url.openConnection();
                
                // Setup connection
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000); // 10 seconds
                conn.setReadTimeout(30000); // 30 seconds
                
                // Create JSON request
                JSONObject json = new JSONObject();
                json.put("message", message);
                json.put("sessionId", sessionId);
                
                // Send request
                OutputStream os = conn.getOutputStream();
                os.write(json.toString().getBytes("UTF-8"));
                os.flush();
                os.close();
                
                // Check response code
                int responseCode = conn.getResponseCode();
                Log.d(TAG, "📥 Response code: " + responseCode);
                
                if (responseCode != 200) {
                    throw new Exception("HTTP Error: " + responseCode);
                }
                
                // Read response
                BufferedReader br = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), "UTF-8")
                );
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    response.append(line);
                }
                br.close();
                
                // Parse response
                JSONObject jsonResponse = new JSONObject(response.toString());
                String aiMessage = jsonResponse.getString("reply");
                
                Log.d(TAG, "✅ AI Response received");
                
                // Return on main thread
                mainHandler.post(() -> callback.onSuccess(aiMessage));
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Error calling AI API", e);
                mainHandler.post(() -> 
                    callback.onError("Connection failed: " + e.getMessage())
                );
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    /**
     * Health check / Ping backend
     */
    public void pingBackend(Callback<String> callback) {
        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                Log.d(TAG, "🏓 Ping backend...");
                
                URL url = new URL(BASE_URL + "/");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                
                int responseCode = conn.getResponseCode();
                
                if (responseCode == 200) {
                    BufferedReader br = new BufferedReader(
                        new InputStreamReader(conn.getInputStream(), "UTF-8")
                    );
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    br.close();
                    
                    JSONObject json = new JSONObject(response.toString());
                    String status = json.getString("status");
                    
                    Log.d(TAG, "✅ Backend reachable: " + status);
                    mainHandler.post(() -> callback.onSuccess(status));
                } else {
                    Log.e(TAG, "❌ Backend returned: " + responseCode);
                    mainHandler.post(() -> 
                        callback.onError("Backend returned: " + responseCode)
                    );
                }
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Ping failed", e);
                mainHandler.post(() -> 
                    callback.onError("Cannot reach backend at " + BASE_URL)
                );
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    public void healthCheck(AICallback callback) {
        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                Log.d(TAG, "🏥 Health check...");
                
                URL url = new URL(BASE_URL + "/");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                
                int responseCode = conn.getResponseCode();
                
                if (responseCode == 200) {
                    // Read response
                    BufferedReader br = new BufferedReader(
                        new InputStreamReader(conn.getInputStream(), "UTF-8")
                    );
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        response.append(line);
                    }
                    br.close();
                    
                    JSONObject json = new JSONObject(response.toString());
                    String status = json.getString("status");
                    
                    Log.d(TAG, "✅ Backend healthy: " + status);
                    mainHandler.post(() -> callback.onSuccess(status));
                } else {
                    Log.e(TAG, "❌ Backend unhealthy: " + responseCode);
                    mainHandler.post(() -> 
                        callback.onError("Backend returned: " + responseCode)
                    );
                }
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Health check failed", e);
                mainHandler.post(() -> 
                    callback.onError("Cannot reach backend at " + BASE_URL)
                );
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    /**
     * Clear conversation history for this session
     */
    public void clearConversation(AICallback callback) {
        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                Log.d(TAG, "🗑️ Clearing conversation...");
                
                URL url = new URL(BASE_URL + "/clear");
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);
                
                // Send session ID
                JSONObject json = new JSONObject();
                json.put("sessionId", sessionId);
                
                OutputStream os = conn.getOutputStream();
                os.write(json.toString().getBytes("UTF-8"));
                os.flush();
                os.close();
                
                int responseCode = conn.getResponseCode();
                
                if (responseCode == 200) {
                    Log.d(TAG, "✅ Conversation cleared");
                    mainHandler.post(() -> callback.onSuccess("Conversation cleared"));
                } else {
                    Log.e(TAG, "❌ Clear failed: " + responseCode);
                    mainHandler.post(() -> 
                        callback.onError("Failed to clear: " + responseCode)
                    );
                }
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Error clearing conversation", e);
                mainHandler.post(() -> 
                    callback.onError("Error: " + e.getMessage())
                );
            } finally {
                if (conn != null) {
                    conn.disconnect();
                }
            }
        });
    }

    /**
     * Shutdown the executor service
     */
    public void shutdown() {
        try {
            executor.shutdown();
            Log.d(TAG, "✅ API client shutdown");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error shutting down", e);
        }
    }
}