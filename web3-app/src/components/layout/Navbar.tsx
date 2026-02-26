'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { name: 'Trade',     path: '/trade'     },
    { name: 'Vaults',    path: '/vaults'    },
    { name: 'Portfolio', path: '/portfolio' },
    { name: 'Docs',      path: '/docs'      },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#FAFAF5]/90 backdrop-blur-2xl border-b border-[#F0B90B]/15"
      style={{boxShadow:'0 1px 0 rgba(240,185,11,0.08), 0 4px 24px rgba(0,0,0,0.04)'}}>

      <div className="max-w-[90rem] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center h-16 sm:h-[4.5rem]">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="w-9 h-9 bg-[#F0B90B] rounded-xl flex items-center justify-center"
              style={{boxShadow:'0 2px 12px rgba(240,185,11,0.4)'}}>
              <span className="text-white font-black text-base leading-none">N</span>
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">
              NEXUS<span className="text-[#F0B90B]">.</span>
            </span>
          </Link>

          {/* Desktop nav links — bigger */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const active = pathname === item.path;
              return (
                <Link key={item.name} href={item.path}
                  className={`relative px-5 py-2.5 rounded-xl text-[15px] font-bold tracking-wide transition-all duration-200 ${
                    active
                      ? 'text-[#92600A] bg-[#F0B90B]/12 border border-[#F0B90B]/25'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-[#F0B90B]/06 border border-transparent'
                  }`}>
                  {item.name}
                  {active && (
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#F0B90B]" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* USDC Faucet button */}
            <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all group">
              <span>🚰</span>
              <div>
                <p className="text-[11px] font-black text-blue-700 leading-none mb-0.5">USDC Faucet</p>
                <p className="text-[9px] text-blue-400 font-medium leading-none">Eth Sepolia only</p>
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
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wide">SEPOLIA</span>
            </div>

            {/* Connect */}
            <div className="hidden md:block">
              <ConnectButton label="Connect" accountStatus="avatar" chainStatus="none" />
            </div>

            {/* Mobile hamburger */}
            <button onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm text-slate-600 active:scale-95 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-[#FAFAF5]/97 border-t border-[#F0B90B]/10 backdrop-blur-3xl shadow-lg">
          <div className="max-w-[90rem] mx-auto px-5 pt-3 pb-5 flex flex-col gap-2">
            {navLinks.map((item) => {
              const active = pathname === item.path;
              return (
                <Link key={item.name} href={item.path} onClick={() => setIsOpen(false)}
                  className={`flex items-center justify-between px-5 py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98] ${
                    active
                      ? 'bg-[#F0B90B]/10 text-[#92600A] border border-[#F0B90B]/25'
                      : 'bg-white/70 text-slate-700 border border-transparent hover:border-slate-100'
                  }`}>
                  <span>{item.name}</span>
                  {active && <span className="w-2 h-2 rounded-full bg-[#F0B90B]" />}
                </Link>
              );
            })}

            <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-blue-50 border border-blue-100 text-blue-700 active:scale-[0.98] transition-all">
              <span className="text-lg">🚰</span>
              <div>
                <p className="text-sm font-black leading-tight">USDC Faucet</p>
                <p className="text-[11px] font-medium text-blue-400">faucet.circle.com · Eth Sepolia only</p>
              </div>
            </a>

            <a href="https://github.com/NexTechArchitect/Nexus-Protocol" target="_blank" rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white/70 border border-transparent text-slate-600 active:scale-[0.98] transition-all">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"/>
              </svg>
              <span className="text-sm font-bold">GitHub</span>
            </a>

            <div className="pt-2 border-t border-slate-100 flex justify-center">
              <ConnectButton label="Connect Wallet" accountStatus="full" />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
