import React, { useEffect, useState } from 'react';
import { Network, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, X, Play, Zap, ShieldAlert, Cpu } from 'lucide-react';

export default function DagDependencyModal({ dagId, onClose, onTriggerDag, onDiagnoseDag }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!dagId) return;

    setLoading(true);
    setError(null);

    fetch(`http://localhost:8000/api/dags/${encodeURIComponent(dagId)}/dependencies`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setGraphData(data);
        const target = data.nodes?.find((n) => n.type === 'target') || data.nodes?.[0];
        setSelectedNode(target);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load DAG dependencies:', err);
        setError('Failed to load dependency graph. Please check backend proxy connection.');
        setLoading(false);
      });
  }, [dagId]);

  if (!dagId) return null;

  const upstreamNodes = graphData?.nodes?.filter((n) => n.type === 'upstream') || [];
  const targetNode = graphData?.nodes?.find((n) => n.type === 'target');
  const downstreamNodes = graphData?.nodes?.filter((n) => n.type === 'downstream') || [];

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'success':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Success
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
            <AlertCircle className="w-3 h-3 mr-1" /> Failed
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Running
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Idle / Queued
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Network className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">Interactive Pipeline Dependency Graph</h3>
                <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                  Airflow 3.2 Topology
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target DAG: <span className="font-mono text-cyan-300 font-semibold">{dagId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-sm font-medium text-slate-400">Mapping upstream and downstream pipeline dependencies...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Topological Pipeline Graph View */}
              <div className="p-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl relative overflow-x-auto">
                <div className="min-w-[700px] grid grid-cols-3 gap-8 items-center relative">
                  
                  {/* Upstream Parents Column */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Upstream Parents ({upstreamNodes.length})</span>
                    </div>

                    {upstreamNodes.length === 0 ? (
                      <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                        Root Pipeline (No Upstream Parents)
                      </div>
                    ) : (
                      upstreamNodes.map((node) => (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                            selectedNode?.id === node.id
                              ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-500/10'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono font-bold text-slate-200 truncate max-w-[180px]">
                              {node.label}
                            </span>
                            {getStatusBadge(node.status)}
                          </div>
                          <div className="text-[11px] text-slate-500">Module: {node.module}</div>
                          
                          {/* Flow Arrow Indicator */}
                          <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Target DAG Column */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Target Pipeline</span>
                    </div>

                    {targetNode && (
                      <div
                        onClick={() => setSelectedNode(targetNode)}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer bg-slate-900 border-cyan-500 shadow-xl shadow-cyan-500/10 relative ${
                          selectedNode?.id === targetNode.id ? 'ring-2 ring-cyan-400/40' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-extrabold text-cyan-300 truncate max-w-[200px]">
                            {targetNode.label}
                          </span>
                          {getStatusBadge(targetNode.status)}
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800">
                          <span>Module: <strong className="text-slate-200">{targetNode.module}</strong></span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                            {targetNode.frequency}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Downstream Children Column */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Downstream Children ({downstreamNodes.length})</span>
                    </div>

                    {downstreamNodes.length === 0 ? (
                      <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                        Terminal Workflow (No Downstream Children)
                      </div>
                    ) : (
                      downstreamNodes.map((node) => (
                        <div
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer relative group ${
                            selectedNode?.id === node.id
                              ? 'bg-slate-800/90 border-cyan-500 shadow-lg shadow-cyan-500/10'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-mono font-bold text-slate-200 truncate max-w-[180px]">
                              {node.label}
                            </span>
                            {getStatusBadge(node.status)}
                          </div>
                          <div className="text-[11px] text-slate-500">Module: {node.module}</div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              </div>

              {/* Selected Node Control & Remediation Box */}
              {selectedNode && (
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-mono text-xs font-bold">
                      {selectedNode.type.toUpperCase()} NODE
                    </div>
                    <div>
                      <h4 className="text-xs font-mono font-bold text-white">{selectedNode.label}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Module: <span className="text-slate-200">{selectedNode.module}</span> | Status:{' '}
                        <span className="text-slate-200 font-semibold">{selectedNode.status}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {selectedNode.status === 'failed' && onDiagnoseDag && (
                      <button
                        onClick={() => {
                          onClose();
                          onDiagnoseDag(selectedNode.id);
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors flex items-center space-x-1.5"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>AI Diagnose</span>
                      </button>
                    )}

                    {onTriggerDag && (
                      <button
                        onClick={() => {
                          onClose();
                          onTriggerDag(selectedNode.id);
                        }}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors flex items-center space-x-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Trigger Node</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Success</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Failed</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Running</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Close Graph
          </button>
        </div>
      </div>
    </div>
  );
}
