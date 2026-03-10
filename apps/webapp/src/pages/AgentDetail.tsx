import { useState, useEffect } from 'react';
import { ArrowLeft, Edit3, Shield, Activity, X, Save, Clock, AlertTriangle } from 'lucide-react';
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
            const payload: any = {};
            if (policyForm.maxDailySpendUSDC !== '') payload.maxDailySpendUSDC = Number(policyForm.maxDailySpendUSDC);
            if (policyForm.maxSingleTxUSDC !== '') payload.maxSingleTxUSDC = Number(policyForm.maxSingleTxUSDC);
            if (policyForm.maxTransactionsPerMinute !== '') payload.maxTransactionsPerMinute = Number(policyForm.maxTransactionsPerMinute);
            if (policyForm.maxTransactionsPerDay !== '') payload.maxTransactionsPerDay = Number(policyForm.maxTransactionsPerDay);

            payload.allowTransfers = Boolean(policyForm.allowTransfers);
            payload.allowSwaps = Boolean(policyForm.allowSwaps);

            await updateAgentPolicy(agentId, payload);
            setIsEditingPolicy(false);

            const agRes = await fetchAgentDetails(agentId);
            setAgent(agRes);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.message || 'Failed to update policy.');
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="empty" style={{ marginTop: '100px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }}></div>
                </div>
                <h2>Loading Agent Data...</h2>
                <p className="card-sub">Fetching configuration and logs</p>
            </div>
        );
    }

    if (!agent && errorMsg) {
        return (
            <div className="page-content">
                <div className="alert error">
                    <AlertTriangle size={18} />
                    <div style={{ paddingLeft: '8px' }}>
                        <strong>Error</strong>
                        <p>{errorMsg}</p>
                    </div>
                </div>
                <button className="btn btn-ghost" onClick={onBack} style={{ marginTop: '20px' }}>
                    <ArrowLeft size={16} /> Back to Fleet
                </button>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ display: 'flex', marginBottom: '24px' }}>
                <button className="btn btn-ghost" onClick={onBack}>
                    <ArrowLeft size={16} /> Back to Fleet
                </button>
            </div>

            {/* HERO IDENTITY CARD */}
            <div className="card" style={{ marginBottom: '24px', display: 'flex', gap: '24px', alignItems: 'center' }}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: '12px',
                    background: 'var(--surface2)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)'
                }}>
                    <Shield size={32} style={{ color: 'var(--accent)' }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>{agent.name}</h2>
                        <span className="pill blue" style={{ textTransform: 'uppercase' }}>
                            {agent.policyProfile}
                        </span>
                        <div style={{ marginLeft: 'auto' }}>
                            {agent.active ? (
                                <span className="pill green">Active</span>
                            ) : (
                                <span className="pill red">Inactive</span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                        <div className="card-sub" style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '10px', marginTop: 0 }}>Vault Address</div>
                        <span className="addr" style={{ width: 'fit-content', padding: '6px 12px', fontSize: '13px' }}>
                            {agent.publicKey}
                        </span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px' }}>
                {/* LEFT COL: Header & Balances */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* LIVE BALANCES CARD */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={16} /> Live Balances
                            </div>
                        </div>
                        {balance && Object.keys(balance).length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {Object.entries(balance).map(([ticker, amount]) => (
                                    <div key={ticker} style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        padding: '12px 16px', background: 'var(--surface2)',
                                        borderRadius: '8px', border: '1px solid var(--border)',
                                        alignItems: 'center'
                                    }}>
                                        <span style={{ fontWeight: 600 }}>{ticker}</span>
                                        <span className="mono" style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                            {Number(amount).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty" style={{ padding: '20px 0' }}>
                                <p>Scanning vault reserves...</p>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="card" style={{ padding: '16px' }}>
                            <div className="card-title" style={{ fontSize: '11px', marginBottom: '8px' }}>24H USD VOL</div>
                            <div className="card-value" style={{ fontSize: '20px' }}>${agent.usage?.dailySpendUSDC || 0}</div>
                        </div>
                        <div className="card" style={{ padding: '16px' }}>
                            <div className="card-title" style={{ fontSize: '11px', marginBottom: '8px' }}>DAILY EXECS</div>
                            <div className="card-value" style={{ fontSize: '20px' }}>{agent.usage?.dailyTxCount || 0}</div>
                        </div>
                    </div>

                    {/* POLICY OVERRIDE */}
                    <div className="card">
                        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={16} /> Operational Limits
                            </div>
                            {!isEditingPolicy ? (
                                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingPolicy(true)}>
                                    <Edit3 size={14} /> Tweak
                                </button>
                            ) : (
                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setIsEditingPolicy(false)}>
                                    <X size={14} /> Cancel
                                </button>
                            )}
                        </div>

                        {errorMsg && <div className="alert error">{errorMsg}</div>}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[
                                { label: 'Daily Spend Max ($)', key: 'maxDailySpendUSDC' },
                                { label: 'Single Tx Max ($)', key: 'maxSingleTxUSDC' },
                                { label: 'Daily Txs Limit', key: 'maxTransactionsPerDay' }
                            ].map(({ label, key }) => (
                                <div className="form-group" key={key} style={{ marginBottom: 0 }}>
                                    <label>{label}</label>
                                    {isEditingPolicy ? (
                                        <input type="number"
                                            value={policyForm[key]}
                                            onChange={e => setPolicyForm({ ...policyForm, [key]: e.target.value })}
                                            placeholder="Inherit Baseline"
                                            style={{ fontFamily: 'var(--mono)' }}
                                        />
                                    ) : (
                                        <div style={{
                                            background: 'var(--surface2)', border: '1px solid var(--border)',
                                            borderRadius: '8px', padding: '9px 13px',
                                            fontFamily: 'var(--mono)', fontSize: '13.5px', color: 'var(--text)'
                                        }}>
                                            {agent.customPolicy?.[key] ?? <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Inherit Baseline</span>}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingPolicy ? 'pointer' : 'default' }}>
                                        <input type="checkbox"
                                            disabled={!isEditingPolicy}
                                            checked={policyForm.allowSwaps}
                                            onChange={e => setPolicyForm({ ...policyForm, allowSwaps: e.target.checked })}
                                            style={{ width: 'auto', marginBottom: '2px' }}
                                        />
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>ALLOW SWAPS</span>
                                    </label>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditingPolicy ? 'pointer' : 'default' }}>
                                        <input type="checkbox"
                                            disabled={!isEditingPolicy}
                                            checked={policyForm.allowTransfers}
                                            onChange={e => setPolicyForm({ ...policyForm, allowTransfers: e.target.checked })}
                                            style={{ width: 'auto', marginBottom: '2px' }}
                                        />
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>ALLOW TRANSFERS</span>
                                    </label>
                                </div>
                            </div>

                            {isEditingPolicy && (
                                <button className="btn btn-primary" style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }} onClick={handleSavePolicy} disabled={saving}>
                                    {saving ? <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }}></div> : <Save size={16} />}
                                    {saving ? 'Saving...' : 'Save Override'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COL: History Table */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px', padding: 0 }}>
                    <div className="card-header" style={{ padding: '20px 24px', margin: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface2)', borderTopLeftRadius: '10px', borderTopRightRadius: '10px' }}>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} /> Execution Ledger
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="pill" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>20 max</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }}></div>
                                <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Online</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {history.length === 0 ? (
                            <div className="empty" style={{ paddingTop: '100px' }}>
                                <Activity size={32} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                <p>Awaiting first execution block...</p>
                            </div>
                        ) : (
                            <div className="table-wrap">
                                <table style={{ width: '100%' }}>
                                    <thead style={{ background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
                                        <tr>
                                            <th>Signature</th>
                                            <th>Operation</th>
                                            <th>Block Time</th>
                                            <th style={{ textAlign: 'right' }}>Fee (SOL)</th>
                                            <th style={{ textAlign: 'center' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((tx) => (
                                            <tr key={tx.signature}>
                                                <td className="mono">
                                                    <a href={tx.explorerUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                                                        {tx.signature.substring(0, 16)}...
                                                    </a>
                                                </td>
                                                <td>
                                                    <span className={`pill ${tx.typeHint?.includes('Swap') ? 'blue' : 'yellow'}`}>
                                                        {tx.typeHint || 'Transfer'}
                                                    </span>
                                                </td>
                                                <td className="mono text-muted">
                                                    {new Date(tx.timestamp * 1000).toLocaleString()}
                                                </td>
                                                <td className="mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>
                                                    {(tx.fee / 1e9).toFixed(5)}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {tx.status === 'Success' ? (
                                                        <span className="pill green">Success</span>
                                                    ) : (
                                                        <span className="pill red">Failed</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
