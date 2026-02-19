import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, UserPlus, AlertTriangle } from 'lucide-react';
import { flowApi } from '../services/flowApi';
import type { PendingApproval } from '../types/flow';

export const PendingApprovals: React.FC = () => {
    const [approvals, setApprovals] = useState<PendingApproval[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);

    useEffect(() => {
        fetchPendingApprovals();
    }, []);

    const fetchPendingApprovals = async () => {
        try {
            setLoading(true);
            const response = await flowApi.getPendingApprovals();
            setApprovals(response.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load pending approvals');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (approval: PendingApproval) => {
        if (!confirm(`Approve this ${approval.entity_type}?`)) return;

        try {
            setActionInProgress(approval.id);
            await flowApi.performApprovalAction({
                approval_instance_id: approval.id,
                step_id: approval.current_step.id,
                action: 'APPROVE',
                comment: 'Approved via UI',
            });
            await fetchPendingApprovals(); // Refresh list
        } catch (err: any) {
            alert(`Failed to approve: ${err.message}`);
        } finally {
            setActionInProgress(null);
        }
    };

    const handleReject = async (approval: PendingApproval) => {
        const reason = prompt('Enter rejection reason:');
        if (!reason) return;

        try {
            setActionInProgress(approval.id);
            await flowApi.performApprovalAction({
                approval_instance_id: approval.id,
                step_id: approval.current_step.id,
                action: 'REJECT',
                comment: reason,
            });
            await fetchPendingApprovals(); // Refresh list
        } catch (err: any) {
            alert(`Failed to reject: ${err.message}`);
        } finally {
            setActionInProgress(null);
        }
    };

    const handleDelegate = async (approval: PendingApproval) => {
        const userId = prompt('Enter user ID to delegate to:');
        const reason = prompt('Enter delegation reason:');
        if (!userId || !reason) return;

        try {
            setActionInProgress(approval.id);
            await flowApi.performApprovalAction({
                approval_instance_id: approval.id,
                step_id: approval.current_step.id,
                action: 'DELEGATE',
                comment: reason,
                delegate_to_user_id: userId,
            });
            await fetchPendingApprovals(); // Refresh list
        } catch (err: any) {
            alert(`Failed to delegate: ${err.message}`);
        } finally {
            setActionInProgress(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 p-8">
                <div>
                    <div className="animate-pulse space-y-4">
                        <div className="h-10 bg-slate-800 rounded w-64"></div>
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 bg-slate-900 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 p-8">
                <div>
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
                        <p className="text-red-400">{error}</p>
                        <button
                            onClick={fetchPendingApprovals}
                            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div>
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-100 mb-2">Pending Approvals</h1>
                    <p className="text-slate-400">
                        {approvals.length} approval{approvals.length !== 1 ? 's' : ''} awaiting your action
                    </p>
                </div>

                {/* Approvals List */}
                {approvals.length === 0 ? (
                    <div className="text-center py-16 bg-slate-900/30 rounded-lg border border-slate-800">
                        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-300 mb-2">All Caught Up!</h3>
                        <p className="text-slate-500">No pending approvals at this time</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {approvals.map((approval) => (
                            <div
                                key={approval.id}
                                className={`bg-slate-900/50 rounded-lg border ${
                                    approval.is_overdue ? 'border-red-500/50' : 'border-slate-800'
                                } p-6 hover:border-slate-700 transition-colors`}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-slate-100">
                                                {approval.entity_type} #{approval.entity_id.slice(0, 8)}
                                            </h3>
                                            {approval.is_overdue && (
                                                <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs font-medium rounded">
                                                    OVERDUE
                                                </span>
                                            )}
                                            <span className="px-2 py-1 bg-slate-800 text-slate-400 text-xs font-medium rounded uppercase">
                                                {approval.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                <span>
                                                    {approval.time_elapsed_hours}h elapsed
                                                    {approval.sla_hours && ` / ${approval.sla_hours}h SLA`}
                                                </span>
                                            </div>
                                            <div>
                                                Requested {new Date(approval.requested_at).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Entity Data */}
                                {approval.entity_data && Object.keys(approval.entity_data).length > 0 && (
                                    <div className="mb-4 p-4 bg-slate-800/50 rounded-lg">
                                        <div className="text-xs text-slate-500 mb-2">Entity Details:</div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                            {Object.entries(approval.entity_data).slice(0, 6).map(([key, value]) => (
                                                <div key={key}>
                                                    <span className="text-slate-500">{key}: </span>
                                                    <span className="text-slate-300">{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleApprove(approval)}
                                        disabled={actionInProgress === approval.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(approval)}
                                        disabled={actionInProgress === approval.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </button>
                                    {approval.current_step.can_delegate && (
                                        <button
                                            onClick={() => handleDelegate(approval)}
                                            disabled={actionInProgress === approval.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Delegate
                                        </button>
                                    )}
                                </div>

                                {/* SLA Warning */}
                                {approval.is_overdue && (
                                    <div className="mt-4 flex items-start gap-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                                        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-red-300">
                                            This approval has exceeded its SLA of {approval.sla_hours} hours.
                                            Immediate action required.
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
