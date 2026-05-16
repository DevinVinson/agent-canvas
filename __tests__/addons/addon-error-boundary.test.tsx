import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddonErrorBoundary } from "#/addons/addon-error-boundary";

function ThrowingChild(): React.ReactNode {
  throw new Error("boom");
}

describe("AddonErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its children when they do not throw", () => {
    render(
      <AddonErrorBoundary fallback={(error) => <p>{error.message}</p>}>
        <p>healthy</p>
      </AddonErrorBoundary>,
    );

    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  it("renders the fallback and reports errors", () => {
    const onError = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AddonErrorBoundary
        fallback={(error) => <p>failed: {error.message}</p>}
        onError={onError}
      >
        <ThrowingChild />
      </AddonErrorBoundary>,
    );

    expect(screen.getByText("failed: boom")).toBeInTheDocument();
    expect(onError).toHaveBeenCalledOnce();
  });
});
