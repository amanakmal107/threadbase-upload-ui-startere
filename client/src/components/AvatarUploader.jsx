import { useState, useRef, useEffect } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);

  // Task 3: Local preview with cleanup on change / unmount
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Task 2: Client-side validation
  function validateAndSelectFile(selectedFile) {
    if (!selectedFile) return;

    setError("");
    setProgress(0);
    setUploadedUrl("");

    // Validate type
    if (!ALLOWED.includes(selectedFile.type)) {
      setError("Only image files (JPEG, PNG, WebP, GIF) are allowed");
      setFile(null);
      return;
    }

    // Validate size (max 5MB)
    if (selectedFile.size > MAX_SIZE) {
      setError("File too large (max 5MB)");
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }

  // Task 1: Drag-and-drop handlers
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSelectFile(droppedFile);
    }
  }

  function handleInputChange(e) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSelectFile(selectedFile);
    }
    e.target.value = "";
  }

  // Task 4: Axios upload with progress
  async function upload() {
    if (!file) return;

    // Validate again before network request
    if (!ALLOWED.includes(file.type)) {
      setError("Only image files (JPEG, PNG, WebP, GIF) are allowed");
      return;
    }

    if (file.size > MAX_SIZE) {
      setError("File too large (max 5MB)");
      return;
    }

    setError("");
    setProgress(0);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      // NOTE: Do not set Content-Type header manually - let browser set it with boundary
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(percent);
          }
        },
      });

      setUploadedUrl(response.data.url);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Upload failed";
      setError(msg);
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div
        className={`drop-zone ${isDragging ? "dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <div>
            <img src={preview} alt="Avatar preview" className="preview" />
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
              {file?.name} (Click or drop to replace)
            </p>
          </div>
        ) : (
          <p>Drag an image here, or click to choose</p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleInputChange}
        />
      </div>

      {error && <p className="error">{error}</p>}

      {progress > 0 && (
        <div className="bar">
          <div className="fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div style={{ marginTop: "1rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <button onClick={upload} disabled={!file || isUploading}>
          {isUploading ? `Uploading (${progress}%)` : "Upload"}
        </button>
        {progress > 0 && (
          <span style={{ fontSize: "0.875rem", color: "#64748b" }}>{progress}%</span>
        )}
      </div>

      {uploadedUrl && (
        <p style={{ marginTop: "0.75rem", color: "#16a34a", fontSize: "0.875rem" }}>
          Upload successful! URL: <code>{uploadedUrl}</code>
        </p>
      )}
    </div>
  );
}
