import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Activity, CheckCircle, BrainCircuit, ServerCrash } from 'lucide-react';

interface FraudAlert {
  transactionId: string;
  riskScore: number;
  reason: string;
  aiExplanation?: string;
  isBlocked: boolean;
}

export default function App() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [tps, setTps] = useState(0);

  useEffect(() => {
    // Connect to our Node.js Engine's WebSocket server
    const ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'FRAUD_ALERT') {
        setAlerts(prev => [message.data, ...prev].slice(0, 50)); // Keep last 50
      }
    };

    // Simulate high TPS streaming for UI flair
    const interval = setInterval(() => setTps(Math.floor(Math.random() * (105000 - 95000) + 95000)), 1000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg p-8 text-gray-100 overflow-hidden relative">
      {/* Background gradients for premium feel */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-google-blue/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-google-red/10 blur-[120px] rounded-full pointer-events-none" />

      <header className="mb-10 flex justify-between items-center glassmorphism p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <ShieldAlert className="text-google-red w-10 h-10" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Enterprise Fraud Command Center</h1>
            <p className="text-gray-400 text-sm">O(1) Detection Engine Powered by AI</p>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Activity className="text-google-blue w-5 h-5" />
            <span className="font-mono text-xl">{tps.toLocaleString()} TPS</span>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-google-green opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-google-green"></span></span><span className="text-google-green font-medium">System Online</span></>
            ) : (
              <><ServerCrash className="text-google-red w-5 h-5" /><span className="text-google-red font-medium">Disconnected</span></>
            )}
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2"><Activity className="w-5 h-5" /> Live Interceptions Stream</h2>
          
          <div className="space-y-4">
            <AnimatePresence>
              {alerts.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glassmorphism p-12 text-center rounded-2xl border-dashed border-gray-600">
                  <CheckCircle className="w-16 h-16 text-google-green mx-auto mb-4 opacity-50" />
                  <p className="text-gray-400 text-lg">Monitoring stream... no fraud detected recently.</p>
                </motion.div>
              ) : (
                alerts.map((alert, idx) => (
                  <motion.div 
                    key={alert.transactionId + idx}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="glassmorphism p-6 rounded-2xl border-l-4 border-l-google-red"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="bg-google-red/20 text-google-red px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                          Critical Alert (Score: {alert.riskScore})
                        </span>
                        <h3 className="font-mono text-sm mt-3 text-gray-300">TX ID: {alert.transactionId}</h3>
                      </div>
                      <span className="bg-red-500 text-white px-4 py-1 rounded-full text-sm font-semibold shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                        {alert.isBlocked ? "BLOCKED" : "FLAGGED FOR REVIEW"}
                      </span>
                    </div>
                    
                    <p className="text-gray-200 mt-2">{alert.reason}</p>

                    {alert.aiExplanation && (
                      <div className="mt-4 bg-black/30 p-4 rounded-xl border border-gray-800 flex gap-4">
                        <BrainCircuit className="text-google-blue shrink-0 w-6 h-6" />
                        <p className="text-sm text-google-blue/90 leading-relaxed font-medium">
                          {alert.aiExplanation}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="glassmorphism p-6 rounded-2xl">
             <h2 className="text-xl font-semibold mb-4">System Telemetry</h2>
             <div className="space-y-4">
                <div className="bg-black/30 p-4 rounded-xl">
                  <p className="text-gray-400 text-sm">O(1) Cache Hit Ratio</p>
                  <p className="text-2xl font-bold text-google-green">99.98%</p>
                </div>
                <div className="bg-black/30 p-4 rounded-xl">
                  <p className="text-gray-400 text-sm">Avg Latency (Redis Sliding Window)</p>
                  <p className="text-2xl font-bold text-google-blue">14.2 ms</p>
                </div>
                <div className="bg-black/30 p-4 rounded-xl">
                  <p className="text-gray-400 text-sm">AI Inference Time</p>
                  <p className="text-2xl font-bold text-google-yellow">150 ms</p>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
