import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React App:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center p-6 bg-slate-900 border border-purple-900/60 rounded-3xl shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-pink-950/80 border border-pink-500/40 flex items-center justify-center mx-auto text-pink-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            
            <h2 className="text-xl font-bold text-white">Упс! Произошла ошибка</h2>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              При загрузке приложения возникла ошибка. Вы можете обновить страницу или сбросить сохраненные данные.
            </p>

            {this.state.error && (
              <div className="p-2 bg-slate-950 rounded-xl border border-purple-950 text-[10px] font-mono text-purple-300 overflow-x-auto text-left max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-2">
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold rounded-xl"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Перезагрузить страницу
              </Button>

              <Button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                variant="ghost"
                className="w-full text-slate-400 hover:text-white text-xs"
              >
                Очистить локальный кэш и перезапустить
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}