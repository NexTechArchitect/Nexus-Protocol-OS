'use client';

import { useEffect, useRef, useState, useCallback, ReactNode, FC } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
type AlertType  = 'warning' | 'security' | 'info';
type TagVariant = 'default' | 'gold' | 'green' | 'red';
interface NavItem         { id: string; title: string; }
interface NavSection      { label: string; items: NavItem[]; }
interface DeploymentEntry { label: string; addr: string; }
type IconFn = FC;

// ─── SVG Icon ─────────────────────────────────────────────────────────────────
interface IconProps { d: string | string[]; size?: number; stroke?: number; }
const Ico: FC<IconProps> = ({ d, size = 16, stroke = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

const Icons = {
  Database:    () => <Ico d={["M12 2C6.48 2 2 4.24 2 7s4.48 5 10 5 10-2.24 10-5-4.48-5-10-5z","M2 7v5c0 2.76 4.48 5 10 5s10-2.24 10-5V7","M2 12v5c0 2.76 4.48 5 10 5s10-2.24 10-5v-5"]} />,
  Shield:      () => <Ico d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  Zap:         () => <Ico d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  TrendingUp:  () => <Ico d="M22 7l-8.5 8.5-5-5L2 17" />,
  Repeat:      () => <Ico d={["M17 1l4 4-4 4","M3 11V9a4 4 0 014-4h14","M7 23l-4-4 4-4","M21 13v2a4 4 0 01-4 4H3"]} />,
  Calculator:  () => <Ico d={["M4 2h16a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z","M8 6h8M8 10h2M12 10h2M8 14h2M12 14h2M16 14h2M8 18h2M12 18h2M16 18h2"]} />,
  Network:     () => <Ico d={["M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"]} />,
  Globe:       () => <Ico d={["M12 22a10 10 0 100-20 10 10 0 000 20z","M2 12h20","M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"]} />,
  Activity:    () => <Ico d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  Search:      () => <Ico d={["M21 21l-4.35-4.35","M17 11A6 6 0 105 11a6 6 0 0012 0z"]} />,
  Check:       () => <Ico d="M20 6L9 17l-5-5" size={14} />,
  AlertTri:    () => <Ico d={["M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z","M12 9v4","M12 17h.01"]} />,
  Lock:        () => <Ico d={["M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z","M7 11V7a5 5 0 0110 0v4"]} />,
  Anchor:      () => <Ico d={["M12 8a4 4 0 100-8 4 4 0 000 8z","M3.22 16.22A10.45 10.45 0 0012 20a10.45 10.45 0 008.78-3.78","M12 12v8","M5 20l7-4","M19 20l-7-4"]} />,
  Menu:        () => <Ico d={["M3 12h18","M3 6h18","M3 18h18"]} size={20} />,
  X:           () => <Ico d={["M18 6L6 18","M6 6l12 12"]} size={20} />,
  Copy:        () => <Ico d={["M8 17.929H6c-1.105 0-2-.912-2-2.036V5.036C4 3.91 4.895 3 6 3h8c1.105 0 2 .911 2 2.036v1.866m-6 .17h8c1.105 0 2 .91 2 2.035v10.857C20 21.09 19.105 22 18 22h-8c-1.105 0-2-.911-2-2.036V9.107c0-1.124.895-2.036 2-2.036z"]} size={14} />,
  ArrowLeft:   () => <Ico d="M19 12H5M12 5l-7 7 7 7" size={16} />,
};

// ─── Nav data ─────────────────────────────────────────────────────────────────
const NAV: NavSection[] = [
  { label: 'Genesis', items: [
    { id: 'overview',     title: 'Protocol Overview' },
    { id: 'architecture', title: 'System Architecture' },
    { id: 'deployments',  title: 'Contract Addresses' },
  ]},
  { label: 'Vault Layer', items: [
    { id: 'perps-vault',      title: 'PerpsVault' },
    { id: 'vault-lp',         title: 'LP Liquidity Engine' },
    { id: 'vault-collateral', title: 'Trader Collateral' },
    { id: 'vault-settlement', title: 'Trade Settlement' },
  ]},
  { label: 'Trading Engine', items: [
    { id: 'position-manager', title: 'PositionManager' },
    { id: 'margin-modes',     title: 'Margin Modes' },
    { id: 'market-orders',    title: 'Market Orders' },
    { id: 'limit-orders',     title: 'Limit Orders' },
    { id: 'ccip-trades',      title: 'Cross-Chain Trades' },
  ]},
  { label: 'Risk Engine', items: [
    { id: 'liquidation-engine', title: 'LiquidationEngine' },
    { id: 'batch-liquidation',  title: 'Batch Processing' },
    { id: 'keeper-system',      title: 'Keeper Rewards' },
  ]},
  { label: 'Oracles & Math', items: [
    { id: 'price-oracle',   title: 'PriceOracle' },
    { id: 'pnl-calculator', title: 'PnLCalculator' },
    { id: 'perps-errors',   title: 'PerpsErrors' },
  ]},
  { label: 'Account Abstraction', items: [
    { id: 'smart-account',   title: 'SmartAccount (ERC-4337)' },
    { id: 'nexus-paymaster', title: 'NexusPaymaster' },
    { id: 'account-factory', title: 'AccountFactory' },
  ]},
  { label: 'Cross-Chain', items: [
    { id: 'cross-chain-router', title: 'CrossChainRouter' },
    { id: 'message-receiver',   title: 'MessageReceiver' },
  ]},
];

const DEPLOYMENTS: DeploymentEntry[] = [
  { label: 'PerpsVault',            addr: '0x891FBf3C860333FB05f3f80526C3a1919de2d83c' },
  { label: 'PositionManager',       addr: '0x6952144C5dfb64DF54a64b61B3321Fd2C24cB42A' },
  { label: 'LiquidationEngine',     addr: '0xEE17eAF240c6b7C566E7431088FfC99551472669' },
  { label: 'PriceOracle',           addr: '0x4Ca4A6fa3763b1AE2F3a09B17189152a608920f5' },
  { label: 'CrossChainRouter',      addr: '0xE9b7f8F6c78054fb8d0D97585F32e7e026F5dd24' },
  { label: 'MessageReceiver',       addr: '0x5A371254b7e69d83C3aA4823D0e6ec4de91e95ec' },
  { label: 'SmartAccount (impl)',   addr: '0x1e821F5796bc833FE020c05007f84dF040878d81' },
  { label: 'AccountFactory',        addr: '0xb6445BF0F856FDF2Fd261A5c32409d226D134221' },
  { label: 'NexusPaymaster',        addr: '0x20e302881494F79eF5E536d5533be04F913eE652' },
  { label: 'EntryPoint (canonical)',addr: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789' },
  { label: 'CCIP Router (Sepolia)', addr: '0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59' },
  { label: 'USDC (Sepolia)',        addr: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' },
  { label: 'WETH (Sepolia)',        addr: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14' },
  { label: 'WBTC (Sepolia)',        addr: '0x29f2D40B0605204364af54EC677bD022dA425d03' },
  { label: 'ETH/USD Feed',          addr: '0x694AA1769357215DE4FAC081bf1f309aDC325306' },
  { label: 'BTC/USD Feed',          addr: '0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43' },
];

// ─── Animation wrapper ────────────────────────────────────────────────────────
const FadeUp: FC<{ children: ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1], delay }}>
      {children}
    </motion.div>
  );
};

// ─── UI primitives ────────────────────────────────────────────────────────────
const Tag: FC<{ children: ReactNode; variant?: TagVariant }> = ({ children, variant = 'default' }) => {
  const s: Record<TagVariant, string> = {
    default: 'bg-amber-50 text-slate-600 border-amber-200',
    gold:    'bg-[#F0B90B]/12 text-[#7a4e06] border-[#F0B90B]/40',
    green:   'bg-emerald-50 text-emerald-800 border-emerald-200',
    red:     'bg-red-50 text-red-800 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold border tracking-widest uppercase ${s[variant]}`}>
      {children}
    </span>
  );
};

const CodeBlock: FC<{ title: string; children: string; lang?: string }> = ({ title, children, lang = 'SOLIDITY' }) => {
  const [copied, setCopied] = useState(false);
  return (
    <FadeUp>
      <div className="rounded-2xl overflow-hidden my-6" style={{ border: '1px solid rgba(240,185,11,0.2)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f1117] border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="text-slate-400 text-[11px] font-mono">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#F0B90B]/60 text-[10px] font-mono tracking-widest">{lang}</span>
            <button
              onClick={() => { navigator.clipboard.writeText(children); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="text-slate-500 hover:text-white transition-colors p-1">
              {copied ? <Icons.Check /> : <Icons.Copy />}
            </button>
          </div>
        </div>
        <pre className="bg-[#080c14] p-5 overflow-x-auto text-[13px] font-mono leading-[1.8] text-slate-200 m-0">{children}</pre>
      </div>
    </FadeUp>
  );
};

const Alert: FC<{ type?: AlertType; title: string; children: ReactNode }> = ({ type = 'warning', title, children }) => {
  const cfg: Record<AlertType, { bl: string; bg: string; tc: string; bc: string; icon: string }> = {
    warning:  { bl: '#F0B90B', bg: '#fffbeb', tc: '#7a4e06', bc: '#92600A', icon: '⚠' },
    security: { bl: '#ef4444', bg: '#fef2f2', tc: '#b91c1c', bc: '#991b1b', icon: '⛔' },
    info:     { bl: '#3b82f6', bg: '#eff6ff', tc: '#1d4ed8', bc: '#1e40af', icon: 'ℹ' },
  };
  const c = cfg[type];
  return (
    <FadeUp>
      <div className="rounded-r-xl px-5 py-4 my-6 border-l-4" style={{ background: c.bg, borderLeftColor: c.bl, border: `1px solid ${c.bl}30`, borderLeft: `4px solid ${c.bl}` }}>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1.5" style={{ color: c.tc }}>{c.icon} {title}</p>
        <p className="text-[13.5px] leading-relaxed font-medium" style={{ color: c.bc }}>{children}</p>
      </div>
    </FadeUp>
  );
};

const SectionTitle: FC<{ icon: IconFn; title: string; subtitle?: string }> = ({ icon: Ic, title, subtitle }) => (
  <FadeUp>
    <div className="flex items-start gap-4 mb-10">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(240,185,11,0.12)', border: '1px solid rgba(240,185,11,0.3)', color: '#7a4e06' }}>
        <Ic />
      </div>
      <div>
        <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-slate-500 text-sm mt-0.5 font-mono">{subtitle}</p>}
      </div>
    </div>
  </FadeUp>
);

// ─── Para — darker, thinner, readable ─────────────────────────────────────────
const Para: FC<{ children: ReactNode }> = ({ children }) => (
  <p style={{ color: '#374151', fontSize: 14.5, lineHeight: 1.85, marginBottom: 14, fontWeight: 400 }}>{children}</p>
);

const SubSection: FC<{ number?: string; title: string; children: ReactNode }> = ({ number, title, children }) => (
  <div className="mb-12">
    <FadeUp>
      <div className="flex items-center gap-2.5 mb-5">
        {number && <span className="font-mono text-xs font-bold" style={{ color: '#F0B90B' }}>{number}</span>}
        <h3 className="text-[17px] font-semibold" style={{ color: '#1e293b' }}>{title}</h3>
      </div>
    </FadeUp>
    {children}
  </div>
);

// ─── Sidebar ──────────────────────────────────────────────────────────────────
interface SidebarProps {
  active: string;
  search: string;
  setSearch: (v: string) => void;
  scrollTo: (id: string) => void;
  filteredNav: NavSection[];
}

const Sidebar: FC<SidebarProps> = ({ active, search, setSearch, scrollTo, filteredNav }) => (
  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRight: '1px solid rgba(240,185,11,0.18)' }}>
    {/* Back button + logo */}
    <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(240,185,11,0.15)', flexShrink: 0 }}>
      <a
        href="/"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 600, color: '#64748b',
          textDecoration: 'none', marginBottom: 14,
          padding: '5px 10px', borderRadius: 8,
          background: '#f8fafc', border: '1px solid #e2e8f0',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#1e293b'; (e.currentTarget as HTMLAnchorElement).style.background = '#f1f5f9'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#64748b'; (e.currentTarget as HTMLAnchorElement).style.background = '#f8fafc'; }}
      >
        <Icons.ArrowLeft /> Back to Dashboard
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: '#F0B90B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(240,185,11,0.4)' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, lineHeight: 1 }}>N</span>
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Nexus Protocol</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            <p style={{ fontSize: 10, color: '#64748b', fontWeight: 500, fontFamily: 'monospace', margin: 0 }}>v1.0 · Sepolia</p>
          </div>
        </div>
      </div>

      {/* Search — controlled input, works properly */}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', display: 'flex' }}>
          <Icons.Search />
        </span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search modules..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 9, padding: '7px 10px 7px 30px',
            fontSize: 12.5, color: '#1e293b', fontWeight: 400,
            outline: 'none', fontFamily: 'inherit',
          }}
          onFocus={e => { e.currentTarget.style.border = '1px solid rgba(240,185,11,0.5)'; e.currentTarget.style.background = '#fffdf5'; }}
          onBlur={e => { e.currentTarget.style.border = '1px solid #e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
        />
      </div>
    </div>

    {/* Nav */}
    <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 10px 16px' }}>
      {filteredNav.length === 0 && (
        <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0', fontStyle: 'italic' }}>No results for "{search}"</p>
      )}
      {filteredNav.map((sec, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 9.5, fontWeight: 700, color: '#F0B90B', textTransform: 'uppercase', letterSpacing: '0.18em', padding: '0 8px', marginBottom: 4, marginTop: 2 }}>
            {sec.label}
          </p>
          {sec.items.map(item => {
            const on = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '6px 10px', borderRadius: 7, marginBottom: 1,
                  fontSize: 12.5, fontWeight: on ? 600 : 400,
                  color: on ? '#7a4e06' : '#334155',
                  background: on ? 'rgba(240,185,11,0.1)' : 'transparent',
                  borderLeft: on ? '3px solid #F0B90B' : '3px solid transparent',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!on) { (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'; (e.currentTarget as HTMLButtonElement).style.color = '#0f172a'; } }}
                onMouseLeave={e => { if (!on) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#334155'; } }}
              >
                {item.title}
              </button>
            );
          })}
        </div>
      ))}
    </nav>

    {/* Footer */}
    <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(240,185,11,0.12)', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Oracle</span>
        <span style={{ fontSize: 10, fontWeight: 500, color: '#64748b', fontFamily: 'monospace' }}>Chainlink · CCIP</span>
      </div>
    </div>
  </div>
);

// ─── Page content ─────────────────────────────────────────────────────────────
const PageContent: FC<{ scrollTo: (id: string) => void }> = ({ scrollTo }) => {
  const [copiedAddr, setCopiedAddr] = useState('');
  const copy = (addr: string) => { navigator.clipboard.writeText(addr); setCopiedAddr(addr); setTimeout(() => setCopiedAddr(''), 2000); };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 32px 80px' }}>

      {/* ── OVERVIEW ── */}
      <section id="overview" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <FadeUp>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 99, background: 'rgba(240,185,11,0.1)', border: '1px solid rgba(240,185,11,0.3)', marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F0B90B', display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#7a4e06', textTransform: 'uppercase', letterSpacing: '0.16em' }}>Live on Ethereum Sepolia</span>
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>Nexus Protocol</h1>
          <p style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace', marginBottom: 28 }}>Technical Documentation</p>
        </FadeUp>

        <FadeUp delay={0.08}>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(240,185,11,0.2)', padding: '24px 28px', marginBottom: 20, boxShadow: '0 2px 16px rgba(240,185,11,0.07)' }}>
            <p style={{ fontSize: 15, color: '#1e293b', lineHeight: 1.8, marginBottom: 10, fontWeight: 400 }}>
              Nexus is a fully on-chain perpetuals exchange built on Ethereum Sepolia. Trade BTC and ETH with up to{' '}
              <strong style={{ fontWeight: 700, color: '#0f172a' }}>50× leverage</strong> — no off-chain order books, no trusted operators, no proxy admins.
            </p>
            <p style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.85, margin: 0 }}>
              Five composable layers: a <strong style={{ color: '#1e293b', fontWeight: 600 }}>Vault Layer</strong> for capital and solvency,
              a <strong style={{ color: '#1e293b', fontWeight: 600 }}>Trading Engine</strong> for positions and orders,
              a <strong style={{ color: '#1e293b', fontWeight: 600 }}>Risk Engine</strong> for open-keeper liquidations,
              an <strong style={{ color: '#1e293b', fontWeight: 600 }}>Oracle & Math Layer</strong> for Chainlink-secured pricing,
              and an <strong style={{ color: '#1e293b', fontWeight: 600 }}>Account Abstraction Layer</strong> for gasless ERC-4337 accounts.
            </p>
          </div>
        </FadeUp>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { icon: '🏦', label: 'Single-Vault Design',  desc: 'All LP liquidity and trader collateral in one PerpsVault. No fragmented capital.' },
            { icon: '⚡', label: 'Open Keeper Model',    desc: 'Any address calls batchLiquidate and earns 10% fee. Always prompt.' },
            { icon: '🔐', label: 'Gasless via ERC-4337', desc: 'NexusPaymaster sponsors every UserOperation. Full self-custody, zero ETH.' },
          ].map(({ icon, label, desc }, i) => (
            <FadeUp key={label} delay={0.08 * i}>
              <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}
                style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(240,185,11,0.18)', padding: '18px 16px', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                <span style={{ fontSize: 22, display: 'block', marginBottom: 10 }}>{icon}</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>{label}</p>
                <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, margin: 0 }}>{desc}</p>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section id="architecture" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.Network} title="System Architecture" subtitle="Five-layer composable design" />
        <FadeUp>
          <Para>Capital flows uni-directionally: USDC deposits into <code>PerpsVault</code>, minting an internal balance. Opening a position through <code>PositionManager</code> atomically locks collateral. <code>PriceOracle</code> validates Chainlink freshness; <code>PnLCalculator</code> checks health. Below threshold, <code>LiquidationEngine</code> is callable by any keeper.</Para>
        </FadeUp>
        <FadeUp delay={0.05}>
          <Para>Cross-chain flow: a CCIP message from any EVM chain delivers trade params and USDC to <code>MessageReceiver</code> on Sepolia, which calls <code>PositionManager</code> identically to a local trade.</Para>
        </FadeUp>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 20 }}>
          {[
            { label: 'Vault Layer',      color: '#d97706', items: ['PerpsVault.sol','ERC-20 Collateral','LP Share Tokens','Lock / Release API'] },
            { label: 'Trading Engine',   color: '#6366f1', items: ['PositionManager.sol','ISOLATED / CROSS','Market + Limit Orders','Cross-Chain (CCIP)'] },
            { label: 'Risk Engine',      color: '#ef4444', items: ['LiquidationEngine.sol','Batch Liquidate (20)','Keeper Rewards','Emergency Rescue'] },
            { label: 'Oracle & Math',    color: '#10b981', items: ['PriceOracle.sol','PnLCalculator.sol','Chainlink Heartbeat','int256 safe math'] },
            { label: 'Acct Abstraction', color: '#3b82f6', items: ['SmartAccount.sol','NexusPaymaster.sol','AccountFactory.sol','ERC-4337 compliant'] },
            { label: 'Cross-Chain',      color: '#a855f7', items: ['CrossChainRouter.sol','MessageReceiver.sol','Chainlink CCIP','Multi-chain positions'] },
          ].map(({ label, color, items }, i) => (
            <motion.div key={label}
              initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              whileHover={{ scale: 1.02 }}
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: '14px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', cursor: 'default' }}>
              <p style={{ fontSize: 9.5, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>{label}</p>
              {items.map((item, j) => (
                <p key={j} style={{ fontSize: 11, fontFamily: 'monospace', color: j === 0 ? '#1e293b' : '#64748b', marginBottom: 3, fontWeight: j === 0 ? 600 : 400 }}>
                  {j === 0 ? item : `└─ ${item}`}
                </p>
              ))}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── DEPLOYMENTS ── */}
      <section id="deployments" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.Globe} title="Contract Addresses" subtitle="Ethereum Sepolia Testnet" />
        <FadeUp>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(240,185,11,0.2)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            {DEPLOYMENTS.map((d, i) => (
              <motion.button key={d.addr} onClick={() => copy(d.addr)} whileHover={{ backgroundColor: '#fffbeb' }}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', background: 'transparent', border: 'none', borderBottom: i < DEPLOYMENTS.length - 1 ? '1px solid rgba(240,185,11,0.08)' : 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#1e293b' }}>{d.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>{d.addr.slice(0, 8)}…{d.addr.slice(-6)}</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: copiedAddr === d.addr ? '#16a34a' : '#F0B90B', minWidth: 40, textAlign: 'right' }}>
                    {copiedAddr === d.addr ? '✓ ok' : 'copy'}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ── PERPS VAULT ── */}
      <section id="perps-vault" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.Database} title="PerpsVault" subtitle="The capital layer — all funds live here" />
        <FadeUp><Para><code>PerpsVault.sol</code> is the financial backbone of Nexus. Every dollar — LP yield deposits or trader margin — lives here. A single vault eliminates capital fragmentation and makes solvency auditable from one storage slot.</Para></FadeUp>
        <FadeUp delay={0.05}><Para>Two separate internal pools: the <strong style={{color:'#1e293b',fontWeight:600}}>LP pool</strong> for passive liquidity providers, and the <strong style={{color:'#1e293b',fontWeight:600}}>collateral pool</strong> for active traders. These are strictly isolated — LP funds cannot be silently consumed to cover trader losses.</Para></FadeUp>
        <FadeUp delay={0.1}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <Tag>Ownable</Tag><Tag>ReentrancyGuard</Tag><Tag>Pausable</Tag><Tag>ERC-20 LP Tokens</Tag>
            <Tag variant="gold">MINIMUM_LIQUIDITY = 1000</Tag>
          </div>
        </FadeUp>
      </section>

      <section id="vault-lp" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SubSection number="01" title="LP Liquidity Engine">
          <FadeUp><Para>LPs call <code>addLiquidity(uint256 amount)</code> to deposit USDC, receiving shares via <code>shares = (amount × totalSupply) / totalAssets</code>. The first deposit permanently burns <code>MINIMUM_LIQUIDITY (1,000)</code> shares to <code>address(0)</code> — preventing the share-price inflation attack.</Para></FadeUp>
          <FadeUp delay={0.05}><Para><code>removeLiquidity(uint256 lpAmount)</code> redeems LP tokens for <strong style={{color:'#1e293b',fontWeight:600}}>unlocked</strong> assets only. Assets backing open positions remain locked and unavailable for LP withdrawal.</Para></FadeUp>
          <CodeBlock title="PerpsVault.sol — LP share minting">{`function addLiquidity(uint256 amount) external nonReentrant whenNotPaused {
  uint256 normalised = amount * DECIMALS_SCALAR;
  uint256 supply     = totalSupply();

  uint256 shares = supply == 0
    ? normalised - MINIMUM_LIQUIDITY
    : (normalised * supply) / totalAssets();

  _mint(msg.sender, shares);
}`}</CodeBlock>
        </SubSection>
      </section>

      <section id="vault-collateral" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SubSection number="02" title="Trader Collateral">
          <FadeUp><Para><code>deposit</code> and <code>withdraw</code> are callable <strong style={{color:'#1e293b',fontWeight:600}}>only by the registered PositionManager</strong> — traders never interact with the vault directly. All margin checks occur in PositionManager before any capital moves.</Para></FadeUp>
          <FadeUp delay={0.05}><Para><code>lockCollateral</code> moves funds from free → locked on position open. A normal close calls <code>unlockCollateral</code>; a liquidation calls <code>settleTrade</code>.</Para></FadeUp>
          <Alert type="security" title="Access Control — onlyPositionManager">
            <code>deposit</code>, <code>withdraw</code>, <code>lockCollateral</code>, <code>unlockCollateral</code>, and <code>settleTrade</code> all carry the <code>onlyPositionManager</code> modifier. Set once in the constructor via a two-step Ownable transfer. No backdoor exists.
          </Alert>
        </SubSection>
      </section>

      <section id="vault-settlement" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SubSection number="03" title="Trade Settlement">
          <FadeUp><Para><code>settleTrade(address trader, int256 pnl, uint256 keeperFee)</code> atomically applies realised PnL to locked collateral, pays the keeperFee, and unlocks the residual to the trader's free balance.</Para></FadeUp>
          <FadeUp delay={0.05}><Para>LP solvency invariant: after every settlement, the vault asserts <code>totalAssets() ≥ totalLockedCollateral()</code>. Any settlement that would make the pool insolvent reverts entirely.</Para></FadeUp>
          <CodeBlock title="PerpsVault.sol — solvency invariant">{`function settleTrade(address trader, int256 pnl, uint256 keeperFee)
  external onlyPositionManager
{
  uint256 released = _applyPnL(trader, pnl, keeperFee);
  PROTOCOL_ASSET.safeTransfer(msg.sender, keeperFee);
  _collateralBalances[trader].free += released;

  require(totalAssets() > totalLockedCollateral(), "VAULT_INSOLVENT");
}`}</CodeBlock>
          <Alert type="warning" title="Dust Withdrawal — Patched">
            Transfer amount snapped to the nearest <code>DECIMALS_SCALAR</code> multiple via modulo subtraction before any <code>safeTransfer</code>. Eliminates repeated fractional-wei drain exploits.
          </Alert>
        </SubSection>
      </section>

      {/* ── POSITION MANAGER ── */}
      <section id="position-manager" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.TrendingUp} title="PositionManager" subtitle="The trading engine — all position logic" />
        <FadeUp><Para><code>PositionManager.sol</code> is the only contract allowed to mutate vault collateral. Every trader action routes here. Position struct stores: trader address, asset, size, entry price, collateral, margin mode, and direction flag.</Para></FadeUp>
        <FadeUp delay={0.05}><Para>Risk parameters enforced at creation time: leverage ≤ maxLeverage, size ≥ minimum, oracle freshness check. Validate first, mutate after — no partial states ever written.</Para></FadeUp>
        <FadeUp delay={0.1}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            <Tag>Ownable</Tag><Tag>ReentrancyGuard</Tag><Tag>Pausable</Tag>
            <Tag variant="gold">LIQUIDATION_THRESHOLD = 8000 bps</Tag>
            <Tag variant="gold">LIQUIDATOR_FEE = 1000 bps</Tag>
          </div>
        </FadeUp>
      </section>

      <section id="margin-modes" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SubSection number="01" title="Margin Modes: ISOLATED vs CROSS">
          <FadeUp>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'ISOLATED', color: '#d97706', bg: '#fffbeb', border: 'rgba(240,185,11,0.3)', desc: "Each position has its own ring-fenced collateral pool. Only that position's margin is at risk on liquidation." },
                { label: 'CROSS',    color: '#475569', bg: '#f8fafc', border: '#e2e8f0',              desc: 'All free collateral counts as margin across every cross position — higher effective leverage, cascade liquidation risk.' },
              ].map(({ label, color, bg, border, desc }) => (
                <motion.div key={label} whileHover={{ scale: 1.015 }} transition={{ duration: 0.18 }}
                  style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '16px' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>{label}</p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, margin: 0 }}>{desc}</p>
                </motion.div>
              ))}
            </div>
          </FadeUp>
          <FadeUp delay={0.05}><Para><strong style={{color:'#1e293b',fontWeight:600}}>LIQUIDATION_THRESHOLD = 8,000 bps (80%)</strong>: a position becomes liquidatable when 80% of its margin is consumed. Remaining 20% splits: 10% keeper fee + 10% protocol buffer.</Para></FadeUp>
        </SubSection>
      </section>

      <section id="market-orders" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SubSection number="02" title="Market Orders">
          <FadeUp><Para><code>openPosition(asset, size, collateral, isLong, mode)</code> opens at the current oracle price. Queries <code>PriceOracle</code>, validates leverage, locks collateral, writes the Position struct — all atomic and <code>nonReentrant</code>.</Para></FadeUp>
          <FadeUp delay={0.05}><Para><code>closePosition(bytes32 positionId)</code> calculates realised PnL against the current oracle price, then calls <code>settleTrade</code>. LP exposure changes by exactly the trade PnL.</Para></FadeUp>
          <CodeBlock title="PositionManager.sol — PnL calculation">{`function _calcPnL(
  Position memory pos,
  uint256 currentPrice
) internal pure returns (int256) {
  int256 priceDelta = int256(currentPrice) - int256(pos.entryPrice);
  int256 rawPnL = (priceDelta * int256(pos.size)) / int256(pos.entryPrice);
  return pos.isLong ? rawPnL : -rawPnL;
}`}</CodeBlock>
        </SubSection>
      </section>

      <section id="limit-orders" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SubSection number="03" title="Limit Orders">
          <FadeUp><Para><code>placeLimitOrder(..., triggerPrice, ...)</code> immediately locks collateral on-chain. No position opened yet — prevents griefing attacks where orders are placed without backing funds.</Para></FadeUp>
          <FadeUp delay={0.05}><Para>Anyone calls <code>executeLimitOrder(bytes32 orderId)</code> once oracle crosses <code>triggerPrice</code>, earning <strong style={{color:'#1e293b',fontWeight:600}}>0.1% of collateral</strong>. Traders call <code>cancelLimitOrder</code> anytime to reclaim collateral.</Para></FadeUp>
        </SubSection>
      </section>

      <section id="ccip-trades" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SubSection number="04" title="Cross-Chain Trade Execution">
          <FadeUp><Para><code>executeCrossChainTrade(bytes32 messageId, address trader, ...)</code> opens a position identically to <code>openPosition</code>. The <code>messageId</code> is stored — duplicate CCIP deliveries revert with <code>DUPLICATE_MESSAGE</code>.</Para></FadeUp>
          <FadeUp delay={0.05}><Para>If the position-open fails after collateral has already arrived, <code>MessageReceiver</code> credits collateral to the trader's free vault balance. Bridged funds are never silently lost.</Para></FadeUp>
        </SubSection>
      </section>

      {/* ── LIQUIDATION ENGINE ── */}
      <section id="liquidation-engine" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.Shield} title="LiquidationEngine" subtitle="The risk engine — open-keeper model" />
        <FadeUp><Para><code>LiquidationEngine.sol</code> replaces the privileged-admin pattern with an open-keeper model paying a <strong style={{color:'#1e293b',fontWeight:600}}>10% fee to any caller</strong>. A competitive keeper market ensures immediate response to price dislocations.</Para></FadeUp>
      </section>

      <section id="batch-liquidation" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SubSection number="01" title="Batch Processing Architecture">
          <FadeUp><Para><code>batchLiquidate(bytes32[] calldata positionIds)</code> accepts up to <code>maxBatchSize (20)</code> IDs. For each: <code>isLiquidatable()</code> → <code>liquidate()</code> → accumulate fee. Single <code>safeTransfer</code> at the end.</Para></FadeUp>
          <FadeUp delay={0.05}><Para>Each attempt wrapped in <code>try/catch</code>. Without this, two keepers submitting overlapping batches would both fail if any ID was stale. With isolation, successful liquidations proceed regardless.</Para></FadeUp>
          <CodeBlock title="LiquidationEngine.sol — batch with isolation">{`for (uint i = 0; i < positionIds.length; i++) {
  try positionManager.liquidate(positionIds[i]) returns (uint256 fee) {
    totalFees += fee;
  } catch {
    // closed concurrently by another keeper — skip
  }
}
PROTOCOL_ASSET.safeTransfer(msg.sender, totalFees);`}</CodeBlock>
        </SubSection>
      </section>

      <section id="keeper-system" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SubSection number="02" title="Keeper Reward System">
          <FadeUp><Para>Fee flow: locked collateral → <code>settleTrade</code> → <code>LiquidationEngine</code> → keeper wallet. The <code>LIQUIDATOR_FEE (10%)</code> forwarded in bulk at batch end.</Para></FadeUp>
          <Alert type="security" title="PROTOCOL_ASSET Rescue Guard">
            <code>rescueTokens(address token, uint256 amount)</code> reverts unconditionally if <code>token == PROTOCOL_ASSET</code> — even a compromised owner cannot drain keeper rewards.
          </Alert>
        </SubSection>
      </section>

      {/* ── PRICE ORACLE ── */}
      <section id="price-oracle" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.Activity} title="PriceOracle" subtitle="Chainlink feeds with staleness validation" />
        <FadeUp><Para><code>PriceOracle.sol</code> wraps Chainlink's <code>AggregatorV3Interface</code> to serve 18-decimal normalised prices. Every <code>getPrice(asset)</code> call checks <code>updatedAt</code> against a per-asset heartbeat; exceeded → reverts <code>STALE_PRICE</code>.</Para></FadeUp>
        <CodeBlock title="PriceOracle.sol — staleness check">{`function getPrice(address asset) external view returns (uint256) {
  AssetConfig memory cfg = assets[asset];
  require(cfg.feed != address(0), "ASSET_NOT_REGISTERED");

  (, int256 answer,, uint256 updatedAt,) = cfg.feed.latestRoundData();
  require(block.timestamp - updatedAt <= cfg.heartbeat, "STALE_PRICE");

  return uint256(answer) * 10 ** (18 - cfg.feedDecimals);
}`}</CodeBlock>
      </section>

      {/* ── PNL CALCULATOR ── */}
      <section id="pnl-calculator" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.Calculator} title="PnLCalculator" subtitle="Pure math library — no storage" />
        <FadeUp><Para>A pure library contract with no storage and no ownership. Centralising PnL math ensures <code>PositionManager</code> and <code>LiquidationEngine</code> never duplicate formulas or diverge on rounding.</Para></FadeUp>
        <FadeUp delay={0.05}><Para><code>calculatePnL(pos, currentPrice)</code>: size and price validated below <code>int256.max / 2</code> before unchecked multiply — preventing silent wrap producing incorrect PnL.</Para></FadeUp>
        <Alert type="warning" title="int256 Overflow Safety">
          Both <code>currentPrice</code> and <code>position.size</code> are asserted below <code>type(int256).max / 2</code>. An unchecked wrap would silently produce enormous false profit or loss, bypassing all health checks.
        </Alert>
      </section>

      {/* ── PERPS ERRORS ── */}
      <section id="perps-errors" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.AlertTri} title="PerpsErrors" subtitle="Centralised custom error registry" />
        <FadeUp><Para>All custom errors in a single file. Custom errors save ~200 bytes per revert string and reduce gas. Typed errors ABI-decode cleanly in block explorers and client libraries.</Para></FadeUp>
        <FadeUp delay={0.08}>
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid rgba(240,185,11,0.2)', overflow: 'hidden', marginTop: 16 }}>
            {([
              ['ZERO_AMOUNT',             'Deposit or withdrawal of zero value'],
              ['INSUFFICIENT_COLLATERAL', 'Margin below minimum to open position'],
              ['LEVERAGE_TOO_HIGH',       'Leverage exceeds asset maxLeverage'],
              ['POSITION_NOT_FOUND',      'positionId does not exist in storage'],
              ['NOT_LIQUIDATABLE',        'Position health above liquidation threshold'],
              ['STALE_PRICE',             'Chainlink price outside heartbeat window'],
              ['DUPLICATE_MESSAGE',       'CCIP messageId already processed'],
              ['ASSET_NOT_REGISTERED',    'No feed configured for this asset'],
              ['VAULT_INSOLVENT',         'LP solvency invariant violated'],
              ['BATCH_TOO_LARGE',         'Array length exceeds maxBatchSize (20)'],
            ] as [string,string][]).map(([err, desc], i, arr) => (
              <motion.div key={err} whileHover={{ backgroundColor: '#fffbeb' }}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', borderBottom: i < arr.length - 1 ? '1px solid rgba(240,185,11,0.08)' : 'none', background: 'transparent', transition: 'background 0.12s' }}>
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#7a4e06' }}>{err}</span>
                <span style={{ fontSize: 11.5, color: '#475569', maxWidth: 240, textAlign: 'right' }}>{desc}</span>
              </motion.div>
            ))}
          </div>
        </FadeUp>
      </section>

      {/* ── SMART ACCOUNT ── */}
      <section id="smart-account" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.Zap} title="SmartAccount" subtitle="ERC-4337 compliant — gasless trading" />
        <FadeUp>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(240,185,11,0.2)', padding: '24px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              <div>
                <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.8, marginBottom: 16 }}>Every Nexus user gets a smart contract wallet deployed by <code>AccountFactory</code>. Users sign <code>UserOperations</code> off-chain; bundler submits to <code>EntryPoint</code>. User never holds ETH.</p>
                {['EIP-712 typed signature validation','Nonce-based replay protection','executeBatch for multi-call'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ color: '#16a34a', flexShrink: 0 }}><Icons.Check /></span>
                    <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{ borderLeft: '1px solid rgba(240,185,11,0.15)', paddingLeft: 24 }}>
                {[['Standard','ERC-4337'],['Gas Sponsor','NexusPaymaster'],['Sig Scheme','EIP-712'],['Deployment','EIP-1167 Clone'],['Address','Counterfactual']].map(([k,v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <span style={{ fontSize: 11.5, fontFamily: 'monospace', color: '#94a3b8' }}>{k}</span>
                    <span style={{ fontSize: 11.5, fontFamily: 'monospace', color: '#1e293b', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeUp>
        <Alert type="info" title="EIP-712 Typed Signing">
          Wallet displays target contract, value, calldata hash, nonce, and chainId. Prevents phishing attacks where malicious frontends trick users into signing unrelated operations.
        </Alert>
      </section>

      {/* ── NEXUS PAYMASTER ── */}
      <section id="nexus-paymaster" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.Lock} title="NexusPaymaster" subtitle="Gas sponsorship via EntryPoint" />
        <FadeUp><Para>Pre-deposits ETH into <code>EntryPoint</code>. When a bundler submits a <code>UserOperation</code>, <code>EntryPoint</code> calls <code>validatePaymasterUserOp</code>: if approved, bundler is guaranteed payment and user never needs ETH.</Para></FadeUp>
        <FadeUp delay={0.05}><Para>Approval requires off-chain signature over <code>(userOpHash, validUntil, validAfter, chainId)</code>. Including <code>block.chainid</code> prevents cross-chain replay.</Para></FadeUp>
        <CodeBlock title="NexusPaymaster.sol — signature verification">{`function _validateSignature(UserOperation calldata userOp) internal view {
  (uint48 validUntil, uint48 validAfter, bytes memory sig) =
    _decode(userOp.paymasterAndData);

  bytes32 hash = keccak256(abi.encode(
    userOpHash, validUntil, validAfter, block.chainid
  ));

  address recovered = ECDSA.recover(hash, sig);
  require(recovered == verifyingSigner, "INVALID_PAYMASTER_SIG");
}`}</CodeBlock>
      </section>

      {/* ── ACCOUNT FACTORY ── */}
      <section id="account-factory" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.Anchor} title="AccountFactory" subtitle="EIP-1167 minimal proxy deployment" />
        <FadeUp><Para>Deploys <code>SmartAccount</code> instances as EIP-1167 minimal proxies (~45k gas vs 500k+ for full deployment). All clones share implementation bytecode but maintain independent storage.</Para></FadeUp>
        <FadeUp delay={0.05}><Para><em>Counterfactual deployment</em> via <code>CREATE2(salt = keccak256(owner, nonce))</code>: address deterministic before any on-chain tx. Bundler calls factory atomically within the same <code>EntryPoint</code> call on first <code>UserOperation</code>.</Para></FadeUp>
        <Alert type="info" title="Counterfactual Address Stability">
          Frontend displays smart account address the moment user connects signing key. Users receive funds and share their address immediately — contract deploys automatically on the first trade.
        </Alert>
      </section>

      {/* ── CROSS-CHAIN ROUTER ── */}
      <section id="cross-chain-router" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.Repeat} title="CrossChainRouter" subtitle="Chainlink CCIP — source chain component" />
        <FadeUp><Para>Lives on source chains (Arbitrum, Base, Optimism…). User approves USDC and calls <code>openCrossChainPosition</code>. Router encodes trade params and collateral into a CCIP message and forwards to Chainlink's CCIP router.</Para></FadeUp>
        <FadeUp delay={0.05}><Para>CCIP message carries both <em>data</em> (encoded params) and a <em>token transfer</em> (USDC). Chainlink's DON verifies and delivers to <code>MessageReceiver</code> on Sepolia. No Nexus operator can censor or front-run.</Para></FadeUp>
      </section>

      {/* ── MESSAGE RECEIVER ── */}
      <section id="message-receiver" style={{ paddingTop: 56, paddingBottom: 56, borderBottom: '1px solid rgba(240,185,11,0.15)' }}>
        <SectionTitle icon={Icons.Repeat} title="MessageReceiver" subtitle="Chainlink CCIP — Sepolia destination" />
        <FadeUp><Para>Deployed on Sepolia. On <code>ccipReceive</code>: decodes payload → deposits USDC into <code>PerpsVault</code> → calls <code>PositionManager.executeCrossChainTrade</code>.</Para></FadeUp>
        <FadeUp delay={0.05}><Para>Maintains <strong style={{color:'#1e293b',fontWeight:600}}>allowlisted senders mapping</strong> keyed by <code>(sourceChainSelector, sender address)</code>. Only known <code>CrossChainRouter</code> addresses on approved chains can trigger <code>ccipReceive</code>.</Para></FadeUp>
        <Alert type="security" title="Sender Allowlist is Critical">
          Always verify sender matches an approved <code>CrossChainRouter</code> before trusting decoded parameters. Failing to do so would allow any address on the source chain to trigger arbitrary trade execution.
        </Alert>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ paddingTop: 56, textAlign: 'center' }}>
        <FadeUp>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, background: '#F0B90B', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(240,185,11,0.4)' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 13 }}>N</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>NEXUS PROTOCOL</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#94a3b8', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sepolia</span>
          </div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.7 }}>
            Deterministic perpetuals. Chainlink oracles. ERC-4337 gasless accounts. Open-keeper liquidations.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, borderTop: '1px solid rgba(240,185,11,0.15)', paddingTop: 24 }}>
            <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8' }}>© 2026 Nexus Protocol · MIT License</span>
            <a href="https://github.com/NexTechArchitect/Nexus-Protocol" target="_blank" rel="noreferrer"
              style={{ fontSize: 12, fontWeight: 600, color: '#475569', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#0f172a'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#475569'}>
              GitHub ↗
            </a>
          </div>
        </FadeUp>
      </footer>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function NexusDocs() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [active, setActive]         = useState('overview');
  const [progress, setProgress]     = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch]         = useState('');

  useEffect(() => { document.title = 'Nexus Protocol — Technical Docs'; }, []);

  // Scroll progress
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const fn = () => setProgress(el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight) * 100);
    el.addEventListener('scroll', fn, { passive: true });
    return () => el.removeEventListener('scroll', fn);
  }, []);

  // Active section via IntersectionObserver on the scrollable container
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { root: el, threshold: 0.3 }
    );
    el.querySelectorAll('section[id]').forEach(s => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  // ✅ FIX: use getBoundingClientRect() relative to scrollable container
  const scrollTo = useCallback((id: string) => {
    const container = contentRef.current;
    if (!container) return;
    const el = container.querySelector(`#${id}`) as HTMLElement | null;
    if (!el) return;
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    const offset = elTop - containerTop + container.scrollTop - 24;
    container.scrollTo({ top: offset, behavior: 'smooth' });
    setMobileOpen(false);
  }, []);

  // ✅ FIX: filter nav properly — search works on section label AND item title
  const filteredNav: NavSection[] = NAV.map(s => ({
    ...s,
    items: s.items.filter(item =>
      search === '' ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      s.label.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(s => s.items.length > 0);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#FAFAF5', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(240,185,11,0.3); border-radius: 3px; }
        code {
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          font-size: 12.5px;
          background: #fef3c7;
          padding: 1.5px 5px;
          border-radius: 5px;
          color: #7a4e06;
          border: 1px solid rgba(217,119,6,0.2);
        }
        em { font-style: italic; }
      `}</style>

      {/* Gold progress bar — right edge */}
      <div style={{ position: 'fixed', top: 0, right: 0, width: 3, height: '100vh', background: 'rgba(240,185,11,0.12)', zIndex: 100 }}>
        <motion.div style={{ width: '100%', height: `${progress}%`, background: 'linear-gradient(to bottom, #F0B90B, #fbbf24)' }} />
      </div>

      {/* ── MOBILE TOP BAR ── */}
      <div style={{ display: 'none' }} className="mobile-bar">
        {/* rendered via css below */}
      </div>
      <style>{`
        @media (max-width: 768px) {
          .mobile-bar {
            display: flex !important;
            position: fixed; top: 0; left: 0; right: 0; z-index: 60;
            align-items: center; justify-content: space-between;
            padding: 0 16px; height: 52px;
            background: rgba(250,250,245,0.95); backdrop-filter: blur(10px);
            border-bottom: 1px solid rgba(240,185,11,0.2);
          }
        }
      `}</style>

      {/* Mobile top bar — proper React */}
      <div className="md:hidden" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 52, background: 'rgba(250,250,245,0.96)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(240,185,11,0.2)' }}>
        {/* Back to dashboard — top left */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#475569', textDecoration: 'none', padding: '4px 10px', background: '#f1f5f9', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <Icons.ArrowLeft /> Dashboard
        </a>
        {/* Logo center */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, background: '#F0B90B', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(240,185,11,0.4)' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 12 }}>N</span>
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Nexus Docs</span>
        </div>
        {/* Hamburger — opens sidebar */}
        <button onClick={() => setMobileOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}>
          {mobileOpen ? <Icons.X /> : <Icons.Menu />}
        </button>
      </div>

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 50, backdropFilter: 'blur(2px)' }}
            />
            <motion.div key="drawer"
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              style={{ position: 'fixed', top: 0, left: 0, height: '100%', width: 260, zIndex: 70, paddingTop: 52, boxShadow: '4px 0 24px rgba(0,0,0,0.12)' }}>
              <Sidebar active={active} search={search} setSearch={setSearch} scrollTo={scrollTo} filteredNav={filteredNav} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DESKTOP SIDEBAR — truly fixed ── */}
      <div style={{ display: 'none' }} className="md:block" />
      <aside
        className="hidden md:flex"
        style={{ position: 'fixed', top: 0, left: 0, height: '100vh', width: 240, zIndex: 30, flexDirection: 'column' }}
      >
        <Sidebar active={active} search={search} setSearch={setSearch} scrollTo={scrollTo} filteredNav={filteredNav} />
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main
        ref={contentRef}
        style={{ flex: 1, height: '100vh', overflowY: 'auto', paddingTop: 0 }}
        className="md:ml-60 pt-[52px] md:pt-0"
      >
        <PageContent scrollTo={scrollTo} />
      </main>
    </div>
  );
}
