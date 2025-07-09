import { useState, useRef, useEffect } from "react";
import ChatInput from "./ChatInput";
import ChatMessage from "./ChatMessage";
// import { authHeader } from "../services/auth";

const API_URL = "";

const AVAILABLE_MODELS = [
  { id: "gpt-4", name: "GPT-4" },
  { id: "llama3", name: "LLaMA 3" },
  { id: "mistral", name: "Mistral 7B" },
];

export default function MultiModelChatPanel() {
  const [message, setMessage] = useState("");
  const [selectedModels, setSelectedModels] = useState(["gpt-4"]);
  const [multiResponses, setMultiResponses] = useState({});
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [multiResponses]);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMsg = { role: "user", content: message };
    const updated = { ...multiResponses };
    selectedModels.forEach((modelId) => {
      updated[modelId] = [...(updated[modelId] || []), userMsg];
    });
    setMultiResponses(updated);
    setSending(true);
    setMessage("");

    await Promise.all(
      selectedModels.map(async (modelId) => {
        try {
          const form = new FormData();
          form.append("query", message);
          form.append("model_id", modelId);

          const res = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: { ...authHeader() },
            body: form,
          });
          const data = await res.json();

          const assistantMsg = {
            role: "assistant",
            content: data.response?.answer || data.answer || "[No response]",
          };

          setMultiResponses((prev) => ({
            ...prev,
            [modelId]: [...(prev[modelId] || []), assistantMsg],
          }));
        } catch (err) {
          setMultiResponses((prev) => ({
            ...prev,
            [modelId]: [
              ...(prev[modelId] || []),
              {
                role: "assistant",
                content: `⚠️ Error from model ${modelId}`,
              },
            ],
          }));
        }
      })
    );

    setSending(false);
  };

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Model Selector */}
      <div className="p-4 bg-white border rounded shadow">
        <h2 className="text-md font-semibold mb-2">Select Models:</h2>
        <div className="flex flex-wrap gap-4">
          {AVAILABLE_MODELS.map((model) => (
            <label key={model.id} className="flex items-center space-x-2">
              <input
                type="checkbox"
                value={model.id}
                checked={selectedModels.includes(model.id)}
                onChange={(e) => {
                  setSelectedModels((prev) =>
                    e.target.checked
                      ? [...prev, model.id]
                      : prev.filter((id) => id !== model.id)
                  );
                }}
              />
              <span>{model.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Responses per Model */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 overflow-auto">
        {selectedModels.map((modelId) => (
          <div
            key={modelId}
            className="bg-white border rounded shadow flex flex-col"
          >
            <div className="px-4 py-2 border-b font-semibold text-center bg-gray-100">
              {AVAILABLE_MODELS.find((m) => m.id === modelId)?.name}
            </div>
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {(multiResponses[modelId] || []).map((msg, i) => (
                <ChatMessage
                  key={i}
                  msg={msg}
                  onCopy={() => navigator.clipboard.writeText(msg.content)}
                  onEdit={() => {}}
                  onDownload={() => {}}
                />
              ))}
              {sending && (
                <ChatMessage
                  msg={{ role: "assistant", content: "Typing..." }}
                />
              )}
              <div ref={scrollRef} />
            </div>
          </div>
        ))}
      </div>

      {/* Shared Input */}
      <div className="bg-white border rounded shadow p-4">
        <ChatInput
          message={message}
          setMessage={setMessage}
          onSend={handleSend}
          onAttachFile={() => {}}
          onPasteImage={() => {}}
          disabled={sending}
        />
      </div>
    </div>
  );
}
