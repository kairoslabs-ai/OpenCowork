import React, { useState } from 'react';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import type { Plan } from '../../types';

interface PlanReviewProps {
  plan: Plan | null;
  isLoading?: boolean;
  onApprove?: (plan: Plan) => Promise<void>;
  onReject?: (plan: Plan, reason?: string) => Promise<void>;
  onClose?: () => void;
}

/**
 * PlanReview Component - Displays and allows approval/rejection of plans
 */
export const PlanReview: React.FC<PlanReviewProps> = ({
  plan,
  isLoading = false,
  onApprove,
  onReject,
  onClose,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  if (!plan) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">No plan to review</p>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!onApprove) return;

    setApproving(true);
    try {
      await onApprove(plan);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;

    setRejecting(true);
    try {
      await onReject(plan, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Review Plan</h2>
        <p className="text-sm text-gray-500 mt-1">Task ID: {plan.task_id}</p>
      </div>

      {/* Goal */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Goal</h3>
        <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{plan.goal}</p>
      </section>

      {/* Steps */}
      {plan.steps && plan.steps.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Execution Steps</h3>
          <ol className="space-y-3">
            {plan.steps.map((step, index) => (
              <li key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-semibold text-sm">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-grow">
                  <p className="font-medium text-gray-900">{step.action}</p>
                  {step.description && (
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  )}
                  {step.parameters && Object.keys(step.parameters).length > 0 && (
                    <div className="mt-2 bg-gray-50 p-2 rounded text-sm">
                      <p className="font-semibold text-gray-700 mb-1">Parameters:</p>
                      <pre className="text-gray-600 overflow-x-auto">
                        {JSON.stringify(step.parameters, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Metadata */}
      {plan.metadata && Object.keys(plan.metadata).length > 0 && (
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <pre className="text-gray-700 overflow-x-auto">
              {JSON.stringify(plan.metadata, null, 2)}
            </pre>
          </div>
        </section>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        {onClose && (
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Close
          </Button>
        )}
        {onReject && (
          <Button
            variant="danger"
            onClick={() => setShowRejectModal(true)}
            disabled={isLoading || rejecting}
            loading={rejecting}
          >
            Reject
          </Button>
        )}
        {onApprove && (
          <Button
            variant="primary"
            onClick={handleApprove}
            disabled={isLoading || approving}
            loading={approving}
          >
            Approve & Execute
          </Button>
        )}
      </div>

      {/* Rejection Modal */}
      <Modal
        isOpen={showRejectModal}
        title="Reject Plan"
        onClose={() => {
          setShowRejectModal(false);
          setRejectionReason('');
        }}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Reason for rejection (optional)
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why you're rejecting this plan..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={4}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setShowRejectModal(false);
                setRejectionReason('');
              }}
              disabled={rejecting}
            >
              Keep Plan
            </Button>
            <Button
              variant="danger"
              onClick={handleReject}
              disabled={rejecting}
              loading={rejecting}
            >
              Reject Plan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PlanReview;
