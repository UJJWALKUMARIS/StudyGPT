// ================= CONFIG =================
const API_KEY = "YOUR_API_KEY"; // replace with your Gemini key (better use backend for security!)
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
const voiceBtn = document.getElementById("voiceBtn"); // 🎤 new voice button
const stopVoiceBtn = document.getElementById("stopVoiceBtn"); // ⏹️ stop voice

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

  let contentHTML = marked.parse(text);

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

// ================= SPEECH =================
let recognition;
if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-IN";
}

function speak(text) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-IN";
  utter.rate = 1;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

// ================= GENERATE AI RESPONSE =================
async function generateResponse(aiChatBox, message) {
  const textEl = aiChatBox.querySelector(".ai-chat-area");
  const conv = conversations.find((c) => c.id === selectedConversationId);
  if (!conv) return;

  const contents = conv.messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));

  contents.push({
    role: "user",
    parts: [{ text: message.text }],
  });

  if (message.file?.data) {
    contents[contents.length - 1].parts.push({
      inline_data: {
        mime_type: message.file.mime_type,
        data: message.file.data,
      },
    });
  }

  try {
    let res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    });
    let data = await res.json();

    let apiResponse =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";

    // Save AI message
    const aiMessage = { role: "model", text: apiResponse };
    conv.messages.push(aiMessage);
    saveConversations();

    typeText(textEl, apiResponse, 20);
    speak(apiResponse); // 🎤 voice reply
  } catch (err) {
    console.error(err);
    textEl.innerHTML = "⚠️ Error fetching response.";
  }
}

// ================= TYPING EFFECT =================
function typeText(element, text, speed = 20) {
  let i = 0;
  element.innerHTML = "";
  const interval = setInterval(() => {
    element.innerHTML += text.charAt(i);
    i++;
    if (i >= text.length) clearInterval(interval);
  }, speed);
}

// ================= HANDLE USER MESSAGE =================
function handleUserMessage(messageText) {
  if (!messageText) return;

  let conv = conversations.find((c) => c.id === selectedConversationId);
  if (!conv) {
    createNewConversation();
    conv = conversations.find((c) => c.id === selectedConversationId);
  }

  const userMessage = { role: "user", text: messageText, file: null };
  conv.messages.push(userMessage);
  saveConversations();

  addMessageToChat(userMessage.text, "user");

  const aiChatBox = document.createElement("div");
  aiChatBox.className = "ai-chat-box";
  aiChatBox.innerHTML = `
    <img src="ai.avif" alt="" width="8%" />
    <div class="ai-chat-area">
      <img src="loding.gif" alt="" class="loding" width="50px" />
    </div>`;
  chatContainer.appendChild(aiChatBox);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  generateResponse(aiChatBox, userMessage);
}

// ================= USER IMAGE FILE =================
let user = { file: { mime_type: null, data: null } };
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result.split(",")[1];
    user.file = { mime_type: file.type, data: base64 };
    image.src = `data:${user.file.mime_type};base64,${user.file.data}`;
    image.classList.add("size");
  };
  reader.readAsDataURL(file);
});
imageBtn.addEventListener("click", () => imageInput.click());

// ================= EVENT LISTENERS =================
submitBtn.addEventListener("click", () =>
  handleUserMessage(prompt.value.trim())
);
prompt.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleUserMessage(prompt.value.trim());
    prompt.value = "";
  }
});

newConversationBtn.addEventListener("click", createNewConversation);
clearChatBtn.addEventListener("click", () => {
  if (!selectedConversationId) return;
  conversations = conversations.filter((c) => c.id !== selectedConversationId);
  selectedConversationId = conversations.length ? conversations[0].id : null;
  saveConversations();
  saveSelectedConversation();
  renderSidebar();
  renderConversation();
});

// ================= VOICE =================
if (recognition) {
  voiceBtn.addEventListener("click", () => {
    recognition.start();
  });

  stopVoiceBtn.addEventListener("click", () => {
    recognition.stop();
    window.speechSynthesis.cancel();
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    handleUserMessage(transcript);
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e.error);
    speak("I couldn't understand. Please try again.");
  };
}

// ================= INITIALIZE =================
if (!conversations.length) {
  createNewConversation();
} else {
  renderSidebar();
  renderConversation();
}
