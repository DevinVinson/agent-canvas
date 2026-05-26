import { useSyncExternalStore } from "react";

import { WORKTREE_HANDOFF_STORAGE_KEY } from "#/constants/worktree-keys";

type WorktreeHandoffListener = () => void;

const listeners = new Set<WorktreeHandoffListener>();

type WorktreeHandoffMap = Record<string, boolean>;

const notifyWorktreeHandoffListeners = () => {
  listeners.forEach((listener) => listener());
};

const readStoredHandoffs = (): WorktreeHandoffMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WORKTREE_HANDOFF_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as WorktreeHandoffMap;
  } catch {
    return {};
  }
};

const writeStoredHandoffs = (next: WorktreeHandoffMap): void => {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(next).length === 0) {
      window.localStorage.removeItem(WORKTREE_HANDOFF_STORAGE_KEY);
    } else {
      window.localStorage.setItem(
        WORKTREE_HANDOFF_STORAGE_KEY,
        JSON.stringify(next),
      );
    }
    notifyWorktreeHandoffListeners();
  } catch {
    // localStorage unavailable
  }
};

export const getWorktreeHandoffActive = (conversationId: string): boolean =>
  readStoredHandoffs()[conversationId] === true;

export const subscribeWorktreeHandoff = (
  listener: WorktreeHandoffListener,
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const setWorktreeHandoffActive = (
  conversationId: string,
  active: boolean,
): void => {
  const next = readStoredHandoffs();
  if (active) {
    next[conversationId] = true;
  } else {
    delete next[conversationId];
  }
  writeStoredHandoffs(next);
};

export const useWorktreeHandoffActive = (
  conversationId: string | undefined,
): boolean =>
  useSyncExternalStore(
    subscribeWorktreeHandoff,
    () => (conversationId ? getWorktreeHandoffActive(conversationId) : false),
    () => false,
  );
