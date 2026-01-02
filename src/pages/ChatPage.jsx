import React, { useRef, useEffect } from "react";
import SidebarLayout from "../components/SidebarLayout";
import ChatHeader from "../components/ChatPage/ChatHeader";
import ChatMessages from "../components/ChatPage/ChatMessages";
import ChatInputContainer from "../components/ChatPage/ChatInputContainer";
import ApiKeyWarning from "../components/ChatPage/ApiKeyWarning";
import JumpToBottomButton from "../components/ChatPage/JumpToBottomButton";
import { useChatPageState } from "../hooks/useChatPageState";
import { useChatMessages } from "../hooks/useChatMessages";
import { useChatActions } from "../hooks/useChatActions";
import { useScrollBehavior } from "../hooks/useScrollBehavior";

const DEFAULT_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct";
// const DEFAULT_MODEL = "Auto"

export default function ChatPage() {
  const inputRef = useRef(null);

  // Custom hooks for state management
  const {
    chatMode,
    setChatMode,
    message,
    setMessage,
    sending,
    setSending,
    showSettings,
    setShowSettings,
    kbs,
    selectedKbs,
    setSelectedKbs,
    model,
    setModel,
    missingApiKey,
    setMissingApiKey,
    streaming,
    setStreaming,
    maxTokens,
    setMaxTokens,
    temperature,
    setTemperature,
    topK,
    setTopK,
    threshold,
    setThreshold,
    activePreset,
    setActivePreset,
    availableModels,
    attachments,
    setAttachments,
    typing,
    setTyping,
  } = useChatPageState(DEFAULT_MODEL);

  const { history, setHistory, currentChatId, activeChat } = useChatMessages();

  const {
    isAtBottom,
    unreadCount,
    jumpBtnBottom,
    listRef,
    bottomRef,
    handleScroll,
    scrollToBottom,
    isAtBottomRef,
  } = useScrollBehavior(inputRef);

  const {
    handleSend,
    handleSendFileOnly,
    handlePasteImage,
    handleAttachFiles,
    handleRemoveAttachment,
    handleStop,
    handleTopKChange,
    handleThresholdChange,
  } = useChatActions({
    message,
    setMessage,
    sending,
    setSending,
    selectedKbs,
    model,
    maxTokens,
    temperature,
    topK,
    setTopK,
    threshold,
    streaming,
    attachments,
    setAttachments,
    typing,
    setTyping,
    history,
    setHistory,
    currentChatId,
    activeChat,
    setMissingApiKey,
    setActivePreset,
    scrollToBottom,
    isAtBottomRef,
  });

  const hasKnowledgeBases = selectedKbs.length > 0;
  useEffect(() => {
    if (listRef.current) {
      console.log("🧾 listRef.scrollHeight:", listRef.current.scrollHeight);
      console.log("🧾 listRef.clientHeight:", listRef.current.clientHeight);
    }
  }, [history]);

  return (
    <SidebarLayout bottomSlot="Powered by Vidavox">
      <div className="flex flex-col flex-1 h-full min-h-0 bg-white">
        <ChatHeader
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          model={model}
          setModel={setModel}
          availableModels={availableModels}
          currentChatId={currentChatId}
          kbs={kbs}
          selectedKbs={selectedKbs}
          setSelectedKbs={setSelectedKbs}
          sending={sending}
          hasKnowledgeBases={hasKnowledgeBases}
          topK={topK}
          threshold={threshold}
          onTopKChange={handleTopKChange}
          onThresholdChange={handleThresholdChange}
          activePreset={activePreset}
          setActivePreset={setActivePreset}
          maxTokens={maxTokens}
          setMaxTokens={setMaxTokens}
          temperature={temperature}
          setTemperature={setTemperature}
        />

        <div
          className="flex-1 min-h-0 overflow-y-auto"
          ref={listRef}
          onScroll={handleScroll}
        >
          <div className="max-w-4xl mx-auto px-4 py-6">
            <ApiKeyWarning
              missingApiKey={missingApiKey}
              setMissingApiKey={setMissingApiKey}
            />

            <ChatMessages
              history={history}
              typing={typing}
              hasKnowledgeBases={hasKnowledgeBases}
            />
          </div>
          <div ref={bottomRef} />
        </div>

        <div className="relative">
          <JumpToBottomButton
            isAtBottom={isAtBottom}
            unreadCount={unreadCount}
            jumpBtnBottom={jumpBtnBottom}
            onScrollToBottom={() => scrollToBottom("smooth")}
          />
          <ChatInputContainer
            ref={inputRef}
            message={message}
            setMessage={setMessage}
            onSend={handleSend}
            onStop={handleStop}
            disabled={sending}
            onAttachFiles={handleAttachFiles}
            attachments={attachments}
            onRemoveAttachment={handleRemoveAttachment}
            onSendFileOnly={handleSendFileOnly}
            onPasteImage={handlePasteImage}
          />
        </div>
      </div>
    </SidebarLayout>
  );
}
