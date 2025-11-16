// ================= CONFIG =================
const API_KEY = "AIzaSyBCrWDt-mjhXn2a5csnWNdemlyH3LVRWok";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// ================= DOM ELEMENTS =================
const prompt = document.getElementById("prompt");
const submitBtn = document.getElementById("submit");
const chatContainer = document.getElementById("chat-container");
const imageBtn = document.getElementById("image");
const imageInput = imageBtn.querySelector("input");
const image = imageBtn.querySelector("img");
const sidebar = document.getElementById("sidebar");
const newConversationBtn = document.getElementById("newConversationBtn");
const clearChatBtn = document.getElementById("clearChat");
const darkToggle = document.getElementById("darkModeToggle");
const menuToggle = document.getElementById("menuToggle");
const overlay = document.getElementById("overlay");

// ================= GLOBALS =================
let conversations = JSON.parse(localStorage.getItem("conversations")) || [];
let selectedConversationId = localStorage.getItem("selectedConversationId") || null;
let user = { file: { mime_type: null, data: null } };

if (!selectedConversationId && conversations.length) {
    selectedConversationId = conversations[0].id;
}

// ================= HELPERS =================
function saveConversations() {
    localStorage.setItem("conversations", JSON.stringify(conversations));
}
function saveSelectedConversation() {
    localStorage.setItem("selectedConversationId", selectedConversationId);
}

function createNewConversation() {
    const newConv = { id: Date.now().toString(), title: "New Conversation", messages: [] };
    conversations.unshift(newConv);
    selectedConversationId = newConv.id;
    saveConversations();
    saveSelectedConversation();
    renderSidebar();
    renderConversation();
}

/**
 * Updates the conversation title based on the first user message.
 * @param {string} conversationId The ID of the conversation to update.
 * @param {string} text The text of the first user message.
 */
function updateConversationTitle(conversationId, text) {
    const conv = conversations.find(c => c.id === conversationId);
    if (conv && conv.title === "New Conversation") {
        conv.title = text.substring(0, 30) + (text.length > 30 ? "..." : "");
        saveConversations();
        renderSidebar(); // Re-render to show the new title
    }
}

// ================= RENDER SIDEBAR =================
function renderSidebar() {
    sidebar.innerHTML = "";
    conversations.forEach((conv) => {
        const convDiv = document.createElement("div");
        convDiv.className = "sidebar-chat";
        if (conv.id === selectedConversationId) convDiv.classList.add("selected");
        convDiv.textContent = conv.title;
        convDiv.onclick = () => {
            selectedConversationId = conv.id;
            saveSelectedConversation();
            renderSidebar();
            renderConversation();
        };
        sidebar.appendChild(convDiv);
    });
}

// ================= RENDER CONVERSATION =================
function renderConversation() {
    chatContainer.innerHTML = "";
    if (!selectedConversationId) return;
    const conv = conversations.find((c) => c.id === selectedConversationId);
    if (!conv) return;
    conv.messages.forEach((msg) => addMessageToChat(msg.text, msg.role, msg.file));
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ================= ADD MESSAGE TO CHAT =================
function addMessageToChat(text, role, file = null) {
    const box = document.createElement("div");
    box.className = role === "user" ? "user-chat-box" : "ai-chat-box";

    const avatar = document.createElement("img");
    avatar.className = "chat-avatar";
    avatar.src = role === "user" ? "user.png" : "ai.avif";
    box.appendChild(avatar);

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    // Handle Image Display for User Message
    if (file) {
        const imgEl = document.createElement("img");
        imgEl.src = `data:${file.mime_type};base64,${file.data}`;
        imgEl.className = "chooseimg";
        bubble.appendChild(imgEl);
    }
    
    // Add text content
    let contentHTML = marked.parse(text);
    bubble.innerHTML += contentHTML; // Append content after image (if any)

    // Render Math (Katex)
    try {
        renderMathInElement(bubble, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false },
                { left: "\\(", right: "\\)", display: false },
                { left: "\\[", right: "\\]", display: true }
            ]
        });
    } catch (e) {
        console.warn("Katex rendering failed:", e);
    }

    // Add Copy Button for AI Response
    if (role !== "user") {
        const copyBtn = document.createElement("button");
        copyBtn.className = "ai-copy";
        copyBtn.textContent = "Copy response";
        copyBtn.onclick = () => {
            // Use innerText to get the text without HTML/Katex artifacts
            const textToCopy = bubble.innerText.replace("Copy response", "").trim(); 
            navigator.clipboard.writeText(textToCopy);
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy response"), 1500);
        };
        bubble.appendChild(copyBtn);
    }

    box.appendChild(bubble);
    chatContainer.appendChild(box);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ================= GENERATE AI RESPONSE =================
async function generateResponse(aiChatBox, userMessage) {
    const textEl = aiChatBox.querySelector(".bubble");
    const conv = conversations.find((c) => c.id === selectedConversationId);
    if (!conv) return;

    // --- FIX: Correctly format history for the Gemini API ---
    const formattedMessages = [];

    // Process all prior messages
    for (const msg of conv.messages) {
        if (msg.role === 'user' || msg.role === 'ai') {
            const parts = [{ text: msg.text }];
            // Add file data for past user messages if present (though Gemini may prefer only the last message)
            if (msg.role === 'user' && msg.file?.data) {
                parts.unshift({ inline_data: msg.file });
            }
            formattedMessages.push({
                role: msg.role === "user" ? "user" : "model",
                parts: parts
            });
        }
    }
    
    // Add the *current* user message (which is the last one in conv.messages)
    // The previous loop already added it. We just need to ensure the *very last*
    // message contains the image data if available. The current logic already 
    // puts the file data on the *userMessage* object passed to this function.

    // Remove the last message (which is the user message just added to the history)
    // to build the correct 'contents' array, and then re-add it with image parts.
    formattedMessages.pop();

    const lastUserParts = [{ text: userMessage.text }];
    if (userMessage.file?.data) {
         lastUserParts.unshift({ inline_data: userMessage.file });
    }

    formattedMessages.push({
        role: "user",
        parts: lastUserParts
    });
    // --------------------------------------------------------

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: formattedMessages })
        });

        const data = await res.json();

        // Check for error messages in the response
        if (data.error) {
            throw new Error(data.error.message || "API Error: Unknown problem.");
        }

        let apiResponse =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response received from the API.";

        // smart short custom replies
        const u = userMessage.text.toLowerCase();
        if (u === "hello") apiResponse = "Hello! 👋 How can I help you today?";
        if (u.includes("who are you"))
            apiResponse = "I am StudyGPT, created by Ujjwal Kumar 💡.";

        const aiMessage = { role: "ai", text: apiResponse };
        conv.messages.push(aiMessage);
        saveConversations();

        // Update the title if it's the first message
        updateConversationTitle(conv.id, userMessage.text);
        
        // Re-render the AI message content completely
        textEl.innerHTML = marked.parse(apiResponse);
        try {
            renderMathInElement(textEl, {
                delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false }
                ]
            });
        } catch (e) {
            console.warn("Katex rendering failed:", e);
        }

        const copyBtn = document.createElement("button");
        copyBtn.className = "ai-copy";
        copyBtn.textContent = "Copy response";
        copyBtn.onclick = () => {
             const textToCopy = textEl.innerText.replace("Copy response", "").trim(); 
            navigator.clipboard.writeText(textToCopy);
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy response"), 1500);
        };
        textEl.appendChild(copyBtn);
    } catch (e) {
        console.error("Gemini API Error:", e);
        textEl.innerHTML = `⚠️ Error: ${e.message || "Failed to contact the server."}`;
    } finally {
        chatContainer.scrollTop = chatContainer.scrollHeight;
        // Reset the image button visual
        image.src = "img.svg";
        image.classList.remove("size");
    }
}

// ================= HANDLE USER MESSAGE =================
function handleUserMessage() {
    const messageText = prompt.value.trim();
    
    // Check if there is text OR file data to send
    if (!messageText && !user.file.data) return;

    let conv = conversations.find((c) => c.id === selectedConversationId);
    if (!conv) {
        createNewConversation();
        conv = conversations.find((c) => c.id === selectedConversationId);
    }

    // Create the user message object
    const userMessage = {
        role: "user",
        text: messageText || (user.file.data ? "Image prompt" : ""), // Use "Image prompt" if only an image is sent
        file: user.file.data ? { mime_type: user.file.mime_type, data: user.file.data } : null
    };

    conv.messages.push(userMessage);
    saveConversations();

    // Render the user message
    addMessageToChat(userMessage.text, "user", userMessage.file);

    // Clear input fields and global state
    prompt.value = "";
    user.file = { mime_type: null, data: null };
    image.src = "img.svg";
    image.classList.remove("size");

    // Add loading AI box
    const aiChatBox = document.createElement("div");
    aiChatBox.className = "ai-chat-box";
    aiChatBox.innerHTML = `
        <img src="ai.avif" class="chat-avatar"/>
        <div class="bubble"><img src="loding.gif" width="40" alt="Loading..."></div>
    `;
    chatContainer.appendChild(aiChatBox);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Call the API
    generateResponse(aiChatBox, userMessage);
}

// ================= FILE UPLOAD =================
imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64String = e.target.result.split(",")[1];
        user.file = { mime_type: file.type, data: base64String };
        image.src = e.target.result;
        image.classList.add("size");
    };
    reader.readAsDataURL(file);
});

imageBtn.addEventListener("click", () => imageInput.click());

// ================= EVENT LISTENERS =================
submitBtn.addEventListener("click", handleUserMessage);
prompt.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { // Prevent submit on Shift+Enter
        e.preventDefault();
        handleUserMessage();
    }
});

newConversationBtn.addEventListener("click", createNewConversation);

clearChatBtn.addEventListener("click", () => {
    if (!selectedConversationId) return;
    
    // Find index of the conversation to delete
    const idx = conversations.findIndex((c) => c.id === selectedConversationId);
    
    if (idx !== -1) {
        // Remove the conversation
        conversations.splice(idx, 1);
        
        // Select the next conversation or null
        selectedConversationId = conversations.length ? conversations[0].id : null;
        
        saveConversations();
        saveSelectedConversation();
        renderSidebar();
        renderConversation();
        
        // If no conversations left, create a new one
        if (!conversations.length) createNewConversation();
    }
});

// ================= INIT =================
if (!conversations.length) createNewConversation();
else {
    renderSidebar();
    renderConversation();
}

// ================= DARK MODE =================
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    darkToggle.textContent = "🌞";
} else {
    // Ensure the initial state matches the light mode icon if not dark
    darkToggle.textContent = "🌙";
}

darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    if (document.body.classList.contains("dark")) {
        darkToggle.textContent = "🌞";
        localStorage.setItem("theme", "dark");
    } else {
        darkToggle.textContent = "🌙";
        localStorage.setItem("theme", "light");
    }
});

// ================= SIDEBAR TOGGLE =================
menuToggle.addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("active");
    overlay.classList.toggle("active");
});
overlay.addEventListener("click", () => {
    document.querySelector(".sidebar").classList.remove("active");
    overlay.classList.remove("active");
});
