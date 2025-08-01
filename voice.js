document.addEventListener("DOMContentLoaded", () => {
    let btn = document.querySelector("#btn");
    let content = document.querySelector("#css");
    let voice = document.querySelector("#voice");

    if (!btn) {
        console.error("Button with ID 'btn' not found! Check your HTML.");
        return;
    }

    let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";

    let isSpeechDetected = false;

    recognition.onresult = (event) => {
        let transcript = event.results[0][0].transcript.trim();
        if (transcript.length === 0) {
            speak("Please speak any text.");
        } else {
            isSpeechDetected = true;
            if (content) content.innerHTML += `<p><strong>You:</strong> ${transcript}</p>`;
            processCommand(transcript.toLowerCase());
        }
    };

    recognition.onspeechend = () => {
        if (!isSpeechDetected) {
            speak("Please speak any text.");
        }
        btn.style.display = "flex";
        voice.style.display = "none";
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        speak("I couldn't understand. Please try again.");
        btn.style.display = "flex";
        voice.style.display = "none";
    };

    btn.addEventListener("click", () => {
        window.speechSynthesis.cancel();

        isSpeechDetected = false;
        recognition.start();
        btn.style.display = "none";
        voice.style.display = "block";
    });
});

function speak(text) {
    window.speechSynthesis.cancel();

    let text_speak = new SpeechSynthesisUtterance(text);
    text_speak.rate = 1;
    text_speak.pitch = 1;
    text_speak.volume = 1;
    text_speak.lang = "en-IN";
    window.speechSynthesis.speak(text_speak);

    let content = document.querySelector("#css");
    if (content) content.innerHTML += `<p><strong>AI:</strong> ${text}</p>`;
}

async function processCommand(message) {
    let btn = document.querySelector("#btn");
    let voice = document.querySelector("#voice");

    btn.style.display = "flex";
    voice.style.display = "none";

    if (message.includes("hello") || message.includes("hey")) {
        speak("Hello, how can I help you?");
    } 
    
    else if (
        message.includes("who are you") || 
        message.includes("who made you") || 
        message.includes("who created you") || 
        message.includes("who is your creator") || 
        message.includes("what is your origin") || 
        message.includes("who developed you")
    ) {
        speak("I am StudyGPT, made by Ujjwal Kumar.");
    } 
    
    else if (message.includes("open youtube")) {
        speak("Opening YouTube");
        window.open("https://www.youtube.com", "_blank");
    } 
    
    else if (message.includes("open facebook")) {
        speak("Opening Facebook");
        window.open("https://www.facebook.com", "_blank");
    } 
    
    else if (message.includes("open google")) {
        speak("Opening Google");
        window.open("https://www.google.com", "_blank");
    }
    
    else if (message.includes("open insta") || message.includes("open instagram")) {
        speak("Opening Instagram");
        window.open("https://www.instagram.com", "_blank");
    } 
    
    else if (message.includes("what is your name")) {
        speak("My name is StudyGPT.");
    }
    
    else if (message.includes("ujjwal")) {
        speak("Yes I am made by Ujjwal kumar")
    }

    else if (
        message.includes("you fomred")||
        message.includes("formed you")||
        message.includes("you form")||
        message.includes("form you")
    ) {
        speak("I am StudyGPT, made by Ujjwal Kumar.");
    }
    
    else {
        let aiResponse = await fetchGeminiAI(message);
        speak(aiResponse);
    }
}

async function fetchGeminiAI(prompt) {
    const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyD0_2tZRS847JSffiZ6m5RwxX2Jc3c57gQ";

    let responseText = "I'm sorry, I couldn't generate a response.";

    try {
        let response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        });

        let data = await response.json();

        if (data && data.candidates && data.candidates.length > 0) {
            responseText = data.candidates[0].content.parts[0].text;
        }
    } catch (error) {
        console.error("Error fetching AI response:", error);
    }

    return responseText;
}
