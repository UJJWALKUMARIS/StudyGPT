let prompt = document.querySelector('#prompt');
let submitbut = document.querySelector('#submit');
let chatContainer = document.querySelector('.chat-container');
let imagebut = document.querySelector('#image');
let image = document.querySelector('#image img');
let imageinput = document.querySelector("#image input");

const Api_Url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyD0_2tZRS847JSffiZ6m5RwxX2Jc3c57gQ";

// Store all chat history
let conversation = [];

let user = {
    userdata: null,
    file: {
        mime_type: null,
        data: null
    }
};

// ==================== GENERATE AI RESPONSE ====================
async function generatResponse(aiChatBox) {
    let text = aiChatBox.querySelector(".ai-chat-area");

    // Build full conversation
    let parts = conversation.map(m => ({ text: `${m.role === "user" ? "User" : "AI"}: ${m.text}` }));
    if (user.file.data) {
        parts.push({ inline_data: user.file });
    }

    let RequestOption = {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "contents": [
                { "parts": parts }
            ]
        })
    };

    try {
        let response = await fetch(Api_Url, RequestOption);
        let data = await response.json();

        let apiResponse = data.candidates[0].content.parts[0].text
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .trim();

        // Custom responses (you can add more)
        if (user.userdata.toLowerCase().includes("hello")) {
            apiResponse = `Hello, how can I help you?`;
        } else if (
            user.userdata.toLowerCase().includes("who are you") ||
            user.userdata.toLowerCase().includes("who made you") ||
            user.userdata.toLowerCase().includes("who created you")
        ) {
            apiResponse = `I am StudyGPT, created by Ujjwal Kumar.`;
        }

        text.innerHTML = apiResponse;
        conversation.push({ role: "ai", text: apiResponse }); // Save AI response
    } catch (error) {
        console.log(error);
        text.innerHTML = "Error fetching response.";
    } finally {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });
        image.src = `img.svg`;
        image.classList.remove("size");
        user.file.data = null;
        user.file.mime_type = null;
    }
}

// ==================== CREATE CHAT BOX ====================
function createChatBox(html, classes) {
    let div = document.createElement("div");
    div.innerHTML = html;
    div.classList.add(classes);
    return div;
}

// ==================== HANDLE USER MESSAGE ====================
function hendlechatResponce(message) {
    if (!message.trim()) return;

    user.userdata = message;
    conversation.push({ role: "user", text: message }); // Save user message

    let html = ` <img src="user.png" alt="" id="userImage" width="7%">
            <div class="user-chat-area">
                    ${user.userdata}
                    ${user.file.data ? `<img src="data:${user.file.mime_type};base64,${user.file.data}" class="chooseimg"/>` : ""}
            </div>`;
    prompt.value = "";
    let userChatBox = createChatBox(html, "user-chat-box");
    chatContainer.appendChild(userChatBox);
    chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: "smooth" });

    setTimeout(() => {
        let html = `<img src="ai.avif" alt="" id="aiImage" width="8%">
            <div class="ai-chat-area">
            <img src="loding.gif" alt="" class="loding" width="50px">
            </div>`;
        let aiChatBox = createChatBox(html, "ai-chat-box");
        chatContainer.appendChild(aiChatBox);
        generatResponse(aiChatBox);
    }, 300);
}

// ==================== EVENT LISTENERS ====================
prompt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") hendlechatResponce(prompt.value);
});
submitbut.addEventListener("click", () => hendlechatResponce(prompt.value));

imageinput.addEventListener("change", () => {
    const file = imageinput.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = (e) => {
        let base64strin = e.target.result.split(",")[1];
        user.file = { mime_type: file.type, data: base64strin };
        image.src = `data:${user.file.mime_type};base64,${user.file.data}`;
        image.classList.add("size");
    };
    reader.readAsDataURL(file);
});

imagebut.addEventListener("click", () => {
    imagebut.querySelector("input").click();
});
