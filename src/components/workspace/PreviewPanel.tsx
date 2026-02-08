import { TrendingUp, TrendingDown, Minus, ExternalLink, Maximize2, FileText, Play } from 'lucide-react';
import { Button } from '../common/Button';
import type { Artifact } from './types';

interface PreviewPanelProps {
  currentTask: any;
  artifacts: Artifact[];
  plan?: any;
  onExecute?: () => void;
}

export function PreviewPanel({ currentTask, artifacts, plan, onExecute }: PreviewPanelProps) {
  if (!currentTask) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-background">
        <FileText className="h-12 w-12 text-muted-foreground/20 mb-2" />
        <p className="text-sm text-muted-foreground">No task selected</p>
        <p className="text-xs text-muted-foreground mt-1">Create or select a task to view details</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">{currentTask.goal || currentTask.title || 'Task'}</h3>
            <p className="text-xs text-muted-foreground">
              {new Date(currentTask.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(currentTask.status === 'not_started' || currentTask.status === 'running') && onExecute && (
            <Button 
              className="gap-2"
              onClick={onExecute}
              disabled={currentTask.status === 'running'}
            >
              <Play className="h-4 w-4" />
              {currentTask.status === 'running' ? 'Running...' : 'Execute'}
            </Button>
          )}
          <Button variant="ghost" className="h-8 w-8">
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="h-8 w-8">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Task Card */}
          <div className="rounded-lg bg-gradient-to-br from-primary/5 via-card to-accent/10 p-6 border border-border shadow-sm">
            <h2 className="text-2xl font-semibold text-foreground">
              {currentTask.title || 'Untitled Task'}
            </h2>
            <p className="mt-3 text-sm text-foreground/80">
              {currentTask.description || 'No description provided'}
            </p>
            {currentTask.status && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
                <span className="text-xs font-medium text-primary capitalize">
                  {currentTask.status}
                </span>
              </div>
            )}
          </div>

          {/* Metrics Grid */}
          {(plan || currentTask.plan) && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Status" value={currentTask.status || 'not_started'} />
              <MetricCard
                label="Steps"
                value={`0/${(plan?.steps || currentTask.plan?.steps)?.length || 0}`}
              />
              <MetricCard label="Priority" value={currentTask.priority || 'medium'} />
              <MetricCard label="Created" value={new Date(currentTask.created_at).toLocaleDateString()} />
            </div>
          )}

          {/* Plan Details */}
          {(plan || currentTask.plan) && (
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-semibold text-foreground">
                Plan: {plan?.goal || currentTask.plan?.title || 'Task Plan'}
              </h3>
              <div className="space-y-2">
                {(plan?.steps || currentTask.plan?.steps)?.map((step: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 pb-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">
                        {typeof step === 'string' ? step : step.action || step.tool}
                      </p>
                      {step.parameters && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Object.entries(step.parameters).map(([k, v]) => `${k}: ${v}`).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artifacts */}
          {artifacts.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-4 font-semibold text-foreground">Artifacts ({artifacts.length})</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {artifacts.map((artifact) => (
                  <button
                    key={artifact.id}
                    className="group rounded-lg border border-border bg-secondary/30 p-4 text-left transition-all hover:border-primary/30 hover:bg-secondary/50 hover:shadow-sm"
                  >
                    <p className="font-medium text-foreground group-hover:text-primary">{artifact.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{artifact.path}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-[hsl(var(--success))]' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-2xl font-semibold text-foreground">{value}</span>
        {trend && <TrendIcon className={`h-4 w-4 ${trendColor}`} />}
      </div>
    </div>
  );
}
