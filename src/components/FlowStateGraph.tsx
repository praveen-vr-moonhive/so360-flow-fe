import { useMemo, useRef, useEffect, useState } from 'react';
import type { FlowState, FlowTransition } from '../types/flow';

interface FlowStateGraphProps {
    states: FlowState[];
    transitions: FlowTransition[];
    currentState: string;
    visitedStates?: string[];
}

interface StateNode {
    state: FlowState;
    x: number;
    y: number;
    column: number;
    row: number;
}

const NODE_W = 120;
const NODE_H = 44;
const COL_GAP = 60;
const ROW_GAP = 60;
const PAD_X = 20;
const PAD_Y = 24;

function topoSort(states: FlowState[], transitions: FlowTransition[]): string[] {
    const outgoing: Record<string, string[]> = {};
    const incoming: Record<string, number> = {};
    states.forEach(s => { outgoing[s.code] = []; incoming[s.code] = 0; });
    transitions.forEach(t => {
        if (outgoing[t.from_state] !== undefined) outgoing[t.from_state].push(t.to_state);
        if (incoming[t.to_state] !== undefined) incoming[t.to_state]++;
    });
    const queue = states.filter(s => incoming[s.code] === 0).map(s => s.code);
    const result: string[] = [];
    while (queue.length > 0) {
        const cur = queue.shift()!;
        result.push(cur);
        (outgoing[cur] || []).forEach(next => {
            incoming[next]--;
            if (incoming[next] === 0) queue.push(next);
        });
    }
    // Append any states not yet included (cycles)
    states.forEach(s => { if (!result.includes(s.code)) result.push(s.code); });
    return result;
}

export function FlowStateGraph({ states, transitions, currentState, visitedStates = [] }: FlowStateGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [svgSize, setSvgSize] = useState({ w: 600, h: 200 });

    const nodes = useMemo<StateNode[]>(() => {
        if (!states.length) return [];
        const order = topoSort(states, transitions);

        // Assign columns by topo order, rows by branching
        const colMap: Record<string, number> = {};
        const rowMap: Record<string, number> = {};

        order.forEach((code, idx) => {
            const col = idx;
            colMap[code] = col;
            rowMap[code] = 0;
        });

        // Pack into columns of max 3 rows when many states
        if (states.length > 6) {
            order.forEach((code, idx) => {
                const col = Math.floor(idx / 3);
                const row = idx % 3;
                colMap[code] = col;
                rowMap[code] = row;
            });
        }

        return states.map(state => {
            const col = colMap[state.code] ?? 0;
            const row = rowMap[state.code] ?? 0;
            return {
                state,
                x: PAD_X + col * (NODE_W + COL_GAP),
                y: PAD_Y + row * (NODE_H + ROW_GAP),
                column: col,
                row,
            };
        });
    }, [states, transitions]);

    useEffect(() => {
        if (!nodes.length) return;
        const maxX = Math.max(...nodes.map(n => n.x + NODE_W)) + PAD_X;
        const maxY = Math.max(...nodes.map(n => n.y + NODE_H)) + PAD_Y;
        setSvgSize({ w: Math.max(maxX, 300), h: Math.max(maxY, 120) });
    }, [nodes]);

    const nodeMap = useMemo(() => {
        const m: Record<string, StateNode> = {};
        nodes.forEach(n => { m[n.state.code] = n; });
        return m;
    }, [nodes]);

    if (!states.length) return null;

    return (
        <div ref={containerRef} className="w-full overflow-x-auto">
            <svg
                width={svgSize.w}
                height={svgSize.h}
                style={{ minWidth: svgSize.w }}
                className="block"
            >
                <defs>
                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L8,3 z" fill="#64748b" />
                    </marker>
                    <marker id="arrow-active" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L8,3 z" fill="#22d3ee" />
                    </marker>
                </defs>

                {/* Transition arrows */}
                {transitions.map((t, idx) => {
                    const from = nodeMap[t.from_state];
                    const to = nodeMap[t.to_state];
                    if (!from || !to) return null;

                    const isActive = t.from_state === currentState || t.to_state === currentState;
                    const isSelf = t.from_state === t.to_state;

                    if (isSelf) {
                        // Self-loop arc above the node
                        const cx = from.x + NODE_W / 2;
                        const cy = from.y;
                        return (
                            <g key={idx}>
                                <path
                                    d={`M${cx - 15},${cy} C${cx - 15},${cy - 28} ${cx + 15},${cy - 28} ${cx + 15},${cy}`}
                                    fill="none"
                                    stroke={isActive ? '#22d3ee' : '#475569'}
                                    strokeWidth={isActive ? 1.5 : 1}
                                    markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow)'}
                                />
                            </g>
                        );
                    }

                    // Calculate edge points
                    const fx = from.x + NODE_W / 2;
                    const fy = from.y + NODE_H / 2;
                    const tx = to.x + NODE_W / 2;
                    const ty = to.y + NODE_H / 2;

                    // Offset for parallel edges
                    const dx = tx - fx;
                    const dy = ty - fy;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    const nx = -dy / len * 8;
                    const ny = dx / len * 8;

                    const x1 = fx + nx;
                    const y1 = fy + ny;
                    const x2 = tx + nx;
                    const y2 = ty + ny;

                    return (
                        <g key={idx}>
                            <line
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke={isActive ? '#22d3ee' : '#475569'}
                                strokeWidth={isActive ? 1.5 : 1}
                                markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow)'}
                            />
                            <text
                                x={(x1 + x2) / 2 + nx * 1.5}
                                y={(y1 + y2) / 2 + ny * 1.5}
                                fontSize="9"
                                fill={isActive ? '#67e8f9' : '#64748b'}
                                textAnchor="middle"
                                dominantBaseline="middle"
                            >
                                {t.code.length > 10 ? t.code.slice(0, 8) + '\u2026' : t.code}
                            </text>
                        </g>
                    );
                })}

                {/* State nodes */}
                {nodes.map(({ state, x, y }) => {
                    const isCurrent = state.code === currentState;
                    const isVisited = visitedStates.includes(state.code);
                    const isTerminal = state.is_terminal;
                    const isInitial = state.is_initial;

                    let bg = '#1e293b';
                    let border = '#334155';
                    let textColor = '#94a3b8';

                    if (isCurrent) { bg = '#0e4a6b'; border = '#22d3ee'; textColor = '#e0f7ff'; }
                    else if (isVisited) { bg = '#1a2f1a'; border = '#22c55e'; textColor = '#86efac'; }
                    else if (isTerminal) { bg = '#1e293b'; border = '#64748b'; textColor = '#64748b'; }
                    else if (isInitial) { bg = '#1e2a3b'; border = '#3b82f6'; textColor = '#93c5fd'; }

                    const label = state.name.length > 14 ? state.name.slice(0, 12) + '\u2026' : state.name;

                    return (
                        <g key={state.code}>
                            {/* Terminal double-border */}
                            {isTerminal && (
                                <rect
                                    x={x - 3} y={y - 3}
                                    width={NODE_W + 6} height={NODE_H + 6}
                                    rx={8} ry={8}
                                    fill="none"
                                    stroke={border}
                                    strokeWidth={1}
                                    opacity={0.5}
                                />
                            )}
                            <rect
                                x={x} y={y}
                                width={NODE_W} height={NODE_H}
                                rx={6} ry={6}
                                fill={bg}
                                stroke={border}
                                strokeWidth={isCurrent ? 2 : 1}
                                style={{ transition: 'all 0.3s ease' }}
                            />
                            <text
                                x={x + NODE_W / 2}
                                y={y + NODE_H / 2 - (isInitial || isTerminal ? 5 : 0)}
                                fontSize="11"
                                fontWeight={isCurrent ? '600' : '400'}
                                fill={textColor}
                                textAnchor="middle"
                                dominantBaseline="middle"
                            >
                                {label}
                            </text>
                            {isInitial && (
                                <text x={x + NODE_W / 2} y={y + NODE_H / 2 + 8} fontSize="7" fill="#3b82f6" textAnchor="middle">
                                    initial
                                </text>
                            )}
                            {isTerminal && (
                                <text x={x + NODE_W / 2} y={y + NODE_H / 2 + 8} fontSize="7" fill="#64748b" textAnchor="middle">
                                    terminal
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
