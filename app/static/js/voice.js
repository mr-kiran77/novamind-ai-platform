// Voice Assistant Integration Module (Web Speech API)

const Voice = {
  recognition: null,
  isListening: false,
  synth: window.speechSynthesis || null,

  init() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = "en-US";

      this.recognition.onstart = () => {
        this.isListening = true;
        document.getElementById("assistant-voice-banner")?.classList.remove("hidden");
      };

      this.recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Voice transcript received:", transcript);
        this.stopListening();

        // Process Voice Command
        try {
          const res = await API.post(`/api/assistant/voice-command?transcript=${encodeURIComponent(transcript)}`);
          if (res.action === "navigate") {
            navigate(res.target);
          } else if (res.action === "open_modal") {
            openCaptureModal();
          } else if (res.action === "open_assistant") {
            if (!Assistant.isOpen) Assistant.toggleDrawer();
          }

          Assistant.appendMessage("user", `🎙️ "${transcript}"`);
          Assistant.appendMessage("assistant", res.reply);
          this.speak(res.reply);
        } catch (err) {
          Assistant.sendMessage(transcript);
        }
      };

      this.recognition.onerror = (e) => {
        console.warn("Speech recognition error:", e);
        this.stopListening();
      };

      this.recognition.onend = () => {
        this.stopListening();
      };
    }
  },

  startListening() {
    if (!this.recognition) {
      this.init();
    }
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        console.warn(e);
      }
    } else {
      API.showToast("Voice recognition not supported in this browser", "info");
    }
  },

  stopListening() {
    this.isListening = false;
    document.getElementById("assistant-voice-banner")?.classList.add("hidden");
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
  },

  speak(text) {
    if (!this.synth || !Assistant.isSpeakingEnabled) return;
    try {
      this.synth.cancel(); // Stop ongoing speech
      const cleanText = text.replace(/[*_#`]/g, ""); // Strip markdown symbols
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      this.synth.speak(utterance);
    } catch (e) {}
  }
};

function toggleVoiceInput() {
  if (Voice.isListening) {
    Voice.stopListening();
  } else {
    Voice.startListening();
  }
}

function stopVoiceRecognition() {
  Voice.stopListening();
}

function toggleVoiceSpeech() {
  Assistant.isSpeakingEnabled = !Assistant.isSpeakingEnabled;
  const btn = document.getElementById("voice-assistant-toggle");
  if (btn) {
    btn.innerText = Assistant.isSpeakingEnabled ? "🔊" : "🔇";
    API.showToast(Assistant.isSpeakingEnabled ? "Nova voice output enabled" : "Nova voice output muted", "info");
  }
}
