// src/components/JsonEditorViewer.jsx
import React, { useRef, useEffect } from "react";
import JSONEditor from "jsoneditor";
import "jsoneditor/dist/jsoneditor.min.css";

export default function JsonEditorViewer({
  json,
  mode = "view",
  height = 600,
}) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      // Destroy previous instance to avoid duplicates
      if (editorRef.current) {
        editorRef.current.destroy();
      }

      // Initialize editor
      editorRef.current = new JSONEditor(containerRef.current, {
        mode,
        modes: ["view", "code", "tree"],
        onError: (err) => {
          console.error("JSONEditor error:", err.message);
        },
      });

      editorRef.current.set(json || {});
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
  }, [json, mode]);

  return (
    <div
      ref={containerRef}
      style={{ height, border: "1px solid #ddd", borderRadius: 8 }}
    />
  );
}
