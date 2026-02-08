import { useState, useEffect } from 'react';
import { PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from 'lucide-react';
import { Button } from '../common/Button';
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { ProgressSidebar } from './ProgressSidebar';
import { useTask } from '../../hooks/useTask';
import { apiClient } from '../../services/api';
import type { Message, ProgressStep, Artifact } from './types';

export function WorkspaceLayout() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [plan, setPlan] = useState<any>(null);

  const { getTasks, createTask } = useTask();

  // Load initial tasks on mount
  useEffect(() => {
    const loadInitialTasks = async () => {
      try {
        const tasks = await getTasks();
        if (tasks && tasks.length > 0) {
          setCurrentTask(tasks[0]);
          await initializeTask(tasks[0]);
        }
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setIsLoadingTasks(false);
      }
    };

    loadInitialTasks();
  }, [getTasks]);

  // Initialize UI when task is set
  const initializeTask = async (task: any) => {
    try {
      // Fetch the plan for this task
      const planData = await apiClient.getPlan(task.task_id);
      setPlan(planData);

      // Initialize messages
      const initialMessages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: task.goal || 'Process this task',
          timestamp: new Date(task.created_at || Date.now()),
        },
      ];

      if (planData?.steps && planData.steps.length > 0) {
        initialMessages.push({
          id: '2',
          role: 'assistant',
          content: `I've created a plan with ${planData.steps.length} steps.`,
          highlights: planData.steps.map((s: any) => s.action || s.tool),
          timestamp: new Date(),
        });
      }

      setMessages(initialMessages);

      // Initialize progress steps from plan
      if (planData?.steps) {
        const steps: ProgressStep[] = planData.steps.map(
          (step: any, idx: number) => ({
            id: `step-${idx}`,
            text: `${step.tool}: ${step.action}`,
            completed: false,
            substeps: step.parameters
              ? Object.entries(step.parameters).map(([key, value]) => ({
                  text: `${key}: ${value}`,
                  completed: false,
                }))
              : undefined,
          })
        );
        setProgressSteps(steps);
      }

      // Initialize artifacts
      const initialArtifacts: Artifact[] = [
        {
          id: 'plan-1',
          name: 'Execution Plan',
          type: 'document',
          path: `/tasks/${task.task_id}/plan`,
          createdAt: new Date(),
        },
      ];
      setArtifacts(initialArtifacts);
    } catch (err) {
      console.error('Failed to initialize task:', err);
      // Still show basic task info even if plan fetch fails
      setMessages([
        {
          id: '1',
          role: 'user',
          content: task.goal || 'Process this task',
          timestamp: new Date(task.created_at || Date.now()),
        },
      ]);
    }
  };

  const handleSendMessage = async (content: string) => {
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Create task from message
    setIsCreatingTask(true);
    try {
      const newTask = await createTask({
        goal: content,
        description: content,
      });

      setCurrentTask(newTask);

      // Add loading message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Creating task plan...',
          timestamp: new Date(),
        },
      ]);

      // Initialize the new task
      await initializeTask(newTask);
    } catch (err) {
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Error creating task: ${err instanceof Error ? err.message : 'Unknown error'}`,
          timestamp: new Date(),
        },
      ]);
      console.error('Failed to create task:', err);
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleExecuteTask = async () => {
    if (!currentTask) return;

    try {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Starting task execution...',
          timestamp: new Date(),
        },
      ]);

      await apiClient.executeTask(currentTask.task_id);

      // Start polling for status
      const pollInterval = setInterval(async () => {
        try {
          const status = await apiClient.getExecutionStatus(currentTask.task_id);
          setCurrentTask((prev: any) => ({ ...prev, status: status.status }));

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);

            // Fetch final result
            try {
              const result = await apiClient.getExecutionResult(currentTask.task_id);
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: `Task ${status.status}: ${result.result || result.error}`,
                  timestamp: new Date(),
                },
              ]);
            } catch (err) {
              console.error('Failed to fetch result:', err);
            }
          }
        } catch (err) {
          console.error('Failed to check status:', err);
          clearInterval(pollInterval);
        }
      }, 2000);

      // Clear interval after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Execution error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          timestamp: new Date(),
        },
      ]);
      console.error('Failed to execute task:', err);
    }
  };

  const handleArtifactClick = (artifact: Artifact) => {
    console.log('Artifact clicked:', artifact);
  };

  const panelClassName = (isOpen: boolean, width: string) => {
    return `flex shrink-0 flex-col border-r border-border transition-all duration-300 ${isOpen ? width : 'w-0'} overflow-hidden`;
  };

  if (isLoadingTasks) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Left Panel - Chat */}
      <div className={panelClassName(leftPanelOpen, 'w-[380px]')}>
        {leftPanelOpen && (
          <ChatPanel 
            messages={messages} 
            onSendMessage={handleSendMessage}
            isLoading={isCreatingTask}
          />
        )}
      </div>

      {/* Center Panel - Preview */}
      <div className="relative flex flex-1 flex-col">
        {/* Toggle Buttons */}
        <div className="absolute left-2 top-2 z-10 flex gap-1">
          <Button
            variant="ghost"
            className="h-8 w-8 bg-card/80 backdrop-blur-sm hover:bg-card"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          >
            {leftPanelOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          <Button
            variant="ghost"
            className="h-8 w-8 bg-card/80 backdrop-blur-sm hover:bg-card"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
          >
            {rightPanelOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        <PreviewPanel 
          currentTask={currentTask} 
          artifacts={artifacts}
          plan={plan}
          onExecute={handleExecuteTask}
        />
      </div>

      {/* Right Panel - Progress */}
      <div className={panelClassName(rightPanelOpen, 'w-[300px]')}>
        {rightPanelOpen && (
          <ProgressSidebar
            progressSteps={progressSteps}
            artifacts={artifacts}
            onArtifactClick={handleArtifactClick}
          />
        )}
      </div>
    </div>
  );
}
