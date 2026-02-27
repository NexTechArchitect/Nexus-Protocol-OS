'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { name: 'Trade',     path: '/trade'     },
    { name: 'Vaults',    path: '/vaults'    },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Docs',      path: '/docs'      },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Space+Mono:wght@400;700&display=swap');

        .nav-root {
          font-family: 'Syne', sans-serif;
          transition: background 0.3s, box-shadow 0.3s, border-color 0.3s;
        }
        .nav-scrolled {
          background: rgba(250,250,245,0.96) !important;
          box-shadow: 0 1px 0 rgba(240,185,11,0.1), 0 8px 32px rgba(0,0,0,0.07) !important;
        }
        .nav-link {
          position: relative;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          transition: color 0.2s, background 0.2s;
          letter-spacing: 0.02em;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 16px;
          height: 2px;
          border-radius: 2px;
          background: #F0B90B;
          transition: transform 0.2s cubic-bezier(0.16,1,0.3,1);
        }
        .nav-link:hover::after, .nav-link-active::after {
          transform: translateX(-50%) scaleX(1);
        }
        .nav-link-active {
          color: #92600A !important;
          background: rgba(240,185,11,0.1) !important;
          border-color: rgba(240,185,11,0.22) !important;
        }

        .logo-text { font-family: 'Syne', sans-serif; font-weight: 800; letter-spacing: -0.03em; }
        .mono-text { font-family: 'Space Mono', monospace; }

        /* RainbowKit button overrides */
        [data-rk] button[data-testid="rk-connect-button"] {
          background: linear-gradient(135deg, #F0B90B 0%, #f59e0b 100%) !important;
          color: white !important;
          font-family: 'Syne', sans-serif !important;
          font-weight: 700 !important;
          font-size: 14px !important;
          letter-spacing: 0.02em !important;
          border-radius: 14px !important;
          padding: 10px 22px !important;
          border: none !important;
          box-shadow: 0 4px 16px rgba(240,185,11,0.38), inset 0 1px 0 rgba(255,255,255,0.2) !important;
          transition: all 0.2s cubic-bezier(0.16,1,0.3,1) !important;
        }
        [data-rk] button[data-testid="rk-connect-button"]:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 24px rgba(240,185,11,0.5), inset 0 1px 0 rgba(255,255,255,0.2) !important;
        }

        .mobile-menu-enter {
          animation: slideDown 0.28s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .ham-line {
          display: block;
          width: 20px;
          height: 2px;
          background: #475569;
          border-radius: 2px;
          transition: transform 0.25s, opacity 0.25s;
          transform-origin: center;
        }
        .ham-open .ham-l1 { transform: translateY(6px) rotate(45deg); }
        .ham-open .ham-l2 { opacity: 0; transform: scaleX(0); }
        .ham-open .ham-l3 { transform: translateY(-6px) rotate(-45deg); }

        .mobile-nav-item {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          transition: all 0.18s;
        }
        .mobile-nav-item:active { transform: scale(0.97); }
      `}</style>

      <nav className={`nav-root fixed top-0 w-full z-50 border-b border-[#F0B90B]/12 bg-[#FAFAF5]/88 backdrop-blur-2xl ${scrolled ? 'nav-scrolled' : ''}`}>
        <div className="max-w-[90rem] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center h-15 sm:h-[4.5rem]" style={{height:'60px'}}>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#F0B90B] rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                style={{boxShadow:'0 2px 12px rgba(240,185,11,0.45)'}}>
                <span className="text-white font-black text-sm leading-none" style={{fontFamily:'Syne,sans-serif',fontWeight:800}}>N</span>
              </div>
              <span className="logo-text text-lg sm:text-xl text-slate-900">
                NEXUS<span className="text-[#F0B90B]">.</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-0.5">
              {navLinks.map((item) => {
                const active = pathname === item.path;
                return (
                  <Link key={item.name} href={item.path}
                    className={`nav-link px-4 py-2 rounded-xl text-[14px] border ${
                      active ? 'nav-link-active border-[#F0B90B]/22 text-[#92600A] bg-[#F0B90B]/10'
                             : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-[#F0B90B]/05'
                    }`}>
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">

              {/* Faucet */}
              <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
                className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all hover:-translate-y-0.5 group">
                <span className="text-base">🚰</span>
                <div>
                  <p className="mono-text text-[10px] font-bold text-blue-700 leading-none mb-0.5">USDC Faucet</p>
                  <p className="mono-text text-[9px] text-blue-400 leading-none">Eth Sepolia only</p>
                </div>
              </a>

              {/* GitHub */}
              <a href="https://github.com/NexTechArchitect/Nexus-Protocol" target="_blank" rel="noopener noreferrer"
                className="hidden sm:flex w-9 h-9 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-all hover:-translate-y-0.5">
                <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
                </svg>
              </a>

              {/* Sepolia badge */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="mono-text text-[10px] font-bold text-emerald-700 uppercase tracking-wide">SEPOLIA</span>
              </div>

              {/* Connect — desktop */}
              <div className="hidden md:block">
                <ConnectButton label="Connect" accountStatus="avatar" chainStatus="none" />
              </div>

              {/* Hamburger — mobile */}
              <button onClick={() => setIsOpen(!isOpen)}
                className={`md:hidden p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm active:scale-95 transition-all ${isOpen ? 'ham-open' : ''}`}>
                <span className="flex flex-col gap-[4px] w-5">
                  <span className="ham-line ham-l1" />
                  <span className="ham-line ham-l2" />
                  <span className="ham-line ham-l3" />
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="md:hidden mobile-menu-enter bg-[#FAFAF5]/98 border-t border-[#F0B90B]/10 backdrop-blur-3xl shadow-xl">
            <div className="max-w-[90rem] mx-auto px-4 pt-3 pb-6 flex flex-col gap-2">

              {navLinks.map((item) => {
                const active = pathname === item.path;
                return (
                  <Link key={item.name} href={item.path} onClick={() => setIsOpen(false)}
                    className={`mobile-nav-item flex items-center justify-between px-5 py-4 rounded-2xl text-[15px] border ${
                      active
                        ? 'bg-[#F0B90B]/10 text-[#92600A] border-[#F0B90B]/25'
                        : 'bg-white/80 text-slate-700 border-slate-100 hover:border-[#F0B90B]/15'
                    }`}>
                    <span>{item.name}</span>
                    {active && <span className="w-2 h-2 rounded-full bg-[#F0B90B]" />}
                  </Link>
                );
              })}

              <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="mobile-nav-item flex items-center gap-3 px-5 py-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700">
                <span className="text-xl">🚰</span>
                <div>
                  <p className="text-[14px] leading-tight">USDC Faucet</p>
                  <p className="mono-text text-[10px] font-normal text-blue-400">faucet.circle.com · Eth Sepolia only</p>
                </div>
                <svg className="w-3.5 h-3.5 ml-auto text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </a>

              <a href="https://github.com/NexTechArchitect/Nexus-Protocol" target="_blank" rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="mobile-nav-item flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/80 border border-slate-100 text-slate-700">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
                </svg>
                <span className="text-[15px]">GitHub</span>
              </a>

              {/* Connect button centered at bottom of mobile menu */}
              <div className="pt-2 border-t border-slate-100 flex justify-center">
                <ConnectButton label="Connect Wallet" accountStatus="full" />
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};
