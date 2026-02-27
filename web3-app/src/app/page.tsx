import Link from "next/link";
import { AccountVerification } from "@/components/AccountVerification";

export default function Home() {
  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#FAFAF5]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }
        body { font-family: 'Syne', sans-serif; }
        .mono { font-family: 'Space Mono', monospace; }

        @keyframes blob {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(38px,-52px) scale(1.09); }
          66%      { transform: translate(-22px,24px) scale(0.94); }
        }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes floatY {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-14px); }
        }
        @keyframes shimmer {
          0%   { background-position: -400% center; }
          100% { background-position: 400% center; }
        }
        @keyframes lineReveal {
          from { width: 0; }
          to   { width: 5rem; }
        }
        @keyframes glowBreath {
          0%,100% { opacity:0.35; transform:scale(1); }
          50%     { opacity:0.65; transform:scale(1.05); }
        }
        @keyframes spinOrbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes scanLine {
          0%,100% { top:-10%; opacity:0; }
          20%     { opacity:0.6; }
          80%     { opacity:0.6; }
          99%     { top:110%; opacity:0; }
        }
        @keyframes connectPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(240,185,11,0); }
          50%     { box-shadow: 0 0 0 8px rgba(240,185,11,0.1); }
        }

        .blob-1 { animation: blob 10s infinite; }
        .blob-2 { animation: blob 13s infinite 3.5s; }
        .blob-3 { animation: blob 11s infinite 7s; }

        .ticker-track { animation: ticker 40s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }

        .f1 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.05s both; }
        .f2 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.18s both; }
        .f3 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.30s both; }
        .f4 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.42s both; }
        .f6 { animation: fadeUp 0.8s cubic-bezier(0.16,1,0.3,1) 0.66s both; }

        .card-float  { animation: floatY 7s ease-in-out infinite; }
        .glow-breath { animation: glowBreath 4s ease-in-out infinite; }
        .orbit-spin  { animation: spinOrbit 24s linear infinite; }
        .orbit-spin-r{ animation: spinOrbit 36s linear infinite reverse; }

        .gold-text {
          background: linear-gradient(90deg,#F0B90B,#ffe066,#F0B90B,#f59e0b,#F0B90B);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 6s linear infinite;
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(240,185,11,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240,185,11,0.05) 1px, transparent 1px);
          background-size: 52px 52px;
        }

        .btn-gold {
          background: linear-gradient(135deg,#F0B90B 0%,#f59e0b 100%);
          box-shadow: 0 4px 20px rgba(240,185,11,0.4), inset 0 1px 0 rgba(255,255,255,0.22);
          transition: all 0.22s cubic-bezier(0.16,1,0.3,1);
          font-family: 'Syne', sans-serif; font-weight: 700;
        }
        .btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 32px rgba(240,185,11,0.52), inset 0 1px 0 rgba(255,255,255,0.22);
        }
        .btn-gold:active { transform: translateY(0); }

        .btn-outline {
          border: 1.5px solid rgba(240,185,11,0.25);
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(8px);
          transition: all 0.2s;
          font-family: 'Syne', sans-serif; font-weight: 700;
        }
        .btn-outline:hover {
          border-color: rgba(240,185,11,0.48);
          background: rgba(255,251,235,0.92);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(240,185,11,0.14);
        }

        .connect-card {
          background: rgba(255,255,255,0.94);
          border: 1.5px solid rgba(240,185,11,0.18);
          box-shadow:
            0 40px 100px rgba(240,185,11,0.13),
            0 12px 32px rgba(0,0,0,0.06),
            inset 0 1px 0 rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
        }

        .connect-zone {
          background: linear-gradient(145deg, rgba(240,185,11,0.05) 0%, rgba(255,255,255,0.6) 100%);
          border: 1px solid rgba(240,185,11,0.14);
          animation: connectPulse 4s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }
        .connect-zone::after {
          content: '';
          position: absolute;
          left: 0; right: 0; height: 48px;
          background: linear-gradient(transparent, rgba(240,185,11,0.07), transparent);
          animation: scanLine 3.5s ease-in-out infinite;
          pointer-events: none;
        }

        .faucet-pill {
          background: rgba(59,130,246,0.06);
          border: 1.5px solid rgba(59,130,246,0.16);
          transition: all 0.22s;
        }
        .faucet-pill:hover {
          background: rgba(59,130,246,0.1);
          border-color: rgba(59,130,246,0.3);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59,130,246,0.1);
        }

        .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 640px) { .stat-row { grid-template-columns: repeat(2, 1fr); } }
        .stat-cell { transition: background 0.18s; }
        .stat-cell:hover { background: rgba(255,251,235,0.85) !important; }

        .arch-card {
          transition: transform 0.28s cubic-bezier(0.16,1,0.3,1), box-shadow 0.28s, border-color 0.28s;
          background: white;
          border: 1px solid rgba(0,0,0,0.055);
        }
        .arch-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 56px rgba(0,0,0,0.08);
          border-color: rgba(240,185,11,0.22);
        }
        .arch-card:hover .arch-icon { transform: scale(1.14) rotate(-3deg); }
        .arch-icon { transition: transform 0.28s cubic-bezier(0.16,1,0.3,1); }

        .feature-chip {
          background: rgba(255,255,255,0.75);
          border: 1px solid rgba(0,0,0,0.06);
          transition: all 0.2s;
        }
        .feature-chip:hover {
          background: rgba(255,251,235,0.95);
          border-color: rgba(240,185,11,0.25);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(240,185,11,0.1);
        }

        .gold-divider {
          background: linear-gradient(90deg, transparent, rgba(240,185,11,0.22), transparent);
          height: 1px;
        }

        @media (max-width: 380px) { .hero-h1 { font-size: 2.8rem !important; } }
      `}</style>

      {/* BG */}
      <div className="fixed inset-0 z-0 grid-bg bg-[#FAFAF5]" />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="blob-1 absolute top-[-20%] left-[-12%] w-[68vw] h-[68vw] rounded-full opacity-60"
          style={{background:'radial-gradient(circle,rgba(240,185,11,0.22) 0%,transparent 68%)',filter:'blur(72px)'}} />
        <div className="blob-2 absolute top-[8%] right-[-16%] w-[54vw] h-[54vw] rounded-full opacity-45"
          style={{background:'radial-gradient(circle,rgba(251,191,36,0.18) 0%,transparent 68%)',filter:'blur(88px)'}} />
        <div className="blob-3 absolute bottom-[-16%] left-[20%] w-[46vw] h-[46vw] rounded-full opacity-40"
          style={{background:'radial-gradient(circle,rgba(253,230,138,0.38) 0%,transparent 68%)',filter:'blur(96px)'}} />
      </div>

      {/* Ticker */}
      <div className="relative z-10 border-b border-[#F0B90B]/12 bg-[#F0B90B]/[0.025] overflow-hidden h-9 flex items-center select-none">
        <div className="ticker-track flex whitespace-nowrap">
          {Array.from({length:2}).flatMap((_,gi)=>[
            {l:'BTC/USDC',v:'$65,251',c:'+1.2%'},{l:'ETH/USDC',v:'$1,915',c:'+5.1%'},
            {l:'MAX LEVERAGE',v:'50×',c:'Isolated'},{l:'ORACLE',v:'Chainlink',c:'Live'},
            {l:'GAS FEES',v:'$0',c:'Sponsored'},{l:'NETWORK',v:'Sepolia',c:'● LIVE'},
            {l:'VAULT',v:'Open',c:'LP Welcome'},{l:'POSITIONS',v:'Active',c:'Non-Custodial'},
          ].map((t,i)=>(
            <div key={`${gi}-${i}`} className="flex items-center gap-2 px-5 border-r border-[#F0B90B]/10">
              <span className="mono text-[9px] font-bold text-slate-400 uppercase tracking-[0.14em]">{t.l}</span>
              <span className="mono text-[10px] font-bold text-slate-700">{t.v}</span>
              <span className="mono text-[10px] font-bold text-emerald-600">{t.c}</span>
            </div>
          )))}
        </div>
      </div>

      {/* HERO */}
      <main className="relative z-10 max-w-[90rem] mx-auto px-4 sm:px-8 lg:px-12 pt-20 sm:pt-24 lg:pt-28 pb-16 sm:pb-20">
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-10 lg:gap-14">

          {/* LEFT */}
          <div className="flex-1 w-full text-center lg:text-left pt-2">

            <div className="f1 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/25 mb-7 sm:mb-9">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F0B90B] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F0B90B]" />
              </span>
              <span className="mono text-[10px] font-bold text-[#92600A] uppercase tracking-[0.18em]">Live on Ethereum Sepolia</span>
            </div>

            <div className="f2">
              <h1 className="hero-h1 text-[3.2rem] sm:text-[4.6rem] lg:text-[5.6rem] font-extrabold text-slate-900 tracking-[-0.035em] leading-[0.92]"
                style={{fontFamily:'Syne,sans-serif',fontWeight:800}}>
                Trade Perps.
              </h1>
              <h1 className="hero-h1 text-[3.2rem] sm:text-[4.6rem] lg:text-[5.6rem] font-extrabold tracking-[-0.035em] leading-[0.92] mb-7 sm:mb-9"
                style={{fontFamily:'Syne,sans-serif',fontWeight:800}}>
                <span className="gold-text">Own Your Keys.</span>
              </h1>
            </div>

            <div className="f2 flex justify-center lg:justify-start mb-6">
              <div className="h-[3px] rounded-full bg-gradient-to-r from-[#F0B90B] to-amber-400"
                style={{animation:'lineReveal 1s cubic-bezier(0.16,1,0.3,1) 0.4s both',width:'4rem'}} />
            </div>

            <p className="f3 text-[1rem] sm:text-[1.1rem] text-slate-500 mb-8 max-w-[500px] mx-auto lg:mx-0 leading-relaxed font-medium"
              style={{fontFamily:'Syne,sans-serif'}}>
              On-chain perpetuals powered by Chainlink oracles, EIP-4337 smart accounts,
              and gas-sponsored execution.{' '}
              <strong className="text-slate-800 font-bold">Up to 50× leverage</strong>{' '}
              on BTC and ETH — fully non-custodial.
            </p>

            <div className="f4 flex flex-col sm:flex-row items-center lg:items-start gap-3 justify-center lg:justify-start mb-6">
              <Link href="/trade"
                className="btn-gold w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl text-[15px] text-white tracking-wide">
                Start Trading
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5-5 5M6 12h12"/>
                </svg>
              </Link>
              <Link href="/vaults"
                className="btn-outline w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-2xl text-[15px] text-slate-700 tracking-wide">
                Provide Liquidity
                <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12"/>
                </svg>
              </Link>
            </div>

            <div className="f4 flex justify-center lg:justify-start mb-8">
              <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
                className="faucet-pill inline-flex items-center gap-3 px-4 py-3 rounded-2xl w-full sm:w-auto max-w-[320px]">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-200 flex items-center justify-center text-lg flex-shrink-0">🚰</div>
                <div className="text-left">
                  <p className="text-[13px] font-bold text-blue-700 leading-snug" style={{fontFamily:'Syne,sans-serif'}}>Need testnet USDC?</p>
                  <p className="mono text-[10px] text-slate-500">Circle Faucet → <span className="font-bold text-slate-700">Sepolia only</span></p>
                </div>
                <svg className="w-4 h-4 text-blue-300 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </a>
            </div>

            <div className="f6 stat-row gap-px bg-slate-100/70 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              {[
                {l:'Max Leverage', v:'50×'},
                {l:'Margin Mode',  v:'Isolated'},
                {l:'Gas Fees',     v:'$0'},
                {l:'Oracle',       v:'Chainlink'},
              ].map(s=>(
                <div key={s.l} className="stat-cell bg-white px-4 sm:px-5 py-4">
                  <p className="mono text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">{s.l}</p>
                  <p className="text-lg sm:text-2xl font-extrabold text-slate-900"
                    style={{fontFamily:'Syne,sans-serif',fontWeight:800}}>{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Connect Card */}
          <div className="w-full lg:w-[410px] xl:w-[430px] flex-shrink-0 mt-2 lg:mt-10">
            <div className="card-float relative">

              <div className="absolute -inset-8 rounded-3xl pointer-events-none blur-3xl glow-breath"
                style={{background:'radial-gradient(circle,rgba(240,185,11,0.5) 0%,transparent 70%)'}} />
              <div className="orbit-spin absolute pointer-events-none rounded-full"
                style={{border:'1px dashed rgba(240,185,11,0.2)',inset:'-28px'}} />
              <div className="orbit-spin-r absolute pointer-events-none rounded-full"
                style={{border:'1px dotted rgba(240,185,11,0.12)',inset:'-52px'}} />

              <div className="relative connect-card rounded-3xl overflow-hidden">
                <div className="h-[3px] bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent" />

                <div className="p-5 sm:p-7">

                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] text-white"
                        style={{background:'linear-gradient(135deg,#F0B90B,#f59e0b)',boxShadow:'0 2px 10px rgba(240,185,11,0.45)',fontFamily:'Syne,sans-serif',fontWeight:800}}>
                        1
                      </div>
                      <div>
                        <h2 className="text-[1.15rem] font-extrabold text-slate-900 tracking-tight leading-none"
                          style={{fontFamily:'Syne,sans-serif',fontWeight:800}}>Connect Wallet</h2>
                        <p className="mono text-[10px] text-slate-400 mt-0.5">Access the protocol</p>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="w-10 h-10 bg-[#F0B90B]/10 border border-[#F0B90B]/20 rounded-2xl flex items-center justify-center text-xl">⚡</div>
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                    </div>
                  </div>

                  {/* ★ Connect Zone — AccountVerification sits here, full width centered ★ */}
                  <div className="connect-zone rounded-2xl flex flex-col items-center gap-3 py-6 px-4 mb-5">
                    <div className="relative mb-1">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#F0B90B]/20 to-amber-100/60 border border-[#F0B90B]/25 flex items-center justify-center text-2xl">
                        🔐
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                        </svg>
                      </span>
                    </div>

                    <div className="text-center">
                      <p className="text-[13px] font-bold text-slate-700" style={{fontFamily:'Syne,sans-serif'}}>Your self-custodial wallet</p>
                      <p className="mono text-[10px] text-slate-400 mt-0.5">No seed phrase stored · Gas-free · EIP-4337</p>
                    </div>

                    {/* AccountVerification is already 'use client' — no server error */}
                    <div className="w-full">
                      <AccountVerification />
                    </div>
                  </div>

                  <div className="gold-divider mb-4" />

                  {/* Features */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      {icon:'🔐', label:'Self-Custody', sub:'Your keys'},
                      {icon:'⛽', label:'Gas-Free',     sub:'Sponsored'},
                      {icon:'🔗', label:'On-Chain',     sub:'Chainlink'},
                    ].map(f=>(
                      <div key={f.label} className="feature-chip flex flex-col items-center gap-1 py-3 px-1 rounded-xl cursor-default">
                        <span className="text-lg">{f.icon}</span>
                        <span className="mono text-[8px] font-bold text-slate-700 uppercase tracking-wide text-center">{f.label}</span>
                        <span className="mono text-[8px] text-slate-400">{f.sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quick links */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <Link href="/trade"
                      className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-[#F0B90B]/20 bg-[#F0B90B]/[0.07] hover:bg-[#F0B90B]/12 hover:border-[#F0B90B]/35 transition-all text-[11px] font-bold text-[#92600A] uppercase tracking-wide active:scale-[0.97]"
                      style={{fontFamily:'Syne,sans-serif'}}>
                      📈 Trade Now
                    </Link>
                    <Link href="/vaults"
                      className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all text-[11px] font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wide active:scale-[0.97]"
                      style={{fontFamily:'Syne,sans-serif'}}>
                      🏦 Liquidity
                    </Link>
                  </div>

                  {/* Faucet */}
                  <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50/80 border border-blue-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                    <span className="text-base flex-shrink-0">🚰</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-blue-700 leading-tight" style={{fontFamily:'Syne,sans-serif'}}>Get testnet USDC</p>
                      <p className="mono text-[9px] text-blue-400">Ethereum Sepolia only</p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-blue-300 group-hover:text-blue-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Architecture */}
      <section className="relative z-10 border-t border-slate-100 bg-white/75 backdrop-blur-sm py-16 sm:py-24">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="mono inline-block text-[10px] font-bold text-[#92600A] bg-[#F0B90B]/10 border border-[#F0B90B]/22 px-4 py-1.5 rounded-full uppercase tracking-widest mb-4">Architecture</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4"
              style={{fontFamily:'Syne,sans-serif',fontWeight:800}}>
              Real infrastructure.<br/>No shortcuts.
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed text-sm sm:text-base">
              Every component runs on Sepolia. No off-chain order books, no custodial risk.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              {icon:'📡',bg:'bg-[#F0B90B]/10 border-[#F0B90B]/25',title:'Chainlink Price Feeds',  tag:'PriceOracle.sol',       desc:'BTC/USD and ETH/USD prices read live from Chainlink aggregators. Entry, PnL, and liquidation all use the same on-chain source.'},
              {icon:'🏦',bg:'bg-emerald-50 border-emerald-200',   title:'Non-Custodial Vault',   tag:'PerpsVault.sol',        desc:'All collateral in 18-decimal precision. Deposits, withdrawals, and PnL settlement are atomic — funds never leave the contract.'},
              {icon:'⚡',bg:'bg-blue-50 border-blue-200',         title:'EIP-4337 Accounts',     tag:'NexusPaymaster.sol',    desc:'Every wallet is a smart account. NexusPaymaster sponsors all gas — trade with zero ETH, full self-custody.'},
              {icon:'🔀',bg:'bg-purple-50 border-purple-200',     title:'CCIP Cross-Chain',      tag:'CrossChainRouter.sol',  desc:'Open positions from any chain. CrossChainRouter relays margin and trade params to Sepolia automatically.'},
              {icon:'🤖',bg:'bg-slate-50 border-slate-200',       title:'Keeper Liquidations',   tag:'LiquidationEngine.sol', desc:'Batch liquidations at 80% threshold. Settled atomically with 10% keeper reward.'},
              {icon:'📊',bg:'bg-rose-50 border-rose-200',         title:'On-Chain PnL Math',     tag:'PnLCalculator.sol',     desc:'Size, leverage, entry vs oracle — 18-decimal arithmetic throughout. No rounding, no approximations.'},
            ].map(c=>(
              <div key={c.title} className="arch-card group rounded-2xl p-5 sm:p-6 shadow-sm cursor-default">
                <div className={`arch-icon w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center text-xl border mb-4 ${c.bg}`}>{c.icon}</div>
                <h3 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 mb-2"
                  style={{fontFamily:'Syne,sans-serif',fontWeight:800}}>{c.title}</h3>
                <p className="text-[12px] sm:text-[13px] text-slate-500 font-medium leading-relaxed mb-4">{c.desc}</p>
                <span className="mono text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-wide">{c.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-[#F0B90B]/15 bg-[#FFFBEB]/50 py-14 sm:py-24">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-8 lg:px-12 text-center">
          <span className="mono inline-block text-[10px] font-bold text-[#92600A] bg-[#F0B90B]/10 border border-[#F0B90B]/22 px-4 py-1.5 rounded-full uppercase tracking-widest mb-5">Get Started</span>
          <h2 className="text-2xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-5"
            style={{fontFamily:'Syne,sans-serif',fontWeight:800}}>
            Ready to trade on-chain?
          </h2>
          <p className="text-slate-500 font-medium mb-9 max-w-lg mx-auto leading-relaxed text-sm sm:text-base">
            Connect your wallet, grab testnet USDC from Circle, and start trading BTC/ETH with up to 50× leverage. Zero gas, full custody.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/trade"
              className="btn-gold w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 sm:px-9 py-4 rounded-2xl text-[15px] text-white">
              Launch Trading App
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5-5 5M6 12h12"/>
              </svg>
            </Link>
            <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
              className="btn-outline w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 sm:px-9 py-4 rounded-2xl text-[15px] text-slate-700">
              🚰 Get USDC Faucet
            </a>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="relative z-10 border-t border-[#F0B90B]/12 bg-[#FFFBEB]/40 py-6 sm:py-7">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-9 h-9 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-base flex-shrink-0">⚠️</div>
          <div>
            <p className="mono text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-1">Testnet Disclaimer</p>
            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-3xl">
              Nexus Perps runs on Ethereum Sepolia testnet. All funds are testnet USDC with no real value.
              Faucet at{' '}
              <a href="https://faucet.circle.com/"
                className="text-blue-600 hover:text-blue-700 underline underline-offset-2 font-bold transition-colors"
                target="_blank" rel="noopener noreferrer">faucet.circle.com</a>
              {' '}— select <strong className="text-slate-800">Ethereum Sepolia</strong> only. Not financial advice.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-100 bg-white/80 py-6 sm:py-7">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F0B90B] rounded-xl flex items-center justify-center"
              style={{boxShadow:'0 2px 10px rgba(240,185,11,0.38)'}}>
              <span className="text-white text-sm" style={{fontFamily:'Syne,sans-serif',fontWeight:800}}>N</span>
            </div>
            <span className="text-[16px] sm:text-[17px] text-slate-900"
              style={{fontFamily:'Syne,sans-serif',fontWeight:800,letterSpacing:'-0.02em'}}>NEXUS PERPS</span>
            <span className="mono text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full uppercase tracking-widest">Sepolia</span>
          </div>
          <p className="mono text-[10px] text-slate-400 text-center hidden sm:block">
            Chainlink · EIP-4337 · CCIP · Non-Custodial
          </p>
          <div className="flex items-center gap-4 sm:gap-5">
            <a href="https://github.com/NexTechArchitect/Nexus-Protocol" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400 hover:text-slate-700 transition-colors"
              style={{fontFamily:'Syne,sans-serif'}}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
              </svg>
              GitHub
            </a>
            <Link href="/docs" className="text-[12px] font-bold text-slate-400 hover:text-slate-700 transition-colors"
              style={{fontFamily:'Syne,sans-serif'}}>Docs</Link>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="mono text-[10px] font-bold text-emerald-600">All systems live</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
