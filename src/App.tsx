import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface Model {
  name: string;
  size: number;
  digest: string;
}

function App() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: string; content: string }[]>([]);
  const [temperature, setTemperature] = useState(0.7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chat]);

  async function loadModels() {
    const availableModels = await invoke<Model[]>("get_models");
    setModels(availableModels);
    if (availableModels.length > 0) {
      setSelectedModel(availableModels[0].name);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const userMessage = { role: "user", content: message };
    setChat(prev => [...prev, userMessage]);
    setMessage("");
    setLoading(true);
    setError(null);

    try {
      const response = await invoke<string>("chat", {
        model: selectedModel,
        message: message,
        temperature,
      });
      
      setChat(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      setError(error as string);
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Ollama Chat</h2>
        </div>
        
        <div className="model-selector">
          <label>Model</label>
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
            {models.map(model => (
              <option key={model.digest} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="settings">
          <h3>Settings</h3>
          <div className="setting-item">
            <label>
              Temperature: {temperature}
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={e => setTemperature(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages">
          {chat.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="message-content">{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          {error && <div className="error-message">Error: {error}</div>}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="input-form">
          <input
            value={message}
            onChange={e => setMessage(e.currentTarget.value)}
            placeholder="Type your message..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !message.trim()}>
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
