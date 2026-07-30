"use client";
import { useCallback, useEffect, useState } from "react";

export type Thread = {
  id: string;
  name: string;
  subtitle: string;
};

export const threads: Thread[] = [
  { id: "kola-and-sons", name: "Kola & Sons", subtitle: "order STL-2408" },
  { id: "adaobi-atelier", name: "Adaobi Atelier", subtitle: "order STL-2381" },
  { id: "stitchlink-support", name: "StitchLink support", subtitle: "" },
];

export type Message = {
  id: string;
  threadId: string;
  from: "tailor" | "customer" | "system";
  author: string;
  text: string;
  at: string;
};

const initialMessages: Message[] = [
  {
    id: "msg-1",
    threadId: "kola-and-sons",
    from: "tailor",
    author: "Kola Adeyemi",
    text: "The embroidery is complete. I'll share the first full fitting photos tomorrow.",
    at: "Yesterday, 5:42 PM",
  },
  {
    id: "msg-2",
    threadId: "kola-and-sons",
    from: "customer",
    author: "You",
    text: "Wonderful — please keep the neckline as clean as the sketch.",
    at: "Yesterday, 5:58 PM",
  },
  {
    id: "msg-3",
    threadId: "adaobi-atelier",
    from: "tailor",
    author: "Adaobi Okeke",
    text: "Your appointment is confirmed",
    at: "Monday, 9:10 AM",
  },
];

const STORAGE_KEY = "stitchlink_messages";
const UPDATE_EVENT = "stitchlink_messages_update";

function readStore(): Message[] {
  if (typeof window === "undefined") return initialMessages;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialMessages;
    return JSON.parse(raw) as Message[];
  } catch {
    return initialMessages;
  }
}

function writeStore(messages: Message[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  useEffect(() => {
    setMessages(readStore());
    const sync = () => setMessages(readStore());
    window.addEventListener(UPDATE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(UPDATE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const addMessage = useCallback((message: Omit<Message, "id" | "at"> & { at?: string }) => {
    const current = readStore();
    const entry: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      at: message.at ?? "Just now",
    };
    writeStore([...current, entry]);
    return entry;
  }, []);

  return { messages, addMessage };
}
