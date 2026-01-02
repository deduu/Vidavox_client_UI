// hooks/useScrollBehavior.js
import { useState, useRef, useLayoutEffect } from "react";

export const useScrollBehavior = (inputRef) => {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [jumpBtnBottom, setJumpBtnBottom] = useState(96);

  const listRef = useRef(null);
  const bottomRef = useRef(null);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = (behavior = "smooth") =>
    bottomRef.current?.scrollIntoView({ behavior });

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;

    const threshold = 80;
    const atBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;

    setIsAtBottom(atBottom);
    isAtBottomRef.current = atBottom;

    if (atBottom) setUnreadCount(0);
  };

  // Update jump button position based on input height
  useLayoutEffect(() => {
    const update = () => {
      const h = inputRef.current?.getBoundingClientRect().height ?? 80;
      setJumpBtnBottom(h + 12);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [inputRef]);

  return {
    isAtBottom,
    unreadCount,
    setUnreadCount,
    jumpBtnBottom,
    listRef,
    bottomRef,
    isAtBottomRef,
    handleScroll,
    scrollToBottom,
  };
};
