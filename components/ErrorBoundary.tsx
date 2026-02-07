import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-red-900 text-white p-8 font-mono overflow-auto">
                    <h1 className="text-3xl font-bold mb-4">SYSTEM CRITICAL FAILURE</h1>
                    <h2 className="text-xl mb-2 text-red-300">{this.state.error?.toString()}</h2>
                    <details className="whitespace-pre-wrap bg-black/50 p-4 rounded border border-red-500/30">
                        {this.state.errorInfo?.componentStack}
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-6 py-2 bg-white text-red-900 font-bold rounded hover:bg-gray-200"
                    >
                        REBOOT SYSTEM
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
