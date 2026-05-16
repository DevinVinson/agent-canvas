import React from "react";

interface AddonErrorBoundaryProps {
  children: React.ReactNode;
  fallback: (error: Error) => React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKey?: string;
}

interface AddonErrorBoundaryState {
  error: Error | null;
}

export class AddonErrorBoundary extends React.Component<
  AddonErrorBoundaryProps,
  AddonErrorBoundaryState
> {
  state: AddonErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AddonErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(previousProps: AddonErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }

    return this.props.children;
  }
}
