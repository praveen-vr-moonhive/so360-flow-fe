import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, CheckCircle, Clock } from 'lucide-react';
import { flowApi } from '../services/flowApi';
import type { FlowInstance, FlowDefinition } from '../types/flow';

export const InstanceList = () => {
    const navigate = useNavigate();
    const [instances, setInstances] = useState<FlowInstance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadInstances();
    }, []);

    const loadInstances = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get all flow definitions first
            const defsResponse = await flowApi.getFlowDefinitions();
            const allDefinitions = defsResponse.data;

            // For demo purposes, we'll show placeholder message
            // In production, you'd need a backend endpoint to list all instances
            // For now, we'll just show an empty state with instructions
            setInstances([]);
        } catch (err: any) {
            console.error('Failed to load instances:', err);
            setError(err.response?.data?.message || 'Failed to load instances');
        } finally {
            setLoading(false);
        }
    };

    const getStateName = (instance: FlowInstance) => {
        const flowDef = instance.flows as unknown as FlowDefinition;
        const state = flowDef?.states?.find((s) => s.code === instance.current_state);
        return state?.name || instance.current_state;
    };

    const isCompleted = (instance: FlowInstance) => !!instance.completed_at;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center py-12">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
                            <Activity className="w-8 h-8 text-blue-500" />
                            Flow Instances
                        </h1>
                        <p className="text-slate-400 mt-2">
                            View and manage active workflow instances
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/flow')}
                        className="px-4 py-2 bg-slate-800 text-slate-100 rounded-lg hover:bg-slate-700"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {error && (
                    <div className="mb-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                        <p className="text-red-400">{error}</p>
                    </div>
                )}

                {/* Instances Grid */}
                {instances.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-12 text-center">
                        <Activity className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg mb-2">No flow instances found</p>
                        <p className="text-slate-500 text-sm">
                            Flow instances are created when a workflow is started for an entity.
                        </p>
                        <p className="text-slate-500 text-sm mt-2">
                            To view an instance, use the direct URL: /flow/instance/{'<instance-id>'}
                        </p>
                        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg text-left max-w-2xl mx-auto">
                            <p className="text-blue-400 text-sm font-semibold mb-2">
                                💡 Developer Note
                            </p>
                            <p className="text-slate-400 text-sm">
                                This page requires a backend endpoint to list all instances for the
                                organization. The endpoint would need to be added to the Flow backend:
                            </p>
                            <pre className="text-xs text-slate-300 bg-slate-950 rounded p-3 mt-3 overflow-auto">
{`GET /api/flow/instances?org_id=<org>
Response: FlowInstance[]`}
                            </pre>
                            <p className="text-slate-400 text-sm mt-3">
                                Currently, instances can be accessed directly via URL when you know the
                                instance ID.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {instances.map((instance) => {
                            const flowDef = instance.flows as unknown as FlowDefinition;
                            const completed = isCompleted(instance);

                            return (
                                <div
                                    key={instance.id}
                                    className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 hover:border-blue-500 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/flow/instance/${instance.id}`)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-slate-100">
                                                    {flowDef?.name || 'Unknown Flow'}
                                                </h3>
                                                {completed ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {flowDef?.module_code || 'N/A'}
                                            </div>
                                        </div>
                                        <button
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/flow/instance/${instance.id}`);
                                            }}
                                        >
                                            <Eye className="w-4 h-4" />
                                            View
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Current State</div>
                                            <div className="text-cyan-400 font-medium">
                                                {getStateName(instance)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Entity Type</div>
                                            <div className="text-slate-300">{instance.entity_type}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Started At</div>
                                            <div className="text-slate-300">
                                                {new Date(instance.started_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Instance ID</div>
                                            <div className="text-slate-400 font-mono text-xs truncate">
                                                {instance.id}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
