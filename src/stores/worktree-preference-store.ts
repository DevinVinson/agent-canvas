import { useSyncExternalStore } from "react";

import { WORKTREE_PREFERENCE_STORAGE_KEY } from "#/constants/worktree-keys";

type WorktreePreferenceListener = () => void;

const listeners = new Set<WorktreePreferenceListener>();

const notifyWorktreePreferenceListeners = () => {
  listeners.forEach((listener) => listener());
};

const readStoredPreference = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.localStorage.getItem(WORKTREE_PREFERENCE_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
};

export const getWorktreePreferenceEnabled = (): boolean =>
  readStoredPreference();

export const subscribeWorktreePreference = (
  listener: WorktreePreferenceListener,
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const setWorktreePreferenceEnabled = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(WORKTREE_PREFERENCE_STORAGE_KEY, "true");
    } else {
      window.localStorage.removeItem(WORKTREE_PREFERENCE_STORAGE_KEY);
    }
    notifyWorktreePreferenceListeners();
  } catch {
    // localStorage unavailable
  }
};

export const useWorktreePreferenceEnabled = (): boolean =>
  useSyncExternalStore(
    subscribeWorktreePreference,
    getWorktreePreferenceEnabled,
    () => false,
  );
