// ================= CONFIG =================
const API_KEY = "AIzaSyD0_2tZRS847JSffiZ6m5RwxX2Jc3c57gQ";
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

// ================= GLOBALS =================
let conversations = JSON.parse(localStorage.getItem("conversations")) || [];
let selectedConversationId = localStorage.getItem("selectedConversationId") || null;

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

// ================= ADD MESSAGE TO CHAT =================
function addMessageToChat(text, role, file = null) {
  const box = document.createElement("div");
  box.className = role === "user" ? "user-chat-box" : "ai-chat-box";

  const area = document.createElement("div");
  area.className = role === "user" ? "user-chat-area" : "ai-chat-area";

  let contentHTML = marked.parse(text); // Markdown parsing

  // Render KaTeX math if present
  try {
    area.innerHTML = contentHTML;
    renderMathInElement(area, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
    });
  } catch {
    area.innerHTML = contentHTML;
  }

  // Append image if available
  if (file) {
    const imgEl = document.createElement("img");
    imgEl.src = `data:${file.mime_type};base64,${file.data}`;
    imgEl.className = "chooseimg";
    area.appendChild(imgEl);
  }

  box.appendChild(area);
  chatContainer.appendChild(box);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ================= GENERATE AI RESPONSE =================
async function generateResponse(aiChatBox, message) {
  const textEl = aiChatBox.querySelector(".ai-chat-area");

  // Find current conversation
  const conv = conversations.find((c) => c.id === selectedConversationId);
  if (!conv) return;

  // Build conversation history for API
  const parts = conv.messages.map((m) => ({
    text: `${m.role === "user" ? "User" : "AI"}: ${m.text}`,
  }));

  // Add image data if present on last message
  if (message.file?.data) {
    parts.push({ inline_data: message.file });
  }

  // Prepare request
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
    }),
  };

  try {
    let response = await fetch(API_URL, requestOptions);
    let data = await response.json();

    let apiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    // Custom canned responses
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

    // Save AI message
    const aiMessage = { role: "ai", text: apiResponse };
    conv.messages.push(aiMessage);
    saveConversations();

    // Show typing effect
    typeText(textEl, apiResponse, 20);
  } catch (error) {
    console.error(error);
    textEl.innerHTML = "⚠️ Error fetching response.";
  } finally {
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
    image.src = "img.svg";
    image.classList.remove("size");
  }
}

// ================= TYPING EFFECT =================
function typeText(element, text, speed = 20) {
  let index = 0;
  element.innerHTML = "";

  const interval = setInterval(() => {
    element.innerHTML += text.charAt(index);
    index++;
    if (index >= text.length) clearInterval(interval);
  }, speed);
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

  // Save user message
  const userMessage = {
    role: "user",
    text: messageText,
    file: user.file.data
      ? { mime_type: user.file.mime_type, data: user.file.data }
      : null,
  };
  conv.messages.push(userMessage);
  saveConversations();

  // Add user message box
  addMessageToChat(userMessage.text, "user", userMessage.file);

  prompt.value = "";
  user.file.data = null;
  user.file.mime_type = null;
  image.src = "img.svg";
  image.classList.remove("size");

  // Add AI chat box placeholder with loading gif
  const aiChatBox = document.createElement("div");
  aiChatBox.className = "ai-chat-box";
  aiChatBox.innerHTML = `
    <img src="ai.avif" alt="" id="aiImage" width="8%" />
    <div class="ai-chat-area">
      <img src="loding.gif" alt="" class="loding" width="50px" />
    </div>
  `;
  chatContainer.appendChild(aiChatBox);
  chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });

  generateResponse(aiChatBox, userMessage);
}

// ================= USER IMAGE FILE DATA =================
let user = {
  file: { mime_type: null, data: null },
};

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

  const convIndex = conversations.findIndex((c) => c.id === selectedConversationId);
  if (convIndex !== -1) {
    conversations.splice(convIndex, 1);
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
