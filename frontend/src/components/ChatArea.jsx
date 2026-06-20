import { useState, useRef, useEffect } from "react";
import { FiSend } from "react-icons/fi";
import Message from "./Message";
import API from "../api";

export default function ChatArea({
  messages,
  setMessages,
  status,
  useMemory,
  loading,
  setLoading,
  fetchStatus,
  sessionId,
  setSessionId,
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (questionText) => {
    const question = questionText || input.trim();
    if (!question || !status.vector_store_loaded) return;

    setInput("");
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: question,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      const res = await API.post("/ask", {
        question,
        use_memory: useMemory,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.answer,
          sources: res.data.sources,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      await fetchStatus();

      try {
        const saved = await API.post("/history/message", {
          session_id: sessionId || null,
          role: "user",
          content: question,
          sources: [],
          documents: status.indexed_files || [],
        });

        const sid = saved.data.session_id;
        if (!sessionId) setSessionId(sid);

        await API.post("/history/message", {
          session_id: sid,
          role: "assistant",
          content: res.data.answer,
          sources: res.data.sources || [],
          documents: [],
        });
      } catch (e) {
        console.warn("History save failed:", e);
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${e.response?.data?.detail || "Something went wrong."}`,
          sources: [],
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-area">
      <div className="chat-topbar">
        <div className="chat-topbar-title">
          {status.vector_store_loaded ? (
            <>
              <span className="status-dot green" />
              <span>
                {status.indexed_files?.length} file
                {status.indexed_files?.length !== 1 ? "s" : ""} indexed — Ready
              </span>
            </>
          ) : (
            <>
              <span className="status-dot yellow" />
              <span>No documents loaded — Upload files in sidebar</span>
            </>
          )}
        </div>
        {useMemory && (
          <div className="memory-badge">
            Memory: {status.total_messages || 0} messages
          </div>
        )}
      </div>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🤖</div>
            <div className="empty-title">Enterprise Chatbot</div>
            <div className="empty-subtitle">
              Upload documents in the sidebar, then ask anything about them.
            </div>
            <div className="feature-grid">
              <div className="feature-card">
                <span>📄</span>
                <span>PDF · DOCX · XLSX · TXT</span>
              </div>
              <div className="feature-card">
                <span>🔍</span>
                <span>RAG + Reranking</span>
              </div>
              <div className="feature-card">
                <span>💬</span>
                <span>Text Input</span>
              </div>
              <div className="feature-card">
                <span>🧠</span>
                <span>Conversation Memory</span>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Message key={i} message={msg} />
        ))}

        {loading && (
          <div className="message assistant-message">
            <div className="message-avatar">🤖</div>
            <div className="message-bubble loading-bubble">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="input-bar">
        <div className="input-wrapper">
          <textarea
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              status.vector_store_loaded
                ? "Ask a question about your documents..."
                : "Upload documents first, then ask questions here..."
            }
            disabled={loading || !status.vector_store_loaded}
            rows={1}
          />

          <div className="input-actions">
            <button
              className={`send-btn ${
                input.trim() && status.vector_store_loaded ? "send-btn-active" : ""
              }`}
              onClick={() => sendMessage()}
              disabled={loading || !input.trim() || !status.vector_store_loaded}
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>

        <div className="input-hint">Enter to send · Shift+Enter for new line</div>
      </div>
    </div>
  );
}