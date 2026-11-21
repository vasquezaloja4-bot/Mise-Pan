import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected interface error occurred.',
    };
  }

  override componentDidCatch(error: Error) {
    console.error('Application render error:', error);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('mise_pan_pantry_v1');
      localStorage.removeItem('mise_pan_recipes_v1');
    } catch {
      // Ignore storage failures
    }
    this.setState({ hasError: false, message: '' });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FCFCFA] text-[#171717] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E5E5E0] rounded-xl p-8">
            <h1 className="text-2xl font-semibold tracking-tight mb-2">
              Something interrupted the kitchen view
            </h1>
            <p className="text-sm text-[#52524E] leading-relaxed mb-6">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2.5 text-sm font-medium bg-[#1F5132] text-white rounded-lg hover:bg-[#173E26] transition-colors cursor-pointer"
            >
              Reset Kitchen Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
