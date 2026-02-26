import { AccountVerification } from "@/components/AccountVerification";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative w-full min-h-screen overflow-x-hidden bg-[#FAFAF5]">
      <style>{`
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
          from { opacity:0; transform:translateY(24px); }
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
          to   { width: 6rem; }
        }
        @keyframes glowBorder {
          0%,100% { box-shadow: 0 0 0 0 rgba(240,185,11,0); }
          50%     { box-shadow: 0 0 0 6px rgba(240,185,11,0.1); }
        }

        .blob-1 { animation: blob 10s infinite; }
        .blob-2 { animation: blob 13s infinite 3.5s; }
        .blob-3 { animation: blob 11s infinite 7s; }
        .ticker-track { animation: ticker 38s linear infinite; }

        .f1 { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        .f2 { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.22s both; }
        .f3 { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.34s both; }
        .f4 { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.46s both; }
        .f5 { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.58s both; }
        .f6 { animation: fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) 0.7s both; }

        .card-float { animation: floatY 7s ease-in-out infinite; }
        .card-glow  { animation: glowBorder 3.5s ease-in-out infinite; }

        .gold-text {
          background: linear-gradient(90deg, #F0B90B, #ffca28, #F0B90B, #f59e0b);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 5s linear infinite;
        }

        .grid-bg {
          background-image:
            linear-gradient(rgba(240,185,11,0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240,185,11,0.055) 1px, transparent 1px);
          background-size: 52px 52px;
        }

        .btn-gold {
          background: #F0B90B;
          transition: background 0.2s, transform 0.18s, box-shadow 0.18s;
          box-shadow: 0 4px 18px rgba(240,185,11,0.35);
        }
        .btn-gold:hover {
          background: #e0ab00;
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(240,185,11,0.45);
        }
        .btn-gold:active { transform: translateY(0); }

        .btn-outline {
          border: 2px solid rgba(240,185,11,0.3);
          background: rgba(255,255,255,0.7);
          transition: all 0.18s;
        }
        .btn-outline:hover {
          border-color: rgba(240,185,11,0.5);
          background: rgba(255,251,235,0.8);
          transform: translateY(-1px);
        }

        .faucet-pill {
          background: rgba(59,130,246,0.07);
          border: 1.5px solid rgba(59,130,246,0.2);
          transition: all 0.2s;
        }
        .faucet-pill:hover {
          background: rgba(59,130,246,0.12);
          border-color: rgba(59,130,246,0.35);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59,130,246,0.1);
        }

        .arch-card {
          transition: transform 0.25s cubic-bezier(0.16,1,0.3,1), box-shadow 0.25s;
        }
        .arch-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 48px rgba(0,0,0,0.07);
        }
        .arch-card:hover .arch-icon {
          transform: scale(1.12);
        }
        .arch-icon { transition: transform 0.25s; }

        .stat-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
        }
        @media (max-width: 640px) {
          .stat-row { grid-template-columns: repeat(2, 1fr); }
        }

        .connect-card {
          background: white;
          border: 1.5px solid rgba(240,185,11,0.2);
          box-shadow: 0 24px 80px rgba(240,185,11,0.14), 0 4px 16px rgba(0,0,0,0.06);
        }
      `}</style>

      {/* Background blobs */}
      <div className="fixed inset-0 z-0 grid-bg bg-[#FAFAF5]" />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="blob-1 absolute top-[-20%] left-[-12%] w-[68vw] h-[68vw] rounded-full opacity-60"
          style={{background:'radial-gradient(circle,rgba(240,185,11,0.22) 0%,transparent 68%)',filter:'blur(72px)'}} />
        <div className="blob-2 absolute top-[8%] right-[-16%] w-[54vw] h-[54vw] rounded-full opacity-45"
          style={{background:'radial-gradient(circle,rgba(251,191,36,0.18) 0%,transparent 68%)',filter:'blur(88px)'}} />
        <div className="blob-3 absolute bottom-[-16%] left-[20%] w-[46vw] h-[46vw] rounded-full opacity-38"
          style={{background:'radial-gradient(circle,rgba(253,230,138,0.38) 0%,transparent 68%)',filter:'blur(96px)'}} />
      </div>

      {/* Ticker */}
      <div className="relative z-10 border-b border-[#F0B90B]/18 bg-[#F0B90B]/[0.04] overflow-hidden h-9 flex items-center">
        <div className="ticker-track flex whitespace-nowrap select-none">
          {Array.from({length:2}).flatMap((_,gi)=>[
            {l:'BTC/USDC',v:'$65,251',c:'+1.2%'},{l:'ETH/USDC',v:'$1,915',c:'+5.1%'},
            {l:'MAX LEVERAGE',v:'50×',c:'Isolated'},{l:'ORACLE',v:'Chainlink',c:'Live'},
            {l:'GAS FEES',v:'$0',c:'Sponsored'},{l:'NETWORK',v:'Sepolia',c:'● LIVE'},
            {l:'VAULT',v:'Open',c:'LP Welcome'},
          ].map((t,i)=>(
            <div key={`${gi}-${i}`} className="flex items-center gap-2 px-5 border-r border-[#F0B90B]/12">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{t.l}</span>
              <span className="text-[10px] font-black text-slate-700 font-mono">{t.v}</span>
              <span className="text-[10px] font-black text-emerald-600">{t.c}</span>
            </div>
          )))}
        </div>
      </div>

      {/* HERO */}
      <main className="relative z-10 max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12 pt-16 sm:pt-20 lg:pt-24 pb-20">
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-12 lg:gap-14">

          {/* LEFT */}
          <div className="flex-1 w-full text-center lg:text-left pt-2">

            {/* Badge */}
            <div className="f1 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/30 mb-8">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F0B90B] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#F0B90B]" />
              </span>
              <span className="text-[11px] font-black text-[#92600A] uppercase tracking-[0.18em]">Live on Ethereum Sepolia</span>
            </div>

            {/* HEADLINE — system fonts, black weight */}
            <div className="f2">
              <h1 className="text-[3.4rem] sm:text-[5rem] lg:text-[5.8rem] font-black text-slate-900 tracking-[-0.03em] leading-[0.93] mb-0">
                Trade Perps.
              </h1>
              <h1 className="text-[3.4rem] sm:text-[5rem] lg:text-[5.8rem] font-black tracking-[-0.03em] leading-[0.93] mb-8">
                <span className="gold-text">Own Your Keys.</span>
              </h1>
            </div>

            {/* Underline */}
            <div className="f2 flex justify-center lg:justify-start mb-7">
              <div className="h-1 w-24 bg-gradient-to-r from-[#F0B90B] to-amber-400 rounded-full"
                style={{animation:'lineReveal 0.9s cubic-bezier(0.16,1,0.3,1) 0.4s both'}} />
            </div>

            <p className="f3 text-[1.05rem] sm:text-xl text-slate-500 mb-9 max-w-[520px] mx-auto lg:mx-0 leading-relaxed font-medium">
              On-chain perpetuals powered by Chainlink oracles, EIP-4337 smart accounts,
              and gas-sponsored execution.{' '}
              <strong className="text-slate-800 font-black">Up to 50× leverage</strong>{' '}
              on BTC and ETH — fully non-custodial.
            </p>

            {/* CTAs */}
            <div className="f4 flex flex-col sm:flex-row items-center lg:items-start gap-3 justify-center lg:justify-start mb-7">
              <Link href="/trade"
                className="btn-gold w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-black text-[15px] text-white tracking-wide">
                Start Trading
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5-5 5M6 12h12"/>
                </svg>
              </Link>
              <Link href="/vaults"
                className="btn-outline w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-black text-[15px] text-slate-700 tracking-wide">
                Provide Liquidity
                <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12"/>
                </svg>
              </Link>
            </div>

            {/* Faucet */}
            <div className="f4 flex justify-center lg:justify-start">
              <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
                className="faucet-pill inline-flex items-center gap-3 px-4 py-3 rounded-2xl w-full sm:w-auto max-w-[340px]">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-200 flex items-center justify-center text-lg flex-shrink-0">🚰</div>
                <div className="text-left">
                  <p className="text-[13px] font-black text-blue-700 leading-snug">Need testnet USDC?</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Circle Faucet →{' '}
                    <span className="font-black text-slate-700">Ethereum Sepolia only</span>
                  </p>
                </div>
                <svg className="w-4 h-4 text-blue-300 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </a>
            </div>

            {/* Stats */}
            <div className="f6 stat-row gap-px bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 shadow-sm mt-10">
              {[
                {l:'Max Leverage', v:'50×'},
                {l:'Margin Mode',  v:'Isolated'},
                {l:'Gas Fees',     v:'$0'},
                {l:'Oracle',       v:'Chainlink'},
              ].map(s=>(
                <div key={s.l} className="bg-white px-5 py-4 hover:bg-[#FFFBEB]/70 transition-colors">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.l}</p>
                  <p className="text-xl sm:text-2xl font-black text-slate-900">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Connect Card */}
          <div className="w-full lg:w-[400px] xl:w-[420px] flex-shrink-0 mt-4 lg:mt-10">
            <div className="card-float relative">
              {/* Ambient glow */}
              <div className="absolute -inset-6 rounded-3xl pointer-events-none blur-3xl opacity-25"
                style={{background:'radial-gradient(circle,rgba(240,185,11,0.5) 0%,transparent 70%)'}} />

              <div className="relative connect-card rounded-2xl overflow-hidden card-glow">
                {/* Gold top accent */}
                <div className="h-1.5 bg-gradient-to-r from-transparent via-[#F0B90B] to-transparent" />

                <div className="p-6 sm:p-8">
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F0B90B]/10 border border-[#F0B90B]/20 mb-2.5">
                        <span className="text-[9px] font-black text-[#92600A] uppercase tracking-[0.18em]">Step 1 of 2</span>
                      </div>
                      <h2 className="text-[1.35rem] font-black text-slate-900 tracking-tight leading-tight">Connect & Trade</h2>
                      <p className="text-[13px] text-slate-400 font-medium mt-0.5">Connect wallet to access the protocol</p>
                    </div>
                    <div className="relative flex-shrink-0 ml-4">
                      <div className="w-11 h-11 bg-[#F0B90B]/10 border border-[#F0B90B]/25 rounded-2xl flex items-center justify-center text-2xl">⚡</div>
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-[2.5px] border-white animate-pulse" />
                    </div>
                  </div>

                  {/* Auth component - CENTERED */}
                  <div className="flex justify-center w-full">
                    <AccountVerification />
                  </div>

                  {/* Divider */}
                  <div className="my-5 flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-100" />
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Protocol Features</span>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      {icon:'🔐', label:'Self-Custody', sub:'Your keys'},
                      {icon:'⛽', label:'Gas-Free',     sub:'Sponsored'},
                      {icon:'🔗', label:'On-Chain',     sub:'Chainlink'},
                    ].map(f=>(
                      <div key={f.label}
                        className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl bg-slate-50 border border-slate-100 hover:border-[#F0B90B]/25 hover:bg-[#FFFBEB]/60 transition-all cursor-default">
                        <span className="text-xl">{f.icon}</span>
                        <span className="text-[9px] font-black text-slate-700 uppercase tracking-wide text-center leading-tight">{f.label}</span>
                        <span className="text-[9px] text-slate-400">{f.sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quick links */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <Link href="/trade"
                      className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-[#F0B90B]/20 bg-[#F0B90B]/[0.07] hover:bg-[#F0B90B]/12 hover:border-[#F0B90B]/35 transition-all text-[11px] font-black text-[#92600A] uppercase tracking-wide active:scale-[0.97]">
                      📈 Trade Now
                    </Link>
                    <Link href="/vaults"
                      className="flex items-center justify-center gap-1.5 py-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all text-[11px] font-black text-slate-500 hover:text-slate-700 uppercase tracking-wide active:scale-[0.97]">
                      🏦 Liquidity
                    </Link>
                  </div>

                  {/* Inline faucet */}
                  <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                    <span className="text-base flex-shrink-0">🚰</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-black text-blue-700 leading-tight">Get testnet USDC</p>
                      <p className="text-[9px] text-blue-400 font-medium">Ethereum Sepolia only</p>
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
      <section className="relative z-10 border-t border-slate-100 bg-white/75 backdrop-blur-sm py-20 sm:py-28">
        <div className="max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="inline-block text-[10px] font-black text-[#92600A] bg-[#F0B90B]/10 border border-[#F0B90B]/25 px-4 py-1.5 rounded-full uppercase tracking-widest mb-4">Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
              Real infrastructure.<br/>No shortcuts.
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Every component runs on Sepolia. No off-chain order books, no custodial risk.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {icon:'📡',bg:'bg-[#F0B90B]/10 border-[#F0B90B]/25',title:'Chainlink Price Feeds',  tag:'PriceOracle.sol',       desc:'BTC/USD and ETH/USD prices read live from Chainlink aggregators. Entry, PnL, and liquidation all use the same on-chain source.'},
              {icon:'🏦',bg:'bg-emerald-50 border-emerald-200',   title:'Non-Custodial Vault',   tag:'PerpsVault.sol',        desc:'All collateral in 18-decimal precision. Deposits, withdrawals, and PnL settlement are atomic — funds never leave the contract.'},
              {icon:'⚡',bg:'bg-blue-50 border-blue-200',         title:'EIP-4337 Accounts',     tag:'NexusPaymaster.sol',    desc:'Every wallet is a smart account. NexusPaymaster sponsors all gas — trade with zero ETH, full self-custody.'},
              {icon:'🔀',bg:'bg-purple-50 border-purple-200',      title:'CCIP Cross-Chain',      tag:'CrossChainRouter.sol',  desc:'Open positions from any chain. CrossChainRouter relays margin and trade params to Sepolia automatically.'},
              {icon:'🤖',bg:'bg-slate-50 border-slate-200',        title:'Keeper Liquidations',   tag:'LiquidationEngine.sol', desc:'Batch liquidations at 80% threshold. Settled atomically with 10% keeper reward.'},
              {icon:'📊',bg:'bg-rose-50 border-rose-200',          title:'On-Chain PnL Math',     tag:'PnLCalculator.sol',     desc:'Size, leverage, entry vs oracle — 18-decimal arithmetic throughout. No rounding, no approximations.'},
            ].map(c=>(
              <div key={c.title} className="arch-card group bg-white border border-slate-100 rounded-2xl p-6 shadow-sm cursor-default">
                <div className={`arch-icon w-11 h-11 rounded-xl flex items-center justify-center text-xl border mb-4 ${c.bg}`}>{c.icon}</div>
                <h3 className="text-[15px] font-black text-slate-900 mb-2">{c.title}</h3>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed mb-4">{c.desc}</p>
                <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg font-mono uppercase tracking-wide">{c.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-[#F0B90B]/15 bg-[#FFFBEB]/50 py-16 sm:py-24">
        <div className="max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12 text-center">
          <span className="inline-block text-[10px] font-black text-[#92600A] bg-[#F0B90B]/10 border border-[#F0B90B]/25 px-4 py-1.5 rounded-full uppercase tracking-widest mb-5">Get Started</span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-5">
            Ready to trade on-chain?
          </h2>
          <p className="text-slate-500 font-medium mb-10 max-w-lg mx-auto leading-relaxed">
            Connect your wallet, grab testnet USDC from Circle, and start trading BTC/ETH with up to 50× leverage. Zero gas, full custody.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/trade"
              className="btn-gold w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 rounded-2xl font-black text-[15px] text-white">
              Launch Trading App
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5-5 5M6 12h12"/>
              </svg>
            </Link>
            <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
              className="btn-outline w-full sm:w-auto inline-flex items-center justify-center gap-2 px-9 py-4 rounded-2xl font-black text-[15px] text-slate-700">
              🚰 Get USDC Faucet
            </a>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="relative z-10 border-t border-[#F0B90B]/12 bg-[#FFFBEB]/40 py-7">
        <div className="max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-9 h-9 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-base flex-shrink-0">⚠️</div>
          <div>
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">Testnet Disclaimer</p>
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
      <footer className="relative z-10 border-t border-slate-100 bg-white/80 py-7">
        <div className="max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F0B90B] rounded-xl flex items-center justify-center"
              style={{boxShadow:'0 2px 10px rgba(240,185,11,0.35)'}}>
              <span className="text-white font-black text-sm">N</span>
            </div>
            <span className="text-[17px] font-black text-slate-900 tracking-tight">NEXUS PERPS</span>
            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full uppercase tracking-widest">Sepolia</span>
          </div>
          <p className="text-[11px] font-medium text-slate-400 text-center hidden sm:block">
            Chainlink · EIP-4337 · CCIP · Non-Custodial
          </p>
          <div className="flex items-center gap-5">
            <a href="https://github.com/NexTechArchitect/Nexus-Protocol" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400 hover:text-slate-700 transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
              </svg>
              GitHub
            </a>
            <Link href="/docs" className="text-[12px] font-bold text-slate-400 hover:text-slate-700 transition-colors">Docs</Link>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-black text-emerald-600">All systems live</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}