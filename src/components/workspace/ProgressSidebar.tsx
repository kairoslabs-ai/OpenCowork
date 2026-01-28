import { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCheck,
  Video,
  FileCode,
} from 'lucide-react';
import type { ProgressStep, Artifact } from './types';

interface ProgressSidebarProps {
  progressSteps: ProgressStep[];
  artifacts: Artifact[];
  onArtifactClick?: (artifact: Artifact) => void;
}

export function ProgressSidebar({
  progressSteps,
  artifacts,
  onArtifactClick,
}: ProgressSidebarProps) {
  const [progressOpen, setProgressOpen] = useState(true);
  const [artifactsOpen, setArtifactsOpen] = useState(true);

  const completedSteps = progressSteps.filter((s) => s.completed).length;
  const totalSteps = progressSteps.length;

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold text-foreground">Task Progress</h2>
        <p className="text-xs text-muted-foreground">
          {completedSteps} of {totalSteps} steps complete
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Progress Section */}
        <div className="border-b border-border">
          <button
            onClick={() => setProgressOpen(!progressOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary/50"
          >
            <span className="text-sm font-medium text-foreground">Progress</span>
            {progressOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {progressOpen && (
            <div className="px-4 pb-4 space-y-2">
              {progressSteps.map((step) => (
                <ProgressStepItem key={step.id} step={step} />
              ))}
            </div>
          )}
        </div>

        {/* Artifacts Section */}
        <div>
          <button
            onClick={() => setArtifactsOpen(!artifactsOpen)}
            className="flex w-full items-center justify-between border-b border-border px-4 py-3 text-left hover:bg-secondary/50"
          >
            <span className="text-sm font-medium text-foreground">
              Artifacts ({artifacts.length})
            </span>
            {artifactsOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {artifactsOpen && (
            <div className="px-4 pb-4 space-y-2">
              {artifacts.map((artifact) => (
                <ArtifactItem
                  key={artifact.id}
                  artifact={artifact}
                  onClick={() => onArtifactClick?.(artifact)}
                />
              ))}
              {artifacts.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No artifacts yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressStepItem({ step }: { step: ProgressStep }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        {step.completed ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
        ) : (
          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex-1">
          {step.substeps ? (
            <div>
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-1 text-left text-sm"
              >
                <span className={step.completed ? 'text-foreground' : 'text-muted-foreground'}>
                  {step.text}
                </span>
                {open ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
              {open && (
                <div className="ml-2 mt-1 space-y-1 border-l border-border pl-3">
                  {step.substeps.map((substep, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {substep.completed ? (
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-[hsl(var(--success))]" />
                      ) : (
                        <Circle className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      <span
                        className={`text-xs ${
                          substep.completed ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {substep.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span className={`text-sm ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
              {step.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ArtifactItem({ artifact, onClick }: { artifact: Artifact; onClick: () => void }) {
  const icons: Record<string, any> = {
    document: FileText,
    presentation: Presentation,
    spreadsheet: FileSpreadsheet,
    summary: FileCheck,
    'action-items': FileCode,
    meeting: Video,
  };
  const Icon = icons[artifact.type] || FileText;

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2 text-left transition-colors hover:bg-secondary/50 hover:border-primary/30"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{artifact.name}</p>
        <p className="truncate text-xs text-muted-foreground">{artifact.path}</p>
      </div>
    </button>
  );
}
