import { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, Shield, Activity, RefreshCw, X, Save, Clock, AlertTriangle } from 'lucide-react';
import { fetchAgentDetails, fetchAgentBalance, fetchAgentHistory, updateAgentPolicy } from '../api';

interface AgentDetailProps {
    agentId: string;
    onBack: () => void;
}

export default function AgentDetail({ agentId, onBack }: AgentDetailProps) {
    const [agent, setAgent] = useState<any>(null);
    const [balance, setBalance] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isEditingPolicy, setIsEditingPolicy] = useState(false);
    const [policyForm, setPolicyForm] = useState<any>({});
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [agRes, balRes, histRes] = await Promise.all([
                    fetchAgentDetails(agentId),
                    fetchAgentBalance(agentId),
                    fetchAgentHistory(agentId)
                ]);
                setAgent(agRes);
                setBalance(balRes.balances);
                setHistory(histRes.history || []);

                // Initialize form state
                setPolicyForm({
                    maxDailySpendUSDC: agRes.customPolicy?.maxDailySpendUSDC ?? '',
                    maxSingleTxUSDC: agRes.customPolicy?.maxSingleTxUSDC ?? '',
                    maxTransactionsPerMinute: agRes.customPolicy?.maxTransactionsPerMinute ?? '',
                    maxTransactionsPerDay: agRes.customPolicy?.maxTransactionsPerDay ?? '',
                    allowTransfers: agRes.customPolicy?.allowTransfers ?? true,
                    allowSwaps: agRes.customPolicy?.allowSwaps ?? true,
                });
            } catch (err: any) {
                console.error(err);
                setErrorMsg('Failed to load agent details. Make sure you are using an Admin key.');
            }
            setLoading(false);
        };
        loadData();
    }, [agentId]);

    const handleSavePolicy = async () => {
        setSaving(true);
        setErrorMsg('');
        try {
            // Clean empty strings so we don't send malformed numbers
            const payload: any = {};
            if (policyForm.maxDailySpendUSDC !== '') payload.maxDailySpendUSDC = Number(policyForm.maxDailySpendUSDC);
            if (policyForm.maxSingleTxUSDC !== '') payload.maxSingleTxUSDC = Number(policyForm.maxSingleTxUSDC);
            if (policyForm.maxTransactionsPerMinute !== '') payload.maxTransactionsPerMinute = Number(policyForm.maxTransactionsPerMinute);
            if (policyForm.maxTransactionsPerDay !== '') payload.maxTransactionsPerDay = Number(policyForm.maxTransactionsPerDay);

            payload.allowTransfers = Boolean(policyForm.allowTransfers);
            payload.allowSwaps = Boolean(policyForm.allowSwaps);

            await updateAgentPolicy(agentId, payload);
            setIsEditingPolicy(false);

            // Reload agent data eagerly
            const agRes = await fetchAgentDetails(agentId);
            setAgent(agRes);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || 'Failed to update policy.');
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-[var(--accent)] mt-8 slide-up">
                <RefreshCw size={32} className="animate-spin mb-4" />
                <p>Loading Deep Logs...</p>
            </div>
        );
    }

    if (!agent && errorMsg) {
        return (
            <div className="card p-6 border-red-500/30 bg-red-500/5 slide-up">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                    <AlertTriangle size={18} />
                    <strong>Error</strong>
                </div>
                <p className="text-[var(--text-muted)]">{errorMsg}</p>
                <button className="btn mt-4" onClick={onBack}>
                    <ArrowLeft size={16} /> Back to Agents
                </button>
            </div>
        );
    }

    return (
        <div className="agent-detail-page slide-up">
            <div className="flex items-center justify-between mb-6">
                <button className="btn btn-ghost flex items-center gap-2" onClick={onBack}>
                    <ArrowLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-3">
                    <div className={`status-indicator ${agent.active ? 'active' : 'inactive'}`} />
                    <span className="text-sm text-[var(--text-muted)] font-mono">ID: {agent.agentId}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COL: Header & Balances */}
                <div className="col-span-1 flex flex-col gap-6">
                    <div className="card">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">{agent.name}</h2>
                                <p className="text-sm text-[var(--text-muted)] font-mono truncate max-w-[200px]" title={agent.publicKey}>
                                    {agent.publicKey}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Live Balances</h3>
                            {balance ? Object.entries(balance).map(([ticker, amount]) => (
                                <div key={ticker} className="flex justify-between items-center p-3 rounded-lg bg-[var(--bg-lighter)] border border-[var(--border)]">
                                    <span className="font-medium">{ticker}</span>
                                    <span className="font-mono text-lg">{Number(amount).toLocaleString(undefined, { maximumFractionDigits: 5 })}</span>
                                </div>
                            )) : <p className="text-sm text-gray-500">Unavailable</p>}
                        </div>

                        <div className="mt-6 pt-6 border-t border-[var(--border)]">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 flex items-center gap-2">
                                <Activity size={14} /> Today's Usage
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-[var(--bg-lighter)] rounded-lg">
                                    <div className="text-xs text-[var(--text-muted)]">Daily Spend</div>
                                    <div className="font-mono mt-1">${agent.usage?.dailySpendUSDC || 0}</div>
                                </div>
                                <div className="p-3 bg-[var(--bg-lighter)] rounded-lg">
                                    <div className="text-xs text-[var(--text-muted)]">Tx Count</div>
                                    <div className="font-mono mt-1">{agent.usage?.dailyTxCount || 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* POLICY OVERRIDE CONFIGURATOR */}
                    <div className="card relative overflow-hidden">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold flex items-center gap-2">
                                <Shield size={16} className="text-emerald-400" /> Security Limits
                            </h3>
                            {!isEditingPolicy ? (
                                <button className="btn btn-ghost text-xs py-1 px-2 h-auto" onClick={() => setIsEditingPolicy(true)}>
                                    <Edit3 size={14} /> Edit
                                </button>
                            ) : (
                                <button className="btn btn-ghost text-xs py-1 px-2 h-auto text-red-400" onClick={() => setIsEditingPolicy(false)}>
                                    <X size={14} /> Cancel
                                </button>
                            )}
                        </div>

                        {errorMsg && <div className="text-xs text-red-400 mb-4 bg-red-500/10 p-2 rounded">{errorMsg}</div>}

                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-center pb-2 border-b border-[var(--border)]">
                                <span className="text-[var(--text-muted)]">Base Profile</span>
                                <span className="font-mono uppercase px-2 py-0.5 bg-[var(--bg-lighter)] rounded pointer-events-none">
                                    {agent.policyProfile}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center justify-between">
                                    <span className="text-[var(--text-muted)] truncate w-32">Daily Spend Max ($)</span>
                                    {isEditingPolicy ? (
                                        <input type="number" className="input text-right w-24 px-2 py-1 h-auto font-mono text-sm" value={policyForm.maxDailySpendUSDC} onChange={e => setPolicyForm({ ...policyForm, maxDailySpendUSDC: e.target.value })} placeholder="Inherit" />
                                    ) : (
                                        <span className="font-mono">{agent.customPolicy?.maxDailySpendUSDC ?? 'Inherit'}</span>
                                    )}
                                </label>
                                <label className="flex items-center justify-between">
                                    <span className="text-[var(--text-muted)] truncate w-32">Single Tx Max ($)</span>
                                    {isEditingPolicy ? (
                                        <input type="number" className="input text-right w-24 px-2 py-1 h-auto font-mono text-sm" value={policyForm.maxSingleTxUSDC} onChange={e => setPolicyForm({ ...policyForm, maxSingleTxUSDC: e.target.value })} placeholder="Inherit" />
                                    ) : (
                                        <span className="font-mono">{agent.customPolicy?.maxSingleTxUSDC ?? 'Inherit'}</span>
                                    )}
                                </label>
                                <label className="flex items-center justify-between">
                                    <span className="text-[var(--text-muted)] truncate w-32">Daily Txs limit</span>
                                    {isEditingPolicy ? (
                                        <input type="number" className="input text-right w-24 px-2 py-1 h-auto font-mono text-sm" value={policyForm.maxTransactionsPerDay} onChange={e => setPolicyForm({ ...policyForm, maxTransactionsPerDay: e.target.value })} placeholder="Inherit" />
                                    ) : (
                                        <span className="font-mono">{agent.customPolicy?.maxTransactionsPerDay ?? 'Inherit'}</span>
                                    )}
                                </label>
                            </div>

                            <div className="pt-4 border-t border-[var(--border)] space-y-3">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="text-[var(--text-muted)]">Allow Swaps</span>
                                    <input type="checkbox" disabled={!isEditingPolicy} className="w-4 h-4 rounded appearance-none checked:bg-emerald-500 bg-[var(--bg-lighter)] border border-[var(--border)]" checked={policyForm.allowSwaps} onChange={e => setPolicyForm({ ...policyForm, allowSwaps: e.target.checked })} />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="text-[var(--text-muted)]">Allow Transfers</span>
                                    <input type="checkbox" disabled={!isEditingPolicy} className="w-4 h-4 rounded appearance-none checked:bg-emerald-500 bg-[var(--bg-lighter)] border border-[var(--border)]" checked={policyForm.allowTransfers} onChange={e => setPolicyForm({ ...policyForm, allowTransfers: e.target.checked })} />
                                </label>
                            </div>
                        </div>

                        {isEditingPolicy && (
                            <button className="btn w-full mt-6 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" onClick={handleSavePolicy} disabled={saving}>
                                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? 'Saving...' : 'Enforce Custom Limits'}
                            </button>
                        )}
                    </div>
                </div>

                {/* RIGHT COL: History Table */}
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    <div className="card h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Clock size={18} className="text-blue-400" /> Transaction History
                            </h3>
                            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-lighter)] px-2 py-1 rounded-full">Recent 20</span>
                        </div>

                        <div className="flex-1 overflow-auto -mx-2">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center py-16 text-[var(--text-muted)]">
                                    <Activity size={32} className="opacity-20 mb-3" />
                                    <p>No transactions executed yet.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead>
                                        <tr className="text-[var(--text-muted)] border-b border-[var(--border)]">
                                            <th className="font-normal px-4 py-2">Signature</th>
                                            <th className="font-normal px-4 py-2">Type</th>
                                            <th className="font-normal px-4 py-2">Time</th>
                                            <th className="font-normal px-4 py-2 text-right">Fee (SOL)</th>
                                            <th className="font-normal px-4 py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {history.map((tx) => (
                                            <tr key={tx.signature} className="hover:bg-[var(--bg-lighter)] transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs">
                                                    <a href={tx.explorerUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                                                        {tx.signature.substring(0, 12)}...{tx.signature.substring(tx.signature.length - 4)}
                                                    </a>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-xs rounded-full bg-[var(--bg-lighter)] ${tx.typeHint?.includes('Swap') ? 'text-purple-400' : 'text-blue-400'}`}>
                                                        {tx.typeHint || 'Transfer / Unknown'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                                                    {tx.blockTime ? new Date(tx.blockTime).toLocaleString() : 'Pending...'}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-right text-[var(--text-muted)]">
                                                    {(tx.fee / 1e9).toFixed(6)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {tx.err ? (
                                                        <span className="text-red-400 text-xs px-2 py-1 bg-red-400/10 rounded-full">Failed</span>
                                                    ) : (
                                                        <span className="text-emerald-400 text-xs px-2 py-1 bg-emerald-400/10 rounded-full">Success</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
