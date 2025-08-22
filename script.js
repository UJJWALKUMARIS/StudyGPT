// ================= CONFIG =================
// Replace with your real key. Consider loading from server/env for security.
const API_KEY = "API_KEY";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

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
// Header controls
const menuToggle = document.getElementById("menuToggle");
const overlay = document.getElementById("overlay");
const darkToggle = document.getElementById("darkModeToggle");

// ================= GLOBALS =================
let conversations = JSON.parse(localStorage.getItem("conversations")) || [];
let selectedConversationId = localStorage.getItem("selectedConversationId") || null;

if (!selectedConversationId && conversations.length) {
  selectedConversationId = conversations[0].id;
}

// ================= THEME =================
(function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.body.classList.add("dark");
    if (darkToggle) darkToggle.textContent = "🌞";
  } else {
    if (darkToggle) darkToggle.textContent = "🌙";
  }
})();

if (darkToggle) {
  darkToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const isDark = document.body.classList.contains("dark");
    darkToggle.textContent = isDark ? "🌞" : "🌙";
    localStorage.setItem("theme", isDark ? "dark" : "light");
  });
}

// ================= HELPERS =================
function saveConversations() {
  localStorage.setItem("conversations", JSON.stringify(conversations));
}
function saveSelectedConversation() {
  localStorage.setItem("selectedConversationId", selectedConversationId);
}

function createNewConversation() {
  const newConv = {
    id: Date.now().toString(),
    title: "New Conversation",
    messages: [],
  };
  conversations.unshift(newConv);
  selectedConversationId = newConv.id;
  saveConversations();
  saveSelectedConversation();
  renderSidebar();
  renderConversation();
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
      // Close sidebar on mobile tap
      sidebarEl.classList.remove("active");
      overlay.classList.remove("active");
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

  conv.messages.forEach((msg) => {
    addMessageToChat(msg.text, msg.role, msg.file);
  });

  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ================= UTIL: Create avatar element =================
function makeAvatar(src, alt) {
  const img = document.createElement("img");
  img.className = "chat-avatar";
  img.src = src;
  img.alt = alt;
  return img;
}

// ================= ADD MESSAGE TO CHAT =================
function addMessageToChat(text, role, file = null) {
  const box = document.createElement("div");
  box.className = role === "user" ? "user-chat-box" : "ai-chat-box";

  // Avatars (provide your own 'user.png' or fallback emoji data URL)
  const avatarSrc = role === "user" ? "user.png" : "ai.avif";
  const avatar = makeAvatar(avatarSrc, role === "user" ? "User" : "AI");

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  // Copy button for full AI responses
  if (role !== "user") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "ai-copy";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => {
      const plain = bubble.innerText; // copies without HTML
      navigator.clipboard.writeText(plain).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
      });
    });
    bubble.appendChild(copyBtn);
  }

  // Render Markdown + KaTeX
  let contentHTML = marked.parse(text || "");
  const holder = document.createElement("div");
  holder.innerHTML = contentHTML;

  try {
    renderMathInElement(holder, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
    });
  } catch { /* ignore */ }

  bubble.appendChild(holder);

  // Attached image preview
  if (file) {
    const imgEl = document.createElement("img");
    imgEl.src = `data:${file.mime_type};base64,${file.data}`;
    imgEl.className = "chooseimg";
    imgEl.style.maxWidth = "240px";
    imgEl.style.borderRadius = "10px";
    imgEl.style.marginTop = "8px";
    bubble.appendChild(imgEl);
  }

  box.appendChild(avatar);
  box.appendChild(bubble);
  chatContainer.appendChild(box);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ================= GENERATE AI RESPONSE =================
async function generateResponse(aiChatBox, message) {
  const conv = conversations.find((c) => c.id === selectedConversationId);
  if (!conv) return;

  const parts = conv.messages.map((m) => ({
    text: `${m.role === "user" ? "User" : "AI"}: ${m.text}`,
  }));

  if (message.file?.data) {
    parts.push({ inline_data: message.file });
  }

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  };

  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    let apiResponse =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    // Simple custom replies
    const userText = message.text.toLowerCase();
    if (userText.includes("hello")) {
      apiResponse = "Hello, how can I help you?";
    } else if (
      userText.includes("who are you") ||
      userText.includes("who made you") ||
      userText.includes("who created you") ||
      userText.includes("who is your founder") ||
      userText.includes("who is your creator") ||
      userText.includes("founder")
    ) {
      apiResponse = "I am StudyGPT, created by Ujjwal Kumar.";
    }

    const aiMessage = { role: "ai", text: apiResponse };
    conv.messages.push(aiMessage);
    saveConversations();

    // Render to chat
    addMessageToChat(apiResponse, "ai", null);
  } catch (error) {
    console.error(error);
    addMessageToChat("⚠️ Error fetching response.", "ai");
  } finally {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
    image.src = "img.svg";
    image.classList.remove("size");
  }
}

// ================= HANDLE USER MESSAGE =================
function handleUserMessage() {
  const messageText = prompt.value.trim();
  if (!messageText) return;

  const conv = conversations.find((c) => c.id === selectedConversationId);
  if (!conv) {
    createNewConversation();
    return;
  }

  const userMessage = {
    role: "user",
    text: messageText,
    file: user.file.data
      ? { mime_type: user.file.mime_type, data: user.file.data }
      : null,
  };
  conv.messages.push(userMessage);
  saveConversations();

  addMessageToChat(userMessage.text, "user", userMessage.file);

  prompt.value = "";
  user.file.data = null;
  user.file.mime_type = null;
  image.src = "img.svg";
  image.classList.remove("size");

  // Generate AI reply
  generateResponse(null, userMessage);
}

// ================= USER IMAGE FILE DATA =================
let user = { file: { mime_type: null, data: null } };

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64String = e.target.result.split(",")[1];
    user.file = { mime_type: file.type, data: base64String };
    image.src = `data:${user.file.mime_type};base64,${user.file.data}`;
    image.classList.add("size");
  };
  reader.readAsDataURL(file);
});

imageBtn.addEventListener("click", () => {
  imageInput.click();
});

// ================= EVENT LISTENERS =================
submitBtn.addEventListener("click", handleUserMessage);
prompt.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleUserMessage();
  }
});
newConversationBtn.addEventListener("click", createNewConversation);

clearChatBtn.addEventListener("click", () => {
  if (!selectedConversationId) return;
  const idx = conversations.findIndex((c) => c.id === selectedConversationId);
  if (idx !== -1) {
    conversations.splice(idx, 1);
    selectedConversationId = conversations.length ? conversations[0].id : null;
    saveConversations();
    saveSelectedConversation();
    renderSidebar();
    renderConversation();
  }
});

// ================= INITIALIZE =================
if (!conversations.length) {
  createNewConversation();
} else {
  renderSidebar();
  renderConversation();
}

// ================= SIDEBAR TOGGLE (Mobile) =================
const sidebarEl = document.querySelector(".sidebar");

menuToggle.addEventListener("click", () => {
  sidebarEl.classList.toggle("active");
  overlay.classList.toggle("active");
});

overlay.addEventListener("click", () => {
  sidebarEl.classList.remove("active");
  overlay.classList.remove("active");
});

