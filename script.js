// ================= CONFIG =================
const API_KEY = "AIzaSyBCrWDt-mjhXn2a5csnWNdemlyH3LVRWok"; // replace with your Gemini API key
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
  avatar.src = role === "user" ? "user.png" : "ai.avif"; // ⚠️ add user.png image
  box.appendChild(avatar);

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  // Parse markdown + KaTeX
  let contentHTML = marked.parse(text);
  try {
    bubble.innerHTML = contentHTML;
    renderMathInElement(bubble, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
    });
  } catch {
    bubble.innerHTML = contentHTML;
  }

  // Attach image if present
  if (file) {
    const imgEl = document.createElement("img");
    imgEl.src = `data:${file.mime_type};base64,${file.data}`;
    imgEl.className = "chooseimg";
    bubble.appendChild(imgEl);
  }

  // ✅ Add copy button under AI responses
  if (role !== "user") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "ai-copy";
    copyBtn.textContent = "Copy response";
    copyBtn.addEventListener("click", () => {
      const plain = bubble.innerText; // only text (no HTML tags)
      navigator.clipboard.writeText(plain).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy response"), 1500);
      });
    });
    bubble.appendChild(copyBtn);
  }

  box.appendChild(bubble);
  chatContainer.appendChild(box);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ================= GENERATE AI RESPONSE =================
async function generateResponse(aiChatBox, message) {
  const textEl = aiChatBox.querySelector(".bubble");
  const conv = conversations.find((c) => c.id === selectedConversationId);
  if (!conv) return;

  const parts = conv.messages.map((m) => ({
    text: `${m.role === "user" ? "User" : "AI"}: ${m.text}`,
  }));
  if (message.file?.data) parts.push({ inline_data: message.file });

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    });
    const data = await res.json();

    let apiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ No response";

    // quick custom replies
    const userText = message.text.toLowerCase();
    if (userText.includes("hello")) apiResponse = "Hello, how can I help you?";
    if (userText.includes("who are you")) apiResponse = "I am StudyGPT, created by Ujjwal Kumar.";

    const aiMessage = { role: "ai", text: apiResponse };
    conv.messages.push(aiMessage);
    saveConversations();

    // ✅ Render AI answer with markdown & KaTeX
    let contentHTML = marked.parse(apiResponse);
    try {
      textEl.innerHTML = contentHTML;
      renderMathInElement(textEl, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
      });
    } catch {
      textEl.innerHTML = contentHTML;
    }

    // ✅ Add copy button below
    const copyBtn = document.createElement("button");
    copyBtn.className = "ai-copy";
    copyBtn.textContent = "Copy response";
    copyBtn.addEventListener("click", () => {
      const plain = textEl.innerText;
      navigator.clipboard.writeText(plain).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy response"), 1500);
      });
    });
    textEl.appendChild(copyBtn);
  } catch (e) {
    console.error(e);
    textEl.innerHTML = "⚠️ Error fetching response.";
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

  let conv = conversations.find((c) => c.id === selectedConversationId);
  if (!conv) {
    createNewConversation();
    conv = conversations.find((c) => c.id === selectedConversationId);
  }

  const userMessage = {
    role: "user",
    text: messageText,
    file: user.file.data ? { mime_type: user.file.mime_type, data: user.file.data } : null,
  };
  conv.messages.push(userMessage);
  saveConversations();

  addMessageToChat(userMessage.text, "user", userMessage.file);

  prompt.value = "";
  user.file = { mime_type: null, data: null };
  image.src = "img.svg";
  image.classList.remove("size");

  // AI typing placeholder
  const aiChatBox = document.createElement("div");
  aiChatBox.className = "ai-chat-box";
  aiChatBox.innerHTML = `
    <img src="ai.avif" class="chat-avatar" />
    <div class="bubble"><img src="loding.gif" alt="loading" width="40"></div>
  `;
  chatContainer.appendChild(aiChatBox);
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });

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
    image.src = `data:${user.file.mime_type};base64,${user.file.data}`;
    image.classList.add("size");
  };
  reader.readAsDataURL(file);
});
imageBtn.addEventListener("click", () => imageInput.click());

// ================= EVENT LISTENERS =================
submitBtn.addEventListener("click", handleUserMessage);
prompt.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); handleUserMessage(); } });
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

// ================= INIT =================
if (!conversations.length) createNewConversation(); else { renderSidebar(); renderConversation(); }

// ================= DARK MODE =================
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  darkToggle.textContent = "🌞";
}
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  if (document.body.classList.contains("dark")) {
    darkToggle.textContent = "🌞"; localStorage.setItem("theme", "dark");
  } else {
    darkToggle.textContent = "🌙"; localStorage.setItem("theme", "light");
  }
});

// ================= SIDEBAR TOGGLE (Mobile) =================
menuToggle.addEventListener("click", () => {
  document.querySelector(".sidebar").classList.toggle("active");
  overlay.classList.toggle("active");
});
overlay.addEventListener("click", () => {
  document.querySelector(".sidebar").classList.remove("active");
  overlay.classList.remove("active");
});







