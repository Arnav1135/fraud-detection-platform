import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldAlert, Activity, CheckCircle, BrainCircuit,
    ServerCrash, GitBranch, Layers, Database, Cpu, Network
} from 'lucide-react';

interface FraudAlert {
    transactionId: string;
    riskScore: number;
    reason: string;
    aiExplanation?: string;
    isBlocked: boolean;
    detectedBy: string;
}

interface Stats {
    totalProcessed: number;
    totalBlocked: number;
    avgLatencyMs: number;
    bloomFilterSaved: number;
    lruHitRatio: number;
}

const DETECTOR_BADGE: Record<string, { label: string; color: string }> = {
    BloomFilter: { label: 'Bloom Filter (L1)', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    'BloomFilter+LRU': { label: 'Bloom + LRU (L1/L2)', color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
    Redis: { label: 'Redis Window (L3)', color: 'bg-red-500/20 text-red-300 border-red-500/40' },
    TwoSumSlidingWindow: { label: 'Two-Sum Algorithm', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
    GraphDFS: { label: 'Graph DFS Ring', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
    VelocityCheck: { label: 'Velocity Check', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
};

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
    return (
        <div className="glassmorphism p-4 rounded-xl flex items-center gap-4">
            <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
                <p className="text-gray-400 text-xs">{label}</p>
                <p className="text-white font-bold text-lg font-mono">{value}</p>
            </div>
        </div>
    );
}

export default function App() {
    const [alerts, setAlerts] = useState<FraudAlert[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [stats, setStats] = useState<Stats>({
        totalProcessed: 0, totalBlocked: 0,
        avgLatencyMs: 0, bloomFilterSaved: 0, lruHitRatio: 0
    });
    const tpsRef = useRef(0);
    const [tps, setTps] = useState(0);

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:3000');
        ws.onopen = () => setIsConnected(true);
        ws.onclose = () => setIsConnected(false);
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'FRAUD_ALERT') {
                setAlerts(prev => [msg.data as FraudAlert, ...prev].slice(0, 100));
                setStats(prev => ({
                    ...prev,
                    totalProcessed: prev.totalProcessed + 1,
                    totalBlocked: prev.totalBlocked + 1,
                }));
            }
        };
        // Simulate TPS for demo
        const interval = setInterval(() => {
            tpsRef.current = Math.floor(Math.random() * 8000 + 95000);
            setTps(tpsRef.current);
            setStats(prev => ({
                ...prev,
                totalProcessed: prev.totalProcessed + tpsRef.current,
                avgLatencyMs: parseFloat((Math.random() * 5 + 12).toFixed(1)),
                bloomFilterSaved: parseFloat((99.1 + Math.random() * 0.8).toFixed(2)),
                lruHitRatio: parseFloat((94 + Math.random() * 4).toFixed(1)),
            }));
        }, 1000);
        return () => { ws.close(); clearInterval(interval); };
    }, []);

    const scoreColor = (score: number) =>
        score >= 95 ? 'text-red-400' : score >= 85 ? 'text-orange-400' : 'text-yellow-400';

    return (
        <div className="min-h-screen bg-[#0a0a0f] p-6 text-gray-100 relative overflow-hidden">
            {/* Ambient gradients */}
            <div className="pointer-events-none fixed inset-0">
                <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-blue-600/10 blur-[140px] rounded-full" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] bg-red-600/10 blur-[140px] rounded-full" />
                <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-purple-600/8 blur-[100px] rounded-full" />
            </div>

            {/* Header */}
            <header className="relative z-10 mb-6 flex justify-between items-center glassmorphism px-6 py-4 rounded-2xl">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <ShieldAlert className="text-red-400 w-9 h-9" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Fraud Command Center</h1>
                        <p className="text-gray-500 text-xs">5-Layer Detection · Bloom Filter · LRU · Redis · Two-Sum · Graph DFS</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-gray-500 text-xs">Throughput</p>
                        <p className="font-mono text-green-400 font-bold">{tps.toLocaleString()} TPS</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <>
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
                                </span>
                                <span className="text-green-400 text-sm font-medium">Live</span>
                            </>
                        ) : (
                            <><ServerCrash className="text-red-400 w-5 h-5" /><span className="text-red-400 text-sm">Offline</span></>
                        )}
                    </div>
                </div>
            </header>

            {/* Stats Row */}
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <StatCard icon={Activity} label="Transactions Processed" value={stats.totalProcessed.toLocaleString()} color="text-blue-400" />
                <StatCard icon={ShieldAlert} label="Blocked" value={stats.totalBlocked.toLocaleString()} color="text-red-400" />
                <StatCard icon={Cpu} label="Avg Latency" value={`${stats.avgLatencyMs} ms`} color="text-green-400" />
                <StatCard icon={Database} label="Bloom Filter Saved" value={`${stats.bloomFilterSaved}%`} color="text-purple-400" />
                <StatCard icon={Layers} label="LRU Hit Ratio" value={`${stats.lruHitRatio}%`} color="text-yellow-400" />
            </div>

            {/* Main content */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Alert Feed */}
                <div className="lg:col-span-2 space-y-3">
                    <h2 className="font-semibold text-gray-300 flex items-center gap-2 mb-4">
                        <Network className="w-4 h-4 text-red-400" /> Live Interception Feed
                    </h2>
                    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                        <AnimatePresence>
                            {alerts.length === 0 ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glassmorphism p-12 text-center rounded-2xl border border-dashed border-white/10">
                                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-40" />
                                    <p className="text-gray-500">Monitoring stream... all systems clean.</p>
                                </motion.div>
                            ) : alerts.map((alert, idx) => {
                                const badge = DETECTOR_BADGE[alert.detectedBy] ?? { label: alert.detectedBy, color: 'bg-gray-500/20 text-gray-300 border-gray-500/40' };
                                return (
                                    <motion.div
                                        key={alert.transactionId + idx}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                                        className="glassmorphism p-5 rounded-xl border-l-4 border-l-red-500"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                                <span className={`font-bold text-sm ${scoreColor(alert.riskScore)}`}>
                                                    Score: {alert.riskScore}
                                                </span>
                                            </div>
                                            <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${alert.isBlocked ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'}`}>
                                                {alert.isBlocked ? '🚫 BLOCKED' : '⚠ REVIEW'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-mono text-gray-500 mb-1">TX: {alert.transactionId}</p>
                                        <p className="text-gray-200 text-sm">{alert.reason}</p>
                                        {alert.aiExplanation && (
                                            <div className="mt-3 bg-blue-950/40 border border-blue-500/20 p-3 rounded-lg flex gap-3">
                                                <BrainCircuit className="text-blue-400 w-4 h-4 shrink-0 mt-0.5" />
                                                <p className="text-xs text-blue-300 leading-relaxed">{alert.aiExplanation}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Detection Layer Architecture */}
                <div className="space-y-4">
                    <h2 className="font-semibold text-gray-300 flex items-center gap-2 mb-4">
                        <GitBranch className="w-4 h-4 text-purple-400" /> Detection Pipeline
                    </h2>
                    {[
                        { layer: 'L1', name: 'Bloom Filter', complexity: 'O(k)', desc: 'Probabilistic dedup · ~99% cache saves', color: 'border-purple-500/40 bg-purple-500/5' },
                        { layer: 'L2', name: 'LRU Cache', complexity: 'O(1)', desc: 'In-process exact match · hot key fast path', color: 'border-pink-500/40 bg-pink-500/5' },
                        { layer: 'L3', name: 'Redis Window', complexity: 'O(1)', desc: 'Distributed sliding window across nodes', color: 'border-red-500/40 bg-red-500/5' },
                        { layer: 'L4', name: 'Two-Sum Detector', complexity: 'O(n)', desc: 'AML structuring detection via pair map', color: 'border-orange-500/40 bg-orange-500/5' },
                        { layer: 'L5', name: 'Graph DFS', complexity: 'O(V+E)', desc: 'Circular money mule ring detection', color: 'border-yellow-500/40 bg-yellow-500/5' },
                        { layer: 'AI', name: 'LLM Explainer', complexity: 'async', desc: 'Human-readable analyst report generation', color: 'border-blue-500/40 bg-blue-500/5' },
                    ].map((item) => (
                        <div key={item.layer} className={`glassmorphism p-4 rounded-xl border ${item.color} flex items-start gap-3`}>
                            <span className="text-xs font-bold font-mono bg-white/10 px-2 py-1 rounded mt-0.5">{item.layer}</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">{item.name}</p>
                                    <span className="text-xs font-mono text-gray-500">{item.complexity}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
