// components/ChatHeader.jsx
import React from "react";
import { Settings, ChevronDown, ChevronUp, X } from "lucide-react";
import KnowledgeBaseSelector from "../../components/KnowledgeBaseSelector";
import RAGSettings from "../../components/RAGSettings";
import { saveChatModel } from "../../utils/chatModelStorage";

export default function ChatHeader({
  showSettings,
  setShowSettings,
  model,
  setModel,
  availableModels,
  currentChatId,
  kbs,
  selectedKbs,
  setSelectedKbs,
  sending,
  hasKnowledgeBases,
  topK,
  threshold,
  onTopKChange,
  onThresholdChange,
  activePreset,
  setActivePreset,
  maxTokens,
  setMaxTokens,
  temperature,
  setTemperature,
}) {
  const handleModelChange = (value) => {
    console.log("💾 Saving model for chat", currentChatId, ":", value);
    setModel(value);
    saveChatModel(currentChatId, value);
  };

  return (
    <div className="flex-shrink-0 border-b bg-white">
      {/* Main header with title and settings toggle */}
      <div className="px-4 py-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Agentic Chat</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Toggle Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Compact configuration bar */}
      <CompactConfigBar
        model={model}
        availableModels={availableModels}
        onModelChange={handleModelChange}
        kbs={kbs}
        selectedKbs={selectedKbs}
        setSelectedKbs={setSelectedKbs}
        sending={sending}
        hasKnowledgeBases={hasKnowledgeBases}
        showSettings={showSettings}
        setShowSettings={setShowSettings}
      />

      {/* Selected Knowledge Bases Pills */}
      {hasKnowledgeBases && (
        <SelectedKBsPills
          selectedKbs={selectedKbs}
          setSelectedKbs={setSelectedKbs}
        />
      )}

      {/* Advanced Settings */}
      {showSettings && (
        <AdvancedSettings
          setShowSettings={setShowSettings}
          hasKnowledgeBases={hasKnowledgeBases}
          topK={topK}
          threshold={threshold}
          onTopKChange={onTopKChange}
          onThresholdChange={onThresholdChange}
          activePreset={activePreset}
          setActivePreset={setActivePreset}
          sending={sending}
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
          temperature={temperature}
          setTemperature={setTemperature}
        />
      )}
    </div>
  );
}

const CompactConfigBar = ({
  model,
  availableModels,
  onModelChange,
  kbs,
  selectedKbs,
  setSelectedKbs,
  sending,
  hasKnowledgeBases,
  showSettings,
  setShowSettings,
}) => (
  <div className="px-4 py-2 bg-gray-50 border-t">
    <div className="flex items-center gap-4 flex-wrap">
      {/* Model Selection */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
          Model:
        </label>
        <select
          className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 min-w-32"
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={!availableModels.length}
        >
          {availableModels.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Knowledge Base Selection */}
      {/* <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
          KB:
        </label>
        <KnowledgeBaseSelector
          kbs={kbs}
          selectedKbs={selectedKbs}
          onSelectionChange={setSelectedKbs}
          disabled={sending}
        />
      </div> */}

      {/* KB Count indicator */}
      {hasKnowledgeBases && (
        <div className="text-xs text-blue-600 font-medium">
          {selectedKbs.length} KB{selectedKbs.length > 1 ? "s" : ""} selected
        </div>
      )}

      {/* Settings toggle for mobile */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="md:hidden p-1 text-gray-500 hover:text-gray-700 text-xs flex items-center gap-1"
      >
        Settings
        {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
    </div>
  </div>
);

const SelectedKBsPills = ({ selectedKbs, setSelectedKbs }) => (
  <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
    <div className="flex flex-wrap gap-1">
      {selectedKbs.map((kb) => (
        <div
          key={kb.id}
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
        >
          <span className="font-medium">{kb.name}</span>
          <span className="text-blue-500 text-xs">({kb.files.length})</span>
          <button
            onClick={() =>
              setSelectedKbs((prev) => prev.filter((k) => k.id !== kb.id))
            }
            className="text-blue-500 hover:text-blue-700"
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  </div>
);

const AdvancedSettings = ({
  setShowSettings,
  hasKnowledgeBases,
  topK,
  threshold,
  onTopKChange,
  onThresholdChange,
  activePreset,
  setActivePreset,
  sending,
  maxTokens,
  setMaxTokens,
  temperature,
  setTemperature,
}) => (
  <div className="px-4 py-3 bg-gray-50 border-t">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-700">Advanced Settings</h3>
      <button
        onClick={() => setShowSettings(false)}
        className="text-gray-400 hover:text-gray-600"
      >
        <ChevronUp size={16} />
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* RAG Settings */}
      {hasKnowledgeBases && (
        <div className="md:col-span-2">
          <RAGSettings
            topK={topK}
            threshold={threshold}
            onTopKChange={onTopKChange}
            onThresholdChange={onThresholdChange}
            activePreset={activePreset}
            setActivePreset={setActivePreset}
            disabled={sending}
          />
        </div>
      )}

      {/* Model Parameters */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Max Tokens: {maxTokens}
          </label>
          <input
            type="range"
            min="100"
            max="4000"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Temperature: {temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  </div>
);
