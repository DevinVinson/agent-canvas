import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { AddonErrorBoundary } from "#/addons/addon-error-boundary";

function MaybeThrow({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("boom");
  }

  return <div>safe</div>;
}

describe("AddonErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isolates render failures and resets when the route key changes", () => {
    const { rerender } = render(
      <AddonErrorBoundary
        resetKey="first"
        fallback={(error) => <div>{error.message}</div>}
      >
        <MaybeThrow shouldThrow />
      </AddonErrorBoundary>,
    );

    expect(screen.getByText("boom")).toBeInTheDocument();

    rerender(
      <AddonErrorBoundary
        resetKey="second"
        fallback={(error) => <div>{error.message}</div>}
      >
        <MaybeThrow shouldThrow={false} />
      </AddonErrorBoundary>,
    );

    expect(screen.getByText("safe")).toBeInTheDocument();
  });
});
