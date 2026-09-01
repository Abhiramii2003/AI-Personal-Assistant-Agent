import React from 'react';

/**
 * ToolActivity Component
 * 
 * Displays the agent's real-time internal workflow steps and tool decisions.
 * This makes the agent orchestration and planning visible to the user.
 */
function ToolActivity({ steps = [], toolUsed, isThinking }) {
  if (!steps.length && !isThinking) {
    return null;
  }

  const getToolIcon = (tool) => {
    switch (tool) {
      case 'calculator':
        return 'bi-calculator-fill text-primary';
      case 'dateTime':
        return 'bi-calendar2-week-fill text-warning';
      case 'taskManager':
        return 'bi-check2-square text-success';
      default:
        return 'bi-cpu-fill text-info';
    }
  };

  const formatStep = (step) => {
    if (step.startsWith('Received')) return { icon: 'bi-box-arrow-in-right text-muted', text: step };
    if (step.startsWith('Analyzed') || step.startsWith('Planned')) return { icon: 'bi-diagram-3-fill text-primary', text: step };
    if (step.startsWith('Selected tool') || step.startsWith('Executed')) return { icon: 'bi-gear-wide-connected text-success', text: step };
    if (step.startsWith('Synthesizing') || step.startsWith('Generated')) return { icon: 'bi-chat-left-text-fill text-info', text: step };
    return { icon: 'bi-check-circle-fill text-success', text: step };
  };

  return (
    <div className="activity-card p-3 mb-3 shadow-sm border-start border-primary border-4">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-robot text-primary fs-5"></i>
          <span className="fw-semibold text-dark small">Agent Activity & Orchestration Trace</span>
        </div>
        {toolUsed && (
          <span className="badge bg-light text-dark border">
            <i className={`bi ${getToolIcon(toolUsed)} me-1`}></i>
            Tool: {toolUsed}
          </span>
        )}
      </div>

      <div className="d-flex flex-column gap-1">
        {steps.map((step, idx) => {
          const { icon, text } = formatStep(step);
          return (
            <div key={idx} className="activity-step">
              <i className={`bi ${icon}`}></i>
              <span className="small">{text}</span>
            </div>
          );
        })}

        {isThinking && (
          <div className="activity-step text-primary">
            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            <span className="small fw-semibold">Agent is thinking and processing tools...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default ToolActivity;
