import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import API from "../api";
import {
  FiUpload, FiFile, FiCheckCircle,
  FiClock, FiTrash2, FiFolder, FiSettings
} from "react-icons/fi";

const PIPELINE_STEPS = [
  { key: "upload", label: "Document Loader" },
  { key: "chunk",  label: "Text Extraction + Chunking" },
  { key: "embed",  label: "Embedding → Vector DB" },
  { key: "ready",  label: "Retriever Ready" },
];

export default function Sidebar({
  status,
  setStatus,
  setMessages,
  useMemory,
  setUseMemory,
  pipelineStage,
  setPipelineStage,
  fetchStatus,
}) {
  const [uploading, setUploading]           = useState(false);
  const [uploadedFiles, setUploadedFiles]   = useState([]);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [error, setError]                   = useState("");

  const onDrop = useCallback((acceptedFiles) => {
    setUploadedFiles(acceptedFiles);
    setError("");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/plain": [".txt"],
    },
    multiple: true,
  });

  const processFiles = async () => {
    if (uploadedFiles.length === 0) return;
    setUploading(true);
    setError("");
    setCompletedSteps([]);

    const formData = new FormData();
    uploadedFiles.forEach((f) => formData.append("files", f));

    try {
      setPipelineStage("upload");
      await new Promise((r) => setTimeout(r, 300));
      setCompletedSteps(["upload"]);

      setPipelineStage("chunk");
      await new Promise((r) => setTimeout(r, 300));
      setCompletedSteps((p) => [...p, "chunk"]);

      setPipelineStage("embed");

      const res = await API.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,
      });

      setCompletedSteps((p) => [...p, "embed", "ready"]);
      setPipelineStage("ready");
      setError("");
      await fetchStatus();

      setMessages([{
        role:      "assistant",
        content:   `✅ ${res.data.message}. You can now ask questions about your documents!`,
        sources:   [],
        timestamp: new Date().toLocaleTimeString(),
      }]);

      setUploadedFiles([]);

    } catch (e) {
      try {
        const statusRes = await API.get("/status");
        if (statusRes.data.vector_store_loaded) {
          setError("");
          setCompletedSteps(["upload", "chunk", "embed", "ready"]);
          setPipelineStage("ready");
          await fetchStatus();
          setMessages([{
            role:      "assistant",
            content:   "✅ Documents processed successfully! You can now ask questions.",
            sources:   [],
            timestamp: new Date().toLocaleTimeString(),
          }]);
          setUploadedFiles([]);
          return;
        }
      } catch (_) {}

      setError(
        e.response?.data?.detail ||
        "Upload failed. Make sure backend is running on port 8000."
      );
      setCompletedSteps([]);
      setPipelineStage("");

    } finally {
      setUploading(false);
    }
  };

  const loadSavedIndex = async () => {
    setError("");
    try {
      await API.post("/load-index");
      await fetchStatus();
      setCompletedSteps(["upload", "chunk", "embed", "ready"]);
      setPipelineStage("ready");
      setMessages([{
        role:      "assistant",
        content:   "✅ Loaded saved index from disk. Ready for questions!",
        sources:   [],
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } catch (e) {
      setError("No saved index found. Please upload documents first.");
    }
  };

  const clearChat = async () => {
    try {
      await API.post("/clear");
      setMessages([]);
      await fetchStatus();
    } catch (e) {
      console.error("Clear failed:", e);
    }
  };

  return (
    <div className="sidebar">

      <div className="sidebar-header">
        <div className="sidebar-logo">🤖</div>
        <div>
          <div className="sidebar-title">Enterprise Chatbot</div>
          <div className="sidebar-subtitle">Text · Document</div>
        </div>
      </div>

      <div className="sidebar-section">
        <div className="section-label">📄 Upload Documents</div>

        <div
          {...getRootProps()}
          className={`dropzone ${isDragActive ? "dropzone-active" : ""}`}
        >
          <input {...getInputProps()} />
          <FiUpload size={22} color="#569cd6" />
          <div className="dropzone-text">
            {isDragActive
              ? "Drop files here..."
              : "Drag & drop or click to upload"}
          </div>
          <div className="dropzone-hint">PDF · DOCX · XLSX · TXT</div>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="file-list">
            {uploadedFiles.map((f, i) => (
              <div key={i} className="file-item">
                <FiFile size={13} color="#569cd6" />
                <span className="file-name">{f.name}</span>
                <span className="file-size">
                  {(f.size / 1024).toFixed(0)}KB
                </span>
              </div>
            ))}
          </div>
        )}

        {error && <div className="error-box">⚠️ {error}</div>}

        <button
          className="btn-primary"
          onClick={processFiles}
          disabled={uploading || uploadedFiles.length === 0}
        >
          {uploading ? "⏳ Processing..." : "⚙️ Process Documents"}
        </button>

        <button className="btn-secondary" onClick={loadSavedIndex}>
          <FiFolder size={14} /> Load Saved Index
        </button>
      </div>

      <div className="sidebar-section">
        <div className="section-label">🔄 Pipeline Status</div>
        <div className="pipeline-steps">
          {PIPELINE_STEPS.map((step) => {
            const done   = completedSteps.includes(step.key);
            const active = pipelineStage === step.key && !done;
            return (
              <div
                key={step.key}
                className={`pipeline-step ${
                  done   ? "step-done"    :
                  active ? "step-active"  :
                           "step-waiting"
                }`}
              >
                {done   ? <FiCheckCircle size={13} /> :
                 active ? <span className="spinner-small" /> :
                          <FiClock size={13} />}
                <span>{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {status.indexed_files?.length > 0 && (
        <div className="sidebar-section">
          <div className="section-label">📁 Indexed Files</div>
          {status.indexed_files.map((f, i) => (
            <div key={i} className="indexed-file">
              <FiCheckCircle size={12} color="#4ec9b0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sidebar-section sidebar-settings">
        <div className="section-label">⚙️ Settings</div>

        <label className="toggle-row">
          <FiSettings size={14} color="#c586c0" />
          <span>Conversation memory</span>
          <div
            className={`toggle ${useMemory ? "toggle-on" : ""}`}
            onClick={() => setUseMemory(!useMemory)}
          />
        </label>

        <button className="btn-danger" onClick={clearChat}>
          <FiTrash2 size={13} /> Clear Chat
        </button>
      </div>

    </div>
  );
}