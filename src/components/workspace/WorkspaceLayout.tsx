import { useState, useEffect } from 'react';
import { PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from 'lucide-react';
import { Button } from '../common/Button';
import { ChatPanel } from './ChatPanel';
import { PreviewPanel } from './PreviewPanel';
import { ProgressSidebar } from './ProgressSidebar';
import { useTask } from '../../hooks/useTask';
import type { Message, ProgressStep, Artifact } from './types';

export function WorkspaceLayout() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [currentTask, setCurrentTask] = useState<any>(null);

  const { getTasks } = useTask();

  useEffect(() => {
    // Load initial tasks
    const loadTasks = async () => {
      const allTasks = await getTasks();
      if (allTasks && allTasks.length > 0) {
        setCurrentTask(allTasks[0]);
        initializeFromTask(allTasks[0]);
      }
    };
    loadTasks();
  }, []);

  const initializeFromTask = (task: any) => {
    // Initialize messages from task
    const initialMessages: Message[] = [
      {
        id: '1',
        role: 'user',
        content: task.description || 'Process this task',
        timestamp: new Date(task.created_at || Date.now()),
      },
    ];

    if (task.plan) {
      initialMessages.push({
        id: '2',
        role: 'assistant',
        content: `Plan created: ${task.plan.title || 'Task Plan'}`,
        highlights: task.plan.steps || [],
        timestamp: new Date(),
      });
    }

    setMessages(initialMessages);

    // Initialize progress steps from plan
    if (task.plan?.steps) {
      const steps: ProgressStep[] = task.plan.steps.map((step: any, idx: number) => ({
        id: `step-${idx}`,
        text: step,
        completed: idx < (task.current_step || 0),
      }));
      setProgressSteps(steps);
    }

    // Initialize artifacts
    const initialArtifacts: Artifact[] = [];
    if (task.plan) {
      initialArtifacts.push({
        id: 'plan-1',
        name: task.plan.title || 'Task Plan',
        type: 'document',
        path: `/output/plan-${task.id}.md`,
        createdAt: new Date(task.created_at || Date.now()),
      });
    }
    setArtifacts(initialArtifacts);
  };

  const handleSendMessage = async (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Simulate or call backend for assistant response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Processing your request through the OpenCowork system...',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, response]);
    }, 500);
  };

  const handleArtifactClick = (artifact: Artifact) => {
    console.log('Artifact clicked:', artifact);
    // Handle artifact viewing
  };

  const panelClassName = (isOpen: boolean, width: string) => {
    return `flex shrink-0 flex-col border-r border-border transition-all duration-300 ${isOpen ? width : 'w-0'} overflow-hidden`;
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Left Panel - Chat */}
      <div className={panelClassName(leftPanelOpen, 'w-[380px]')}>
        {leftPanelOpen && (
          <ChatPanel messages={messages} onSendMessage={handleSendMessage} />
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

        <PreviewPanel currentTask={currentTask} artifacts={artifacts} />
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
