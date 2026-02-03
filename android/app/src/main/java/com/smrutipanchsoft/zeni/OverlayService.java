package com.smrutipanchsoft.zeni;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Point;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.text.Html;
import android.text.InputType;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.BackgroundColorSpan;
import android.text.style.ForegroundColorSpan;
import android.text.style.TypefaceSpan;
import android.util.DisplayMetrics;
import android.util.Log;
import android.util.TypedValue;
import android.view.Display;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class OverlayService extends Service {

    public static OverlayService instance = null;
    private WindowManager windowManager;
    
    private FrameLayout buttonContainer;
    private ImageView floatingButton;
    private WindowManager.LayoutParams buttonParams;
    
    private LinearLayout spotlightView;
    private WindowManager.LayoutParams spotlightParams;
    private boolean isSpotlightVisible = false;
    
    private EditText searchInput;
    private ImageView btnSend;
    private View btnClose, btnMinimize, btnMaximize;
    private RecyclerView chatRecyclerView;
    private ChatAdapter chatAdapter;
    private List<ChatMessage> chatMessages = new ArrayList<>();
    
    private LinearLayout chatContainer;
    private LinearLayout typingIndicatorContainer;
    private ImageView typingDots1, typingDots2, typingDots3;
    
    private float initialTouchX, initialTouchY;
    private int initialX, initialY;
    private boolean isDragging = false;
    private static final int DRAG_THRESHOLD = 10;
    
    private int screenWidth, screenHeight;
    private int buttonSize;
    
    private boolean isExpanded = false;
    
    private View resizeHandle;
    private boolean isResizing = false;
    private float resizeInitialTouchX, resizeInitialTouchY;
    private int resizeInitialWidth, resizeInitialHeight;
    private int minWidth, maxWidth;
    private int minHeight, maxHeight;
    
    private static final String TAG = "OverlayService";
    private Handler handler = new Handler(Looper.getMainLooper());
    
    private AIApiClient apiClient;

    private static final String CHANNEL_ID = "overlay_service_channel";
    private static final int NOTIFICATION_ID = 1001;

    // Chat Message Model
    private static class ChatMessage {
        String message;
        boolean isUser;
        String timestamp;

        ChatMessage(String message, boolean isUser, String timestamp) {
            this.message = message;
            this.isUser = isUser;
            this.timestamp = timestamp;
        }
    }

    // ======================= CODE BLOCK PARSER =======================
    private static class CodeBlock {
        String language;
        String code;

        CodeBlock(String language, String code) {
            this.language = language;
            this.code = code;
        }
    }

    private static class MessagePart {
        enum Type { TEXT, CODE }
        Type type;
        String content;
        String language;

        MessagePart(Type type, String content, String language) {
            this.type = type;
            this.content = content;
            this.language = language;
        }
    }

    private List<MessagePart> parseMessageWithCode(String message) {
        List<MessagePart> parts = new ArrayList<>();
        Pattern codePattern = Pattern.compile("```(\\w+)?\\n([\\s\\S]*?)```");
        Matcher matcher = codePattern.matcher(message);
        
        int lastEnd = 0;
        while (matcher.find()) {
            // Add text before code block
            if (matcher.start() > lastEnd) {
                String textContent = message.substring(lastEnd, matcher.start()).trim();
                if (!textContent.isEmpty()) {
                    parts.add(new MessagePart(MessagePart.Type.TEXT, textContent, null));
                }
            }
            
            // Add code block
            String language = matcher.group(1);
            String code = matcher.group(2);
            if (language == null || language.isEmpty()) {
                language = "code";
            }
            parts.add(new MessagePart(MessagePart.Type.CODE, code.trim(), language));
            
            lastEnd = matcher.end();
        }
        
        // Add remaining text
        if (lastEnd < message.length()) {
            String textContent = message.substring(lastEnd).trim();
            if (!textContent.isEmpty()) {
                parts.add(new MessagePart(MessagePart.Type.TEXT, textContent, null));
            }
        }
        
        // If no code blocks found, return entire message as text
        if (parts.isEmpty()) {
            parts.add(new MessagePart(MessagePart.Type.TEXT, message, null));
        }
        
        return parts;
    }

    // ======================= CHAT ADAPTER WITH COPY ICONS =======================
    private class ChatAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
        private static final int TYPE_USER = 1;
        private static final int TYPE_AI = 2;
        
        private List<ChatMessage> messages;

        ChatAdapter(List<ChatMessage> messages) {
            this.messages = messages;
        }

        @Override
        public int getItemViewType(int position) {
            return messages.get(position).isUser ? TYPE_USER : TYPE_AI;
        }

        @Override
        public RecyclerView.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
            if (viewType == TYPE_USER) {
                return new UserMessageViewHolder(createUserMessageView(parent.getContext()));
            } else {
                return new AIMessageViewHolder(createAIMessageView(parent.getContext()));
            }
        }

        @Override
        public void onBindViewHolder(RecyclerView.ViewHolder holder, int position) {
            ChatMessage message = messages.get(position);
            
            if (holder.getItemViewType() == TYPE_USER) {
                ((UserMessageViewHolder) holder).bind(message);
            } else {
                ((AIMessageViewHolder) holder).bind(message);
            }
        }

        @Override
        public int getItemCount() {
            return messages.size();
        }

        // ======================= CREATE USER MESSAGE VIEW =======================
        private View createUserMessageView(Context context) {
            float dp = context.getResources().getDisplayMetrics().density;
            
            LinearLayout container = new LinearLayout(context);
            container.setOrientation(LinearLayout.HORIZONTAL);
            container.setGravity(Gravity.END);
            container.setPadding((int)(12*dp), (int)(8*dp), (int)(12*dp), (int)(8*dp));
            
            // Copy icon (LEFT side for user messages)
            ImageView copyIcon = new ImageView(context);
            copyIcon.setId(View.generateViewId());
            copyIcon.setImageResource(android.R.drawable.ic_menu_set_as);
            copyIcon.setColorFilter(Color.parseColor("#999999"));
            LinearLayout.LayoutParams copyParams = new LinearLayout.LayoutParams((int)(20*dp), (int)(20*dp));
            copyParams.setMarginEnd((int)(8*dp));
            copyParams.gravity = Gravity.TOP;
            copyIcon.setLayoutParams(copyParams);
            copyIcon.setPadding((int)(4*dp), (int)(4*dp), (int)(4*dp), (int)(4*dp));
            
            // Message bubble
            LinearLayout messageBubble = new LinearLayout(context);
            messageBubble.setId(View.generateViewId());
            messageBubble.setOrientation(LinearLayout.VERTICAL);
            messageBubble.setPadding((int)(12*dp), (int)(8*dp), (int)(12*dp), (int)(8*dp));
            
            GradientDrawable bubbleBg = new GradientDrawable();
            bubbleBg.setColor(Color.parseColor("#F0F0F0"));
            bubbleBg.setCornerRadius(16*dp);
            messageBubble.setBackground(bubbleBg);
            
            LinearLayout.LayoutParams bubbleParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            );
            bubbleParams.weight = 0;
            messageBubble.setLayoutParams(bubbleParams);
            
            TextView messageText = new TextView(context);
            messageText.setId(View.generateViewId());
            messageText.setTextColor(Color.parseColor("#1A1A1A"));
            messageText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
            messageText.setLineSpacing(0, 1.2f);
            messageBubble.addView(messageText);
            
            container.addView(copyIcon);
            container.addView(messageBubble);
            
            return container;
        }

        // ======================= CREATE AI MESSAGE VIEW =======================
        private View createAIMessageView(Context context) {
            float dp = context.getResources().getDisplayMetrics().density;
            
            LinearLayout container = new LinearLayout(context);
            container.setOrientation(LinearLayout.HORIZONTAL);
            container.setGravity(Gravity.START);
            container.setPadding((int)(12*dp), (int)(8*dp), (int)(12*dp), (int)(8*dp));
            
            // Message content container
            LinearLayout contentContainer = new LinearLayout(context);
            contentContainer.setId(View.generateViewId());
            contentContainer.setOrientation(LinearLayout.VERTICAL);
            LinearLayout.LayoutParams contentParams = new LinearLayout.LayoutParams(
                0,
                ViewGroup.LayoutParams.WRAP_CONTENT
            );
            contentParams.weight = 1;
            contentContainer.setLayoutParams(contentParams);
            
            // Copy icon (RIGHT side for AI messages)
            ImageView copyIcon = new ImageView(context);
            copyIcon.setId(View.generateViewId());
            copyIcon.setImageResource(android.R.drawable.ic_menu_set_as);
            copyIcon.setColorFilter(Color.parseColor("#999999"));
            LinearLayout.LayoutParams copyParams = new LinearLayout.LayoutParams((int)(20*dp), (int)(20*dp));
            copyParams.setMarginStart((int)(8*dp));
            copyParams.gravity = Gravity.TOP;
            copyIcon.setLayoutParams(copyParams);
            copyIcon.setPadding((int)(4*dp), (int)(4*dp), (int)(4*dp), (int)(4*dp));
            
            container.addView(contentContainer);
            container.addView(copyIcon);
            
            return container;
        }

        // ======================= USER MESSAGE VIEW HOLDER =======================
        class UserMessageViewHolder extends RecyclerView.ViewHolder {
            LinearLayout messageBubble;
            TextView messageText;
            ImageView copyIcon;

            UserMessageViewHolder(View itemView) {
                super(itemView);
                messageBubble = itemView.findViewById(itemView.getId());
                
                // Find views
                LinearLayout container = (LinearLayout) itemView;
                copyIcon = (ImageView) container.getChildAt(0);
                messageBubble = (LinearLayout) container.getChildAt(1);
                messageText = (TextView) messageBubble.getChildAt(0);
            }

            void bind(ChatMessage message) {
                messageText.setText(message.message);
                
                // Setup copy functionality
                copyIcon.setOnClickListener(v -> {
                    copyToClipboard(message.message);
                });
            }
        }

        // ======================= AI MESSAGE VIEW HOLDER =======================
        class AIMessageViewHolder extends RecyclerView.ViewHolder {
            LinearLayout contentContainer;
            ImageView copyIcon;
            String rawMessage;

            AIMessageViewHolder(View itemView) {
                super(itemView);
                
                LinearLayout container = (LinearLayout) itemView;
                contentContainer = (LinearLayout) container.getChildAt(0);
                copyIcon = (ImageView) container.getChildAt(1);
            }

            void bind(ChatMessage message) {
    float dp = itemView.getContext().getResources().getDisplayMetrics().density;
    contentContainer.removeAllViews();
    rawMessage = message.message;
    
    List<MessagePart> parts = parseMessageWithCode(message.message);
    
    for (MessagePart part : parts) {
        if (part.type == MessagePart.Type.CODE) {
            // ✅ FIXED: Use part.content instead of part.code
            contentContainer.addView(createCodeBlockView(part.content, part.language));
        } else {
            contentContainer.addView(createTextView(part.content));
        }
    }
    
    // Setup copy functionality for entire message
    copyIcon.setOnClickListener(v -> {
        // Remove HTML and code block markers when copying
        String plainText = Html.fromHtml(rawMessage).toString();
        plainText = plainText.replaceAll("```\\w*\\n", "").replaceAll("```", "");
        copyToClipboard(plainText);
    });
}

            private View createTextView(String text) {
                float dp = itemView.getContext().getResources().getDisplayMetrics().density;
                
                TextView textView = new TextView(itemView.getContext());
                textView.setText(Html.fromHtml(formatText(text)));
                textView.setTextColor(Color.parseColor("#1A1A1A"));
                textView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
                textView.setLineSpacing(0, 1.2f);
                
                LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                );
                params.setMargins(0, 0, 0, (int)(8*dp));
                textView.setLayoutParams(params);
                
                return textView;
            }

            private View createCodeBlockView(String code, String language) {
                float dp = itemView.getContext().getResources().getDisplayMetrics().density;
                
                LinearLayout codeBlock = new LinearLayout(itemView.getContext());
                codeBlock.setOrientation(LinearLayout.VERTICAL);
                
                GradientDrawable codeBg = new GradientDrawable();
                codeBg.setColor(Color.parseColor("#F6F8FA"));
                codeBg.setCornerRadius(8*dp);
                codeBg.setStroke((int)(1*dp), Color.parseColor("#E1E4E8"));
                codeBlock.setBackground(codeBg);
                
                LinearLayout.LayoutParams codeBlockParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                );
                codeBlockParams.setMargins(0, (int)(8*dp), 0, (int)(8*dp));
                codeBlock.setLayoutParams(codeBlockParams);
                
                // Code header
                LinearLayout header = new LinearLayout(itemView.getContext());
                header.setOrientation(LinearLayout.HORIZONTAL);
                header.setGravity(Gravity.CENTER_VERTICAL);
                header.setPadding((int)(12*dp), (int)(8*dp), (int)(12*dp), (int)(8*dp));
                header.setBackgroundColor(Color.parseColor("#E1E4E8"));
                
                TextView langText = new TextView(itemView.getContext());
                langText.setText(language.toLowerCase());
                langText.setTextColor(Color.parseColor("#586069"));
                langText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
                langText.setTypeface(null, android.graphics.Typeface.BOLD);
                
                LinearLayout.LayoutParams langParams = new LinearLayout.LayoutParams(
                    0,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                );
                langParams.weight = 1;
                langText.setLayoutParams(langParams);
                
                // Copy code button
                LinearLayout copyBtn = new LinearLayout(itemView.getContext());
                copyBtn.setOrientation(LinearLayout.HORIZONTAL);
                copyBtn.setGravity(Gravity.CENTER_VERTICAL);
                copyBtn.setPadding((int)(8*dp), (int)(4*dp), (int)(8*dp), (int)(4*dp));
                
                ImageView copyBtnIcon = new ImageView(itemView.getContext());
                copyBtnIcon.setImageResource(android.R.drawable.ic_menu_set_as);
                copyBtnIcon.setColorFilter(Color.parseColor("#586069"));
                LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams((int)(14*dp), (int)(14*dp));
                iconParams.setMarginEnd((int)(4*dp));
                copyBtnIcon.setLayoutParams(iconParams);
                
                TextView copyBtnText = new TextView(itemView.getContext());
                copyBtnText.setText("Copy code");
                copyBtnText.setTextColor(Color.parseColor("#586069"));
                copyBtnText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
                
                copyBtn.addView(copyBtnIcon);
                copyBtn.addView(copyBtnText);
                
                // Copy functionality
                final String[] copiedState = {null};
                copyBtn.setOnClickListener(v -> {
                    copyToClipboard(code);
                    copyBtnText.setText("Copied!");
                    handler.postDelayed(() -> copyBtnText.setText("Copy code"), 2000);
                });
                
                header.addView(langText);
                header.addView(copyBtn);
                
                // Code content (scrollable)
                ScrollView codeScroll = new ScrollView(itemView.getContext());
                codeScroll.setHorizontalScrollBarEnabled(true);
                LinearLayout.LayoutParams scrollParams = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                );
                codeScroll.setLayoutParams(scrollParams);
                
                TextView codeText = new TextView(itemView.getContext());
                codeText.setText(code);
                codeText.setTextColor(Color.parseColor("#24292E"));
                codeText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
                codeText.setTypeface(android.graphics.Typeface.MONOSPACE);
                codeText.setPadding((int)(12*dp), (int)(12*dp), (int)(12*dp), (int)(12*dp));
                codeText.setHorizontallyScrolling(true);
                
                codeScroll.addView(codeText);
                
                codeBlock.addView(header);
                codeBlock.addView(codeScroll);
                
                return codeBlock;
            }

            private String formatText(String text) {
                // Format bold **text**
                text = text.replaceAll("\\*\\*(.+?)\\*\\*", "<b>$1</b>");
                // Format italic *text*
                text = text.replaceAll("\\*(.+?)\\*", "<i>$1</i>");
                // Format bullet points
                text = text.replaceAll("(?m)^• (.+)$", "<br/>• $1");
                // Format numbered lists
                text = text.replaceAll("(?m)^(\\d+)\\. (.+)$", "<br/><b>$1.</b> $2");
                // Remove leading <br/>
                text = text.replaceAll("^<br/>", "");
                
                return text;
            }
        }
    }

    // ======================= COPY TO CLIPBOARD =======================
    private void copyToClipboard(String text) {
        try {
            ClipboardManager clipboard = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            ClipData clip = ClipData.newPlainText("Message", text);
            clipboard.setPrimaryClip(clip);
            
            handler.post(() -> {
                Toast.makeText(this, "✓ Copied", Toast.LENGTH_SHORT).show();
            });
            
            Log.d(TAG, "✅ Text copied");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error copying", e);
        }
    }

    // ======================= REST OF THE SERVICE (UNCHANGED) =======================
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Zeni AI Overlay",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("AI Assistant running");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            channel.enableVibration(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void startForegroundNotification() {
        createNotificationChannel();
        
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE
        );
        
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Zeni AI")
            .setContentText("AI Assistant is running")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setSilent(true)
            .build();
        
        startForeground(NOTIFICATION_ID, notification);
        Log.d(TAG, "✅ Foreground notification started");
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        
        startForegroundNotification();
        
        instance = this;
        apiClient = new AIApiClient();

        try {
            windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
            getScreenDimensions();
            createFloatingButton();
            createCompactChat();
            
            apiClient.pingBackend(new AIApiClient.Callback<String>() {
                @Override
                public void onSuccess(String result) {
                    Log.d(TAG, "✅ Backend connected: " + result);
                }

                @Override
                public void onError(String error) {
                    Log.e(TAG, "⚠️ Backend not reachable: " + error);
                }
            });
            
            Log.d(TAG, "✅ Service initialized");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error", e);
        }
    }

    private void getScreenDimensions() {
        DisplayMetrics displayMetrics = new DisplayMetrics();
        windowManager.getDefaultDisplay().getMetrics(displayMetrics);
        screenWidth = displayMetrics.widthPixels;
        screenHeight = displayMetrics.heightPixels;
        
        float dp = getResources().getDisplayMetrics().density;
        minWidth = (int) (280 * dp);
        maxWidth = (int) (screenWidth * 0.95f);
        minHeight = (int) (200 * dp);
        maxHeight = (int) (screenHeight * 0.85f);
    }

    private void createFloatingButton() {
        buttonContainer = new FrameLayout(this);
        floatingButton = new ImageView(this);
        
        GradientDrawable buttonBg = new GradientDrawable();
        buttonBg.setColor(Color.parseColor("#808080"));
        buttonBg.setShape(GradientDrawable.OVAL);
        buttonContainer.setBackground(buttonBg);
        
        floatingButton.setImageResource(R.drawable.ic_send);
        floatingButton.setColorFilter(Color.WHITE);
        
        buttonSize = (int) (40 * getResources().getDisplayMetrics().density);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(buttonSize, buttonSize);
        floatingButton.setLayoutParams(params);
        floatingButton.setPadding(10, 10, 10, 10);
        
        buttonContainer.setElevation(20f);
        buttonContainer.setAlpha(0.15f);
        
        buttonContainer.addView(floatingButton);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        buttonParams = new WindowManager.LayoutParams(
                buttonSize, buttonSize, type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );
        buttonParams.gravity = Gravity.TOP | Gravity.START;
        buttonParams.x = 50;
        buttonParams.y = 400;

        windowManager.addView(buttonContainer, buttonParams);

        buttonContainer.setOnTouchListener(new View.OnTouchListener() {
            private float initialTouchX, initialTouchY;
            private int initialX, initialY;
            private boolean isDragging = false;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        initialX = buttonParams.x;
                        initialY = buttonParams.y;
                        isDragging = false;
                        buttonContainer.animate().alpha(0.5f).setDuration(150).start();
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        float dx = event.getRawX() - initialTouchX;
                        float dy = event.getRawY() - initialTouchY;
                        
                        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
                            isDragging = true;
                            buttonContainer.setAlpha(0.7f);
                        }
                        
                        if (isDragging) {
                            int newX = initialX + (int) dx;
                            int newY = initialY + (int) dy;
                            newX = Math.max(0, Math.min(newX, screenWidth - buttonSize));
                            newY = Math.max(0, Math.min(newY, screenHeight - buttonSize));
                            buttonParams.x = newX;
                            buttonParams.y = newY;
                            windowManager.updateViewLayout(buttonContainer, buttonParams);
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        buttonContainer.animate().alpha(0.15f).setDuration(300).start();
                        if (!isDragging) {
                            toggleSpotlight();
                        }
                        isDragging = false;
                        return true;
                }
                return false;
            }
        });
    }

    // Continue with createCompactChat and all remaining methods...
    // (Keep all other methods exactly the same as before)

    private void createCompactChat() {
        float dp = getResources().getDisplayMetrics().density;
        
        spotlightView = new LinearLayout(this);
        spotlightView.setOrientation(LinearLayout.VERTICAL);
        
        GradientDrawable glassBg = new GradientDrawable();
        glassBg.setColors(new int[]{
            Color.parseColor("#F8FFFFFF"),
            Color.parseColor("#E6FFFFFF")
        });
        glassBg.setGradientType(GradientDrawable.LINEAR_GRADIENT);
        glassBg.setCornerRadius(12 * dp);
        glassBg.setStroke((int)(1 * dp), Color.parseColor("#30FFFFFF"));
        glassBg.setAlpha(245);
        spotlightView.setBackground(glassBg);
        spotlightView.setElevation(30f);
        
        int width = (int) (340 * dp);
        spotlightView.setLayoutParams(new LinearLayout.LayoutParams(width, ViewGroup.LayoutParams.WRAP_CONTENT));
        spotlightView.setPadding((int)(12*dp), (int)(8*dp), (int)(12*dp), (int)(12*dp));

        LinearLayout headerRow = new LinearLayout(this);
        headerRow.setOrientation(LinearLayout.HORIZONTAL);
        headerRow.setGravity(Gravity.CENTER_VERTICAL);
        headerRow.setPadding((int)(4*dp), (int)(4*dp), (int)(4*dp), (int)(8*dp));
        
        LinearLayout macButtonsContainer = new LinearLayout(this);
        macButtonsContainer.setOrientation(LinearLayout.HORIZONTAL);
        macButtonsContainer.setGravity(Gravity.CENTER_VERTICAL);
        
        btnClose = createMacButton(Color.parseColor("#FF5F56"));
        btnMinimize = createMacButton(Color.parseColor("#FFBD2E"));
        btnMaximize = createMacButton(Color.parseColor("#27C93F"));
        
        LinearLayout.LayoutParams macBtnParams = new LinearLayout.LayoutParams((int)(12*dp), (int)(12*dp));
        macBtnParams.setMarginEnd((int)(8*dp));
        
        macButtonsContainer.addView(btnClose, macBtnParams);
        macButtonsContainer.addView(btnMinimize, new LinearLayout.LayoutParams((int)(12*dp), (int)(12*dp)));
        ((LinearLayout.LayoutParams)btnMinimize.getLayoutParams()).setMarginEnd((int)(8*dp));
        macButtonsContainer.addView(btnMaximize, new LinearLayout.LayoutParams((int)(12*dp), (int)(12*dp)));
        
        TextView headerTitle = new TextView(this);
        headerTitle.setText("AI Assistant");
        headerTitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        headerTitle.setTextColor(Color.parseColor("#666666"));
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        titleParams.setMarginStart((int)(12*dp));
        headerTitle.setLayoutParams(titleParams);
        
        headerRow.addView(macButtonsContainer);
        headerRow.addView(headerTitle);

        chatContainer = new LinearLayout(this);
        chatContainer.setOrientation(LinearLayout.VERTICAL);
        chatContainer.setVisibility(View.GONE);
        
        chatRecyclerView = new RecyclerView(this);
        chatRecyclerView.setLayoutManager(new LinearLayoutManager(this));
        chatAdapter = new ChatAdapter(chatMessages);
        chatRecyclerView.setAdapter(chatAdapter);
        
        LinearLayout.LayoutParams chatParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            (int)(250 * dp)
        );
        chatParams.setMargins(0, 0, 0, (int)(12*dp));
        chatRecyclerView.setLayoutParams(chatParams);

        typingIndicatorContainer = new LinearLayout(this);
        typingIndicatorContainer.setOrientation(LinearLayout.HORIZONTAL);
        typingIndicatorContainer.setGravity(Gravity.CENTER_VERTICAL);
        typingIndicatorContainer.setPadding((int)(8*dp), (int)(8*dp), (int)(8*dp), (int)(8*dp));
        typingIndicatorContainer.setVisibility(View.GONE);
        
        ImageView typingAvatar = new ImageView(this);
        typingAvatar.setImageResource(R.drawable.ic_ai_avatar);
        LinearLayout.LayoutParams typingAvatarParams = new LinearLayout.LayoutParams((int)(24*dp), (int)(24*dp));
        typingAvatar.setLayoutParams(typingAvatarParams);
        
        LinearLayout typingDotsContainer = new LinearLayout(this);
        typingDotsContainer.setOrientation(LinearLayout.HORIZONTAL);
        typingDotsContainer.setGravity(Gravity.CENTER_VERTICAL);
        typingDotsContainer.setPadding((int)(8*dp), 0, 0, 0);
        
        typingDots1 = new ImageView(this);
        typingDots2 = new ImageView(this);
        typingDots3 = new ImageView(this);
        
        for (ImageView dot : new ImageView[]{typingDots1, typingDots2, typingDots3}) {
            dot.setImageResource(R.drawable.ic_dot);
            dot.setColorFilter(Color.parseColor("#666666"));
            LinearLayout.LayoutParams dotParams = new LinearLayout.LayoutParams((int)(6*dp), (int)(6*dp));
            dotParams.setMarginEnd((int)(4*dp));
            dot.setLayoutParams(dotParams);
            typingDotsContainer.addView(dot);
        }
        
        typingIndicatorContainer.addView(typingAvatar);
        typingIndicatorContainer.addView(typingDotsContainer);
        
        chatContainer.addView(chatRecyclerView);
        chatContainer.addView(typingIndicatorContainer);

        LinearLayout inputContainer = new LinearLayout(this);
        inputContainer.setOrientation(LinearLayout.HORIZONTAL);
        inputContainer.setGravity(Gravity.CENTER_VERTICAL);
        inputContainer.setPadding((int)(8*dp), (int)(8*dp), (int)(8*dp), (int)(8*dp));
        
        GradientDrawable inputBg = new GradientDrawable();
        inputBg.setColor(Color.parseColor("#F5F5F5"));
        inputBg.setCornerRadius(20 * dp);
        inputContainer.setBackground(inputBg);

        searchInput = new EditText(this);
        searchInput.setHint("Ask me anything...");
        searchInput.setHintTextColor(Color.parseColor("#999999"));
        searchInput.setTextColor(Color.parseColor("#1A1A1A"));
        searchInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        searchInput.setBackgroundColor(Color.TRANSPARENT);
        searchInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        searchInput.setMaxLines(3);
        LinearLayout.LayoutParams inputParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        inputParams.setMarginEnd((int)(8*dp));
        searchInput.setLayoutParams(inputParams);
        searchInput.setPadding((int)(4*dp), 0, 0, 0);

        btnSend = new ImageView(this);
        btnSend.setImageResource(R.drawable.ic_send);
        btnSend.setColorFilter(Color.WHITE);
        
        GradientDrawable sendBg = new GradientDrawable();
        sendBg.setColors(new int[]{
            Color.parseColor("#667EEA"),
            Color.parseColor("#764BA2")
        });
        sendBg.setGradientType(GradientDrawable.LINEAR_GRADIENT);
        sendBg.setCornerRadius(18 * dp);
        btnSend.setBackground(sendBg);
        btnSend.setElevation(4f);
        
        LinearLayout.LayoutParams sendParams = new LinearLayout.LayoutParams((int)(36*dp), (int)(36*dp));
        btnSend.setLayoutParams(sendParams);
        btnSend.setPadding((int)(10*dp), (int)(10*dp), (int)(10*dp), (int)(10*dp));

        inputContainer.addView(searchInput);
        inputContainer.addView(btnSend);

        resizeHandle = new View(this);
        GradientDrawable resizeHandleBg = new GradientDrawable();
        resizeHandleBg.setColor(Color.parseColor("#40000000"));
        resizeHandleBg.setCornerRadius(6 * dp);
        resizeHandle.setBackground(resizeHandleBg);
        
        LinearLayout.LayoutParams resizeParams = new LinearLayout.LayoutParams(
            (int)(40*dp), 
            (int)(4*dp)
        );
        resizeParams.gravity = Gravity.CENTER_HORIZONTAL;
        resizeParams.topMargin = (int)(8*dp);
        resizeHandle.setLayoutParams(resizeParams);

        spotlightView.addView(headerRow);
        spotlightView.addView(chatContainer);
        spotlightView.addView(inputContainer);
        spotlightView.addView(resizeHandle);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        spotlightParams = new WindowManager.LayoutParams(
                width,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                        | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
        );
        spotlightParams.gravity = Gravity.TOP | Gravity.START;
        spotlightParams.x = 30;
        spotlightParams.y = 150;

        setupHeaderDragging(headerRow);
        setupResizeHandle();
        setupMacButtons();
        
        btnSend.setOnClickListener(v -> {
            v.animate().scaleX(0.9f).scaleY(0.9f).setDuration(100)
                .withEndAction(() -> v.animate().scaleX(1f).scaleY(1f).setDuration(100).start())
                .start();
            
            String query = searchInput.getText().toString().trim();
            if (!query.isEmpty()) {
                sendMessage(query);
                searchInput.setText("");
            } else {
                Toast.makeText(this, "Type something first", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private View createMacButton(int color) {
        View button = new View(this);
        GradientDrawable bg = new GradientDrawable();
        bg.setShape(GradientDrawable.OVAL);
        bg.setColor(color);
        bg.setStroke((int)(0.5f * getResources().getDisplayMetrics().density), Color.parseColor("#20000000"));
        button.setBackground(bg);
        return button;
    }

    private void setupMacButtons() {
        btnClose.setOnClickListener(v -> {
            v.animate().scaleX(0.8f).scaleY(0.8f).setDuration(100)
                .withEndAction(() -> {
                    v.animate().scaleX(1f).scaleY(1f).setDuration(100).start();
                    hideSpotlight();
                })
                .start();
        });
        
        btnMinimize.setOnClickListener(v -> {
            v.animate().scaleX(0.8f).scaleY(0.8f).setDuration(100)
                .withEndAction(() -> {
                    v.animate().scaleX(1f).scaleY(1f).setDuration(100).start();
                    minimizeChat();
                })
                .start();
        });
        
        btnMaximize.setOnClickListener(v -> {
            v.animate().scaleX(0.8f).scaleY(0.8f).setDuration(100)
                .withEndAction(() -> {
                    v.animate().scaleX(1f).scaleY(1f).setDuration(100).start();
                    maximizeToApp();
                })
                .start();
        });
    }

    private void minimizeChat() {
        try {
            if (isSpotlightVisible && spotlightView != null) {
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) {
                    imm.hideSoftInputFromWindow(searchInput.getWindowToken(), 0);
                }
                
                spotlightView.animate()
                    .alpha(0f)
                    .scaleX(0.9f)
                    .scaleY(0.9f)
                    .setDuration(200)
                    .withEndAction(() -> {
                        windowManager.removeView(spotlightView);
                        isSpotlightVisible = false;
                        searchInput.setText("");
                    })
                    .start();
                
                Toast.makeText(this, "Chat minimized", Toast.LENGTH_SHORT).show();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error minimizing", e);
        }
    }

    private void maximizeToApp() {
        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            
            ArrayList<String> messages = new ArrayList<>();
            ArrayList<Boolean> isUserList = new ArrayList<>();
            ArrayList<String> timestamps = new ArrayList<>();
            
            for (ChatMessage msg : chatMessages) {
                messages.add(msg.message);
                isUserList.add(msg.isUser);
                timestamps.add(msg.timestamp);
            }
            
            intent.putStringArrayListExtra("chat_messages", messages);
            intent.putExtra("is_user", isUserList.toArray(new Boolean[0]));
            intent.putStringArrayListExtra("timestamps", timestamps);
            
            startActivity(intent);
            minimizeChat();
            
            Toast.makeText(this, "Opening in app...", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Log.e(TAG, "Error maximizing to app", e);
            Toast.makeText(this, "Error opening app", Toast.LENGTH_SHORT).show();
        }
    }

    private void setupHeaderDragging(LinearLayout headerRow) {
        headerRow.setOnTouchListener(new View.OnTouchListener() {
            private float initialTouchX, initialTouchY;
            private int initialX, initialY;
            private boolean isDragging = false;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        initialX = spotlightParams.x;
                        initialY = spotlightParams.y;
                        isDragging = false;
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        float dx = event.getRawX() - initialTouchX;
                        float dy = event.getRawY() - initialTouchY;
                        
                        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
                            isDragging = true;
                        }
                        
                        if (isDragging) {
                            int newX = initialX + (int) dx;
                            int newY = initialY + (int) dy;
                            
                            int chatWidth = spotlightView.getWidth() > 0 ? spotlightView.getWidth() : spotlightParams.width;
                            int chatHeight = spotlightView.getHeight() > 0 ? spotlightView.getHeight() : (int)(400 * getResources().getDisplayMetrics().density);
                            
                            newX = Math.max(0, Math.min(newX, screenWidth - chatWidth));
                            newY = Math.max(0, Math.min(newY, screenHeight - chatHeight));
                            
                            spotlightParams.x = newX;
                            spotlightParams.y = newY;
                            windowManager.updateViewLayout(spotlightView, spotlightParams);
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        if (!isDragging) {
                            return false;
                        }
                        isDragging = false;
                        return true;
                }
                return false;
            }
        });
    }

    private void setupResizeHandle() {
        resizeHandle.setOnTouchListener(new View.OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        resizeInitialTouchX = event.getRawX();
                        resizeInitialTouchY = event.getRawY();
                        resizeInitialWidth = spotlightParams.width;
                        resizeInitialHeight = spotlightView.getHeight();
                        isResizing = true;
                        return true;

                    case MotionEvent.ACTION_MOVE:
                        if (isResizing) {
                            float dx = event.getRawX() - resizeInitialTouchX;
                            float dy = event.getRawY() - resizeInitialTouchY;
                            
                            int newWidth = (int) (resizeInitialWidth + dx);
                            int newHeight = (int) (resizeInitialHeight + dy);
                            
                            newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
                            
                            spotlightParams.width = newWidth;
                            
                            if (isExpanded && chatRecyclerView != null) {
                                newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));
                                ViewGroup.LayoutParams chatParams = chatRecyclerView.getLayoutParams();
                                chatParams.height = newHeight;
                                chatRecyclerView.setLayoutParams(chatParams);
                            }
                            
                            windowManager.updateViewLayout(spotlightView, spotlightParams);
                        }
                        return true;

                    case MotionEvent.ACTION_UP:
                        isResizing = false;
                        return true;
                }
                return false;
            }
        });
    }

    private void sendMessage(String message) {
        if (!isExpanded) {
            expandChat();
        }
        
        addUserMessage(message, "Just now");
        showTypingIndicator();
        
        apiClient.sendMessage(message, new AIApiClient.Callback<String>() {
            @Override
            public void onSuccess(String response) {
                handler.post(() -> {
                    hideTypingIndicator();
                    addAIMessage(response, "Just now");
                });
            }

            @Override
            public void onError(String error) {
                handler.post(() -> {
                    hideTypingIndicator();
                    addAIMessage("⚠️ Error: " + error, "Just now");
                });
            }
        });
    }

    private void expandChat() {
        isExpanded = true;
        chatContainer.setVisibility(View.VISIBLE);
        chatContainer.setAlpha(0f);
        chatContainer.setScaleY(0.8f);
        chatContainer.animate()
            .alpha(1f)
            .scaleY(1f)
            .setDuration(250)
            .start();
    }

    private void addUserMessage(String message, String timestamp) {
        ChatMessage chatMessage = new ChatMessage(message, true, timestamp);
        chatMessages.add(chatMessage);
        chatAdapter.notifyItemInserted(chatMessages.size() - 1);
        
        handler.postDelayed(() -> {
            chatRecyclerView.smoothScrollToPosition(chatMessages.size() - 1);
        }, 100);
    }

    private void addAIMessage(String message, String timestamp) {
        ChatMessage chatMessage = new ChatMessage(message, false, timestamp);
        chatMessages.add(chatMessage);
        chatAdapter.notifyItemInserted(chatMessages.size() - 1);
        
        handler.postDelayed(() -> {
            chatRecyclerView.smoothScrollToPosition(chatMessages.size() - 1);
        }, 100);
    }

    private void showTypingIndicator() {
        typingIndicatorContainer.setVisibility(View.VISIBLE);
        typingIndicatorContainer.setAlpha(0f);
        typingIndicatorContainer.animate().alpha(1f).setDuration(200).start();
        animateTypingDots();
    }

    private void hideTypingIndicator() {
        typingIndicatorContainer.animate().alpha(0f).setDuration(200)
            .withEndAction(() -> typingIndicatorContainer.setVisibility(View.GONE))
            .start();
    }

    private void animateTypingDots() {
        typingDots1.animate().alpha(0.3f).setDuration(300).start();
        typingDots2.animate().alpha(0.3f).setDuration(300).setStartDelay(100).start();
        typingDots3.animate().alpha(0.3f).setDuration(300).setStartDelay(200).start();
        
        handler.postDelayed(() -> {
            typingDots1.animate().alpha(1f).setDuration(300).start();
            typingDots2.animate().alpha(1f).setDuration(300).setStartDelay(100).start();
            typingDots3.animate().alpha(1f).setDuration(300).setStartDelay(200).start();
        }, 600);
        
        if (typingIndicatorContainer.getVisibility() == View.VISIBLE) {
            handler.postDelayed(this::animateTypingDots, 1200);
        }
    }

    private void toggleSpotlight() {
        if (isSpotlightVisible) {
            hideSpotlight();
        } else {
            showSpotlight();
        }
    }

    private void showSpotlight() {
        try {
            if (!isSpotlightVisible && spotlightView != null) {
                spotlightView.setAlpha(0f);
                spotlightView.setScaleX(0.9f);
                spotlightView.setScaleY(0.9f);
                
                windowManager.addView(spotlightView, spotlightParams);
                isSpotlightVisible = true;
                
                spotlightView.animate()
                    .alpha(1f)
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(250)
                    .start();
                
                handler.postDelayed(() -> {
                    searchInput.requestFocus();
                    InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                    if (imm != null) {
                        imm.showSoftInput(searchInput, InputMethodManager.SHOW_IMPLICIT);
                    }
                }, 200);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error showing", e);
        }
    }

    private void hideSpotlight() {
        try {
            if (isSpotlightVisible && spotlightView != null) {
                handler.removeCallbacksAndMessages(null);
                
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) {
                    imm.hideSoftInputFromWindow(searchInput.getWindowToken(), 0);
                }
                
                spotlightView.animate()
                    .alpha(0f)
                    .scaleX(0.9f)
                    .scaleY(0.9f)
                    .setDuration(200)
                    .withEndAction(() -> {
                        windowManager.removeView(spotlightView);
                        isSpotlightVisible = false;
                        searchInput.setText("");
                        
                        chatContainer.setVisibility(View.GONE);
                        isExpanded = false;
                        chatMessages.clear();
                        chatAdapter.notifyDataSetChanged();
                    })
                    .start();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error hiding", e);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        try {
            handler.removeCallbacksAndMessages(null);
            
            if (apiClient != null) {
                apiClient.shutdown();
            }
            
            hideSpotlight();
            if (buttonContainer != null) {
                windowManager.removeView(buttonContainer);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error", e);
        }
        instance = null;
    }
}