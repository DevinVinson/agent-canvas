import React from "react";

interface AddonErrorBoundaryProps {
  children: React.ReactNode;
  fallback: (error: Error) => React.ReactNode;
  resetKey: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
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
    const { error } = this.state;

    if (error) {
      return this.props.fallback(error);
    }

    return this.props.children;
  }
}
