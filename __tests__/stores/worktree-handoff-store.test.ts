import { beforeEach, describe, expect, it } from "vitest";

import { WORKTREE_HANDOFF_STORAGE_KEY } from "#/constants/worktree-keys";
import {
  getWorktreeHandoffActive,
  setWorktreeHandoffActive,
} from "#/stores/worktree-handoff-store";

describe("worktree-handoff-store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("tracks handoff state per conversation", () => {
    expect(getWorktreeHandoffActive("conv-1")).toBe(false);

    setWorktreeHandoffActive("conv-1", true);
    expect(getWorktreeHandoffActive("conv-1")).toBe(true);
    expect(getWorktreeHandoffActive("conv-2")).toBe(false);

    setWorktreeHandoffActive("conv-1", false);
    expect(getWorktreeHandoffActive("conv-1")).toBe(false);
  });

  it("persists handoff state in localStorage", () => {
    setWorktreeHandoffActive("conv-1", true);

    expect(
      JSON.parse(
        window.localStorage.getItem(WORKTREE_HANDOFF_STORAGE_KEY) ?? "{}",
      ),
    ).toEqual({ "conv-1": true });
  });
});
