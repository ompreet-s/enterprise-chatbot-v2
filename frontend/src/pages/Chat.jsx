import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatArea from "../components/ChatArea";
import API from "../api";

export default function Chat() {
  const navigate = useNavigate();
  const [status, setStatus] = useState({
    vector_store_loaded: false,
    indexed_files: [],
    total_messages: 0,
  });
  const [messages, setMessages]     = useState([]);
  const [useMemory, setUseMemory]   = useState(true);
  const [loading, setLoading]       = useState(false);
  const [pipelineStage, setPipelineStage] = useState("");
  const [sessionId, setSessionId]   = useState(null);

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    try {
      const res = await API.get("/status");
      setStatus(res.data);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="app-container">
      <div className="navbar">
        <div className="navbar-left">
          <span className="navbar-logo">🤖</span>
          <span className="navbar-title">Enterprise Chatbot</span>
        </div>
        <div className="navbar-right">
          <button className="nav-btn" onClick={() => navigate("/history")}>
            📋 History
          </button>
        </div>
      </div>

      <div className="main-layout">
        <Sidebar
          status={status}
          setStatus={setStatus}
          setMessages={setMessages}
          useMemory={useMemory}
          setUseMemory={setUseMemory}
          pipelineStage={pipelineStage}
          setPipelineStage={setPipelineStage}
          fetchStatus={fetchStatus}
        />
        <ChatArea
          messages={messages}
          setMessages={setMessages}
          status={status}
          useMemory={useMemory}
          loading={loading}
          setLoading={setLoading}
          fetchStatus={fetchStatus}
          sessionId={sessionId}
          setSessionId={setSessionId}
        />
      </div>
    </div>
  );
}