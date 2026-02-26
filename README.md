"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, formatUnits, maxUint256 } from "viem";
import type { Address } from "viem";
import { CONTRACTS } from "@/constants/contracts";

// ─── Types ───────────────────────────────────────────────────────────────────
type MarginMode = 0 | 1;
type OrderType = "market" | "limit";
type Side = "long" | "short";
type TxFlow = "idle" | "approving" | "depositing" | "pending" | "ok" | "err";

interface Asset {
  symbol: string;
  name: string;
  address: Address;
  tvSymbol: string;
  wsSymbol: string;
  color: string;
  icon: string;
}

interface ContractPosition {
  collateral: bigint;
  leverage: bigint;
  entryPrice: bigint;
  isLong: boolean;
  isOpen: boolean;
  isCrossChain: boolean;
  mode: number;
}

interface RecentTrade {
  id: number;
  price: number;
  qty: number;
  time: string;
  buy: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const ASSETS: Asset[] = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    address: "0x29f2D40B0605204364af54EC677bD022dA425d03" as Address,
    tvSymbol: "BTCUSDT",
    wsSymbol: "btcusdt",
    color: "#F7931A",
    icon: "₿",
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14" as Address,
    tvSymbol: "ETHUSDT",
    wsSymbol: "ethusdt",
    color: "#627EEA",
    icon: "Ξ",
  },
];

const ERC20_ABI = [
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const VAULT_DEPOSIT_ABI = [
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const LEV_PRESETS = [2, 5, 10, 20, 50];
const SIZE_PRESETS = [25, 50, 75, 100];
const TV_INTERVALS = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "1h", value: "60" },
  { label: "4h", value: "240" },
  { label: "1D", value: "D" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtPrice(n: number): string {
  if (!n) return "—";
  if (n >= 1000)
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return n.toFixed(4);
}
function fmtUSD(n: number): string {
  return (
    "$" +
    Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
function pnlColor(v: number) {
  return v > 0 ? "#0ECB81" : v < 0 ? "#F6465D" : "#848E9C";
}

const LEVERAGE_PRECISION = BigInt("1000000000000000000"); // 1e18

function decodeLeverage(raw: bigint): number {
  if (raw >= LEVERAGE_PRECISION) return Number(raw / LEVERAGE_PRECISION);
  return Number(raw);
}

function isLeverageScaled(rawMaxLev: bigint): boolean {
  return rawMaxLev >= LEVERAGE_PRECISION;
}

function encodeLeverage(lev: number, rawMaxLev: bigint): bigint {
  if (isLeverageScaled(rawMaxLev)) {
    return BigInt(lev) * LEVERAGE_PRECISION;
  } else {
    return BigInt(lev);
  }
}

// ─── FIX #2 VAULT BALANCE LOGIC ──────────────────────────────────────────────
//
// PerpsVault.deposit(amount):
//   scaledAmount = amount * DECIMALS_SCALAR (1e12 for USDC 6-dec → stored as 18-dec)
//   traderCollateral[trader] += scaledAmount
//
// getTraderCollateral() returns 18-decimal value.
// Example: deposit $25 USDC (25_000_000 raw 6-dec)
//   stored = 25_000_000 * 1e12 = 25e18
//   formatUnits(25e18, 18) = 25.0 ✓
//
// lockCollateral(_collateralDelta):
//   lockedCollateral[trader] += _collateralDelta
//   _collateralDelta comes from frontend as parseUnits(x, 6) — 6-decimal USDC
//
// getLockedCollateral() returns 6-decimal value.
// Example: lock $25 → stored = 25_000_000 (6-dec)
//   formatUnits(25_000_000, 6) = 25.0 ✓
//
// IMPORTANT: settleTrade() is called on closePosition.
//   It does: traderCollateral[trader] = traderCollateral[trader] - collateral18 + payout18
//   After close with +$1 PnL on $25 margin:
//     traderCollateral = 25e18 - 25e18 + 26e18 = 26e18
//     formatUnits(26e18, 18) = 26.0 ✓
//   lockedCollateral[trader] -= _collateral (6-dec) → becomes 0 after unlock
//
// So vaultAvail = vaultBal (18-dec decoded) - totalLockedCollat (6-dec decoded)
// Both decode to USD amounts, subtraction is correct.
//
// THE ACTUAL BUG: refetchLocked was missing from afterTrade() so locked collateral
// stayed stale showing $25 locked even after position closed, making vaultAvail = 0.

function decodeVaultBal(raw: bigint): number {
  if (!raw || raw === BigInt(0)) return 0;
  // getTraderCollateral() returns 18-dec scaled value
  const v = parseFloat(formatUnits(raw, 18));
  if (v >= 0 && v <= 100_000_000) return v;
  return 0;
}

function decodeLockedCollateral(raw: bigint): number {
  if (!raw || raw === BigInt(0)) return 0;
  // getLockedCollateral() returns 6-dec USDC value (same as what frontend sends)
  const v = parseFloat(formatUnits(raw, 6));
  if (v >= 0 && v <= 100_000_000) return v;
  return 0;
}

function decodeCollateral(raw: bigint): number {
  if (raw === BigInt(0)) return 0;
  // After fix: collateral sent as 18-dec (parseUnits(x, 18))
  // Old positions were 6-dec. Threshold: >= 1e15 means 18-dec.
  if (raw >= BigInt("1000000000000000")) {
    return parseFloat(formatUnits(raw, 18));
  }
  return parseFloat(formatUnits(raw, 6));
}

// ─── Binance WebSocket Hook ───────────────────────────────────────────────────
interface BinanceData {
  price: number;
  ch24: number;
  vol24: number;
  high24: number;
  low24: number;
  trades: RecentTrade[];
  loading: boolean;
}

function useBinanceLive(wsSymbol: string): BinanceData {
  const [price, setPrice] = useState(0);
  const [ch24, setCh24] = useState(0);
  const [vol24, setVol24] = useState(0);
  const [high24, setHigh24] = useState(0);
  const [low24, setLow24] = useState(0);
  const [trades, setTrades] = useState<RecentTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const tid = useRef(0);

  useEffect(() => {
    if (!wsSymbol) return;
    setPrice(0);
    setLoading(true);
    setTrades([]);
    const sym = wsSymbol.toLowerCase();
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${sym}@miniTicker/${sym}@aggTrade`
    );
    ws.onmessage = (ev) => {
      try {
        const parsed = JSON.parse(ev.data as string) as {
          data: Record<string, string>;
        };
        const d = parsed.data;
        if (!d) return;
        if (d.e === "24hrMiniTicker") {
          const close = parseFloat(d.c);
          const open = parseFloat(d.o);
          setPrice(close);
          setCh24(open > 0 ? ((close - open) / open) * 100 : 0);
          setVol24(parseFloat(d.q));
          setHigh24(parseFloat(d.h));
          setLow24(parseFloat(d.l));
          setLoading(false);
        }
        if (d.e === "aggTrade") {
          setTrades((prev) =>
            [
              {
                id: tid.current++,
                price: parseFloat(d.p),
                qty: parseFloat(d.q),
                time: new Date(parseInt(d.T)).toLocaleTimeString("en-US", {
                  hour12: false,
                }),
                buy: d.m === "false",
              },
              ...prev,
            ].slice(0, 50)
          );
        }
      } catch {
        /* ignore */
      }
    };
    ws.onerror = () => setLoading(false);
    return () => ws.close();
  }, [wsSymbol]);

  return { price, ch24, vol24, high24, low24, trades, loading };
}

// ─── TradingView Chart ────────────────────────────────────────────────────────
function TradingViewChart({
  symbol,
  interval,
  chartKey,
}: {
  symbol: string;
  interval: string;
  chartKey: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.cssText = "height:100%;width:100%";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${symbol}`,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "light",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(255,255,255,1)",
      gridColor: "rgba(234,236,239,0.6)",
      hide_top_toolbar: true,
      hide_legend: false,
      hide_side_toolbar: true,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
    });

    const observer = new MutationObserver(() => {
      const iframe = container.querySelector("iframe");
      if (iframe) {
        setTimeout(() => setReady(true), 500);
        observer.disconnect();
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    const fallback = setTimeout(() => { setReady(true); observer.disconnect(); }, 5000);

    container.appendChild(script);

    return () => {
      clearTimeout(fallback);
      observer.disconnect();
      if (container) container.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartKey]);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative", background: "#fff" }}>
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#fff",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "16px 12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, flex: 1 }}>
            {[60,80,50,90,70,85,45,75,95,65,80,55,70,88,62,78,50,85,72,90].map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  borderRadius: "2px 2px 0 0",
                  background: i % 3 === 0 ? "#F6465D18" : "#0ECB8118",
                  animation: "nxPulse 1.4s ease-in-out infinite",
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", paddingBottom: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #EAECEF", borderTopColor: "#F0B90B", animation: "nxSpin 0.8s linear infinite" }} />
            <span style={{ color: "#848E9C", fontSize: 11, fontWeight: 600 }}>Loading {symbol.replace("USDT", "")} chart…</span>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="tradingview-widget-container"
        style={{ height: "100%", width: "100%", opacity: ready ? 1 : 0, transition: "opacity 0.3s" }}
      />
    </div>
  );
}

// ─── Small UI Components ──────────────────────────────────────────────────────
function PStat({ label, value, vc }: { label: string; value: string; vc?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontSize: 10, color: "#848E9C", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: vc ?? "#1E2026" }}>{value}</span>
    </div>
  );
}

function Tag({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: bg, color, letterSpacing: "0.3px" }}>
      {children}
    </span>
  );
}

function TickStat({ label, value, vc }: { label: string; value: string; vc?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "0 12px", borderLeft: "1px solid #EAECEF" }}>
      <span style={{ fontSize: 10, color: "#B7BDC6", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: vc ?? "#1E2026", marginTop: 1 }}>{value}</span>
    </div>
  );
}

function SRow({ label, value, vc }: { label: string; value: string; vc?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 11, color: "#848E9C" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: vc ?? "#1E2026" }}>{value}</span>
    </div>
  );
}

function StepBadge({ step, label, active, done }: { step: number; label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: 10, fontWeight: 800,
        background: done ? "#0ECB81" : active ? "#F0B90B" : "#EAECEF",
        color: done || active ? "#fff" : "#848E9C", flexShrink: 0, border: "none",
      }}>
        {done ? "✓" : step}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: done ? "#0ECB81" : active ? "#F0B90B" : "#848E9C" }}>
        {label}
      </span>
    </div>
  );
}

// ─── Position Card ────────────────────────────────────────────────────────────
function PositionCard({
  asset, userAddress, onMarketClose, onLimitClose, isPending, livePrice,
}: {
  asset: Asset;
  userAddress: Address;
  onMarketClose: (asset: Asset) => void;
  onLimitClose: (asset: Asset, px: string) => void;
  isPending: boolean;
  livePrice: number;
}) {
  const [closeMode, setCloseMode] = useState<"market" | "limit">("market");
  const [closeLimitPx, setCloseLimitPx] = useState("");

  const { data: rawPos } = useReadContract({
    address: CONTRACTS.POSITION_MANAGER.address,
    abi: CONTRACTS.POSITION_MANAGER.abi,
    functionName: "getPosition",
    args: [userAddress, asset.address],
    query: { refetchInterval: 3000 },
  }) as { data: ContractPosition | undefined };

  if (!rawPos?.isOpen || livePrice === 0) return null;

  const collat = decodeCollateral(rawPos.collateral);
  const lev = decodeLeverage(rawPos.leverage);
  const entryPrice = parseFloat(formatUnits(rawPos.entryPrice, 18));
  const size = collat * lev;

  const delta = rawPos.isLong
    ? livePrice - entryPrice
    : entryPrice - livePrice;
  const pnl = entryPrice > 0 ? (delta / entryPrice) * size : 0;
  const pnlPct = collat > 0 ? (pnl / collat) * 100 : 0;

  const liqPrice =
    lev > 1 && entryPrice > 0
      ? rawPos.isLong
        ? entryPrice * (1 - 1 / lev + 0.005)
        : entryPrice * (1 + 1 / lev - 0.005)
      : 0;

  const canLimit = closeMode === "limit" && parseFloat(closeLimitPx) > 0;
  const isIsolated = rawPos.mode === 0;

  return (
    <div style={{
      background: "#fff", border: "1px solid #EAECEF", borderRadius: 12,
      overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      minWidth: 300, flex: "1 1 300px", maxWidth: 420,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "flex-start",
        padding: "14px 16px 12px", borderBottom: "1px solid #F5F5F5",
        background: rawPos.isLong ? "#F0FFF8" : "#FFF5F5",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%", background: asset.color + "20",
            border: `1.5px solid ${asset.color}40`, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: asset.color }}>{asset.icon}</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1E2026" }}>{asset.symbol}/USDT PERP</div>
            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" as const }}>
              <Tag bg={rawPos.isLong ? "#0ECB8120" : "#F6465D20"} color={rawPos.isLong ? "#0ECB81" : "#F6465D"}>
                {rawPos.isLong ? "▲ LONG" : "▼ SHORT"}
              </Tag>
              <Tag bg="#F0B90B18" color="#C87D00">{lev}×</Tag>
              <Tag bg={isIsolated ? "#EFF6FF" : "#FFFBEB"} color={isIsolated ? "#2563EB" : "#D97706"}>
                {isIsolated ? "Isolated" : "Cross"}
              </Tag>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: pnlColor(pnl) }}>
            {pnl >= 0 ? "+" : ""}{fmtUSD(pnl)}
          </div>
          <div style={{ fontSize: 11, color: pnlColor(pnlPct), fontWeight: 600 }}>
            {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}% ROE
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: "12px 16px" }}>
        <PStat label="Size" value={fmtUSD(size)} />
        <PStat label="Margin" value={fmtUSD(collat)} />
        <PStat label="Entry Price" value={fmtPrice(entryPrice)} />
        <PStat label="Mark Price" value={fmtPrice(livePrice)} />
        <PStat label="Liq. Price" value={liqPrice > 0 ? fmtPrice(liqPrice) : "—"} vc="#F6465D" />
        <PStat label="Unreal. PnL" value={(pnl >= 0 ? "+" : "") + fmtUSD(pnl)} vc={pnlColor(pnl)} />
      </div>

      <div style={{ padding: "10px 16px 16px", borderTop: "1px solid #F5F5F5" }}>
        <div style={{ display: "flex", background: "#F5F5F5", borderRadius: 7, padding: 3, gap: 3, marginBottom: 10 }}>
          {(["market", "limit"] as const).map((m) => (
            <button key={m} onClick={() => setCloseMode(m)} style={{
              flex: 1, padding: "5px 0", border: "none", borderRadius: 5, fontFamily: "inherit",
              background: closeMode === m ? "#fff" : "transparent",
              color: closeMode === m ? "#1E2026" : "#848E9C",
              fontWeight: closeMode === m ? 700 : 500, fontSize: 11, cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: closeMode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>
              {m === "market" ? "Market Close" : "Limit Close"}
            </button>
          ))}
        </div>

        {closeMode === "limit" && (
          <div style={{
            marginBottom: 10, display: "flex", alignItems: "center", background: "#FAFAFA",
            border: "1.5px solid #EAECEF", borderRadius: 7, overflow: "hidden",
          }}>
            <input
              type="number"
              placeholder={`Price (mark: ${fmtPrice(livePrice)})`}
              value={closeLimitPx}
              onChange={(e) => setCloseLimitPx(e.target.value)}
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                padding: "8px 12px", color: "#1E2026", fontFamily: "inherit",
                fontSize: 12, fontWeight: 600,
              }}
            />
            <span style={{
              padding: "8px 10px", color: "#848E9C", fontSize: 10, fontWeight: 600,
              background: "#F5F5F5", borderLeft: "1px solid #EAECEF",
            }}>USD</span>
          </div>
        )}

        <button
          disabled={isPending || (closeMode === "limit" && !canLimit)}
          onClick={() => closeMode === "market" ? onMarketClose(asset) : canLimit && onLimitClose(asset, closeLimitPx)}
          style={{
            width: "100%", padding: "10px", borderRadius: 8, fontFamily: "inherit",
            fontWeight: 700, fontSize: 12,
            cursor: isPending || (closeMode === "limit" && !canLimit) ? "not-allowed" : "pointer",
            transition: "all 0.15s", border: "1.5px solid #F6465D40",
            background: isPending || (closeMode === "limit" && !canLimit) ? "transparent" : "rgba(246,70,93,0.08)",
            color: "#F6465D",
            opacity: isPending || (closeMode === "limit" && !canLimit) ? 0.4 : 1,
          }}
        >
          {isPending
            ? "Processing…"
            : closeMode === "market"
            ? `Market Close ${asset.symbol}`
            : `Limit Close ${asset.symbol}${closeLimitPx ? ` @ $${fmtPrice(parseFloat(closeLimitPx))}` : ""}`}
        </button>
      </div>
    </div>
  );
}

// ─── All Positions Panel ──────────────────────────────────────────────────────
function AllPositionsPanel({
  address, onMarketClose, onLimitClose, isPending,
}: {
  address: Address;
  onMarketClose: (asset: Asset) => void;
  onLimitClose: (asset: Asset, px: string) => void;
  isPending: boolean;
}) {
  const btcData = useBinanceLive("btcusdt");
  const ethData = useBinanceLive("ethusdt");

  const livePrices: Record<string, number> = {
    btcusdt: btcData.price,
    ethusdt: ethData.price,
  };

  return (
    <>
      {ASSETS.map((a) => (
        <PositionCard
          key={a.address}
          asset={a}
          userAddress={address}
          onMarketClose={onMarketClose}
          onLimitClose={onLimitClose}
          isPending={isPending}
          livePrice={livePrices[a.wsSymbol] ?? 0}
        />
      ))}
    </>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function TradePage() {
  const { address, isConnected } = useAccount();

  const [asset, setAsset] = useState<Asset>(ASSETS[0]);
  const [marginMode, setMarginMode] = useState<MarginMode>(0);
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [side, setSide] = useState<Side>("long");
  const [leverage, setLeverage] = useState(10);
  const [collInput, setCollInput] = useState("");
  const [limitPx, setLimitPx] = useState("");
  const [chartInterval, setChartInterval] = useState("5");
  const [assetDrop, setAssetDrop] = useState(false);
  const [marginModal, setMarginModal] = useState(false);
  const [showTrades, setShowTrades] = useState(false);
  const [txFlow, setTxFlow] = useState<TxFlow>("idle");
  const [txMsg, setTxMsg] = useState("");
  const [approveHash, setApproveHash] = useState<`0x${string}` | undefined>(undefined);
  const [depositHash, setDepositHash] = useState<`0x${string}` | undefined>(undefined);
  const [closeHash, setCloseHash] = useState<`0x${string}` | undefined>(undefined);

  const chartKey = `${asset.tvSymbol}__${chartInterval}`;

  const approveHandledRef = useRef(false);
  const depositHandledRef = useRef(false);
  const closeHandledRef = useRef(false);
  const pendingCollRef = useRef<bigint>(BigInt(0));
  const collRef = useRef(0);
  const priceRef = useRef(0);
  const levRef = useRef(10);
  const sideRef = useRef<Side>("long");
  const modeRef = useRef<MarginMode>(0);
  const otypeRef = useRef<OrderType>("market");
  const lpxRef = useRef("");
  const addrRef = useRef<Address>(ASSETS[0].address);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTxFlow("idle");
    setTxMsg("");
    setApproveHash(undefined);
    setDepositHash(undefined);
    approveHandledRef.current = false;
    depositHandledRef.current = false;
    pendingCollRef.current = BigInt(0);
    setCollInput("");
    setLimitPx("");
  }, [asset.address]);

  const { price, ch24, vol24, high24, low24, trades, loading } = useBinanceLive(asset.wsSymbol);

  useEffect(() => { collRef.current = parseFloat(collInput) || 0; }, [collInput]);
  useEffect(() => { priceRef.current = price; }, [price]);
  useEffect(() => { levRef.current = leverage; }, [leverage]);
  useEffect(() => { sideRef.current = side; }, [side]);
  useEffect(() => { modeRef.current = marginMode; }, [marginMode]);
  useEffect(() => { otypeRef.current = orderType; }, [orderType]);
  useEffect(() => { lpxRef.current = limitPx; }, [limitPx]);
  useEffect(() => { addrRef.current = asset.address; }, [asset.address]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setAssetDrop(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── Contract Reads ────────────────────────────────────────────────────────
  const { data: rawPos, refetch: refetchPos } = useReadContract({
    address: CONTRACTS.POSITION_MANAGER.address,
    abi: CONTRACTS.POSITION_MANAGER.abi,
    functionName: "getPosition",
    args: address ? [address, asset.address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  }) as { data: ContractPosition | undefined; refetch: () => void };

  const { data: rawBtcPos, refetch: refetchBtcPos } = useReadContract({
    address: CONTRACTS.POSITION_MANAGER.address,
    abi: CONTRACTS.POSITION_MANAGER.abi,
    functionName: "getPosition",
    args: address ? [address, ASSETS[0].address] : undefined,
    query: { enabled: !!address, refetchInterval: 2000 },
  }) as { data: ContractPosition | undefined; refetch: () => void };

  const { data: rawEthPos, refetch: refetchEthPos } = useReadContract({
    address: CONTRACTS.POSITION_MANAGER.address,
    abi: CONTRACTS.POSITION_MANAGER.abi,
    functionName: "getPosition",
    args: address ? [address, ASSETS[1].address] : undefined,
    query: { enabled: !!address, refetchInterval: 4000 },
  }) as { data: ContractPosition | undefined; refetch: () => void };

  // ── FIX #2A: Vault balance — poll at 2s for fast update after close ───────
  const { data: rawVaultBal, refetch: refetchVault } = useReadContract({
    address: CONTRACTS.VAULT.address,
    abi: CONTRACTS.VAULT.abi,
    functionName: "getTraderCollateral",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 2000 },
  }) as { data: bigint | undefined; refetch: () => void };

  // ── FIX #2B: Locked collateral — poll at 2s, refetch aggressively on close
  const { data: rawLockedFromVault, refetch: refetchLocked } = useReadContract({
    address: CONTRACTS.VAULT.address,
    abi: CONTRACTS.VAULT.abi,
    functionName: "getLockedCollateral",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 2000 },
  }) as { data: bigint | undefined; refetch: () => void };

  const { data: rawMaxLev } = useReadContract({
    address: CONTRACTS.POSITION_MANAGER.address,
    abi: CONTRACTS.POSITION_MANAGER.abi,
    functionName: "maxLeverage",
    query: { staleTime: 60_000 },
  }) as { data: bigint | undefined };

  const { data: rawUsdcBal, refetch: refetchWalletBal } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8000 },
  }) as { data: bigint | undefined; refetch: () => void };

  const { data: rawAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC.address,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.VAULT.address] : undefined,
    query: { enabled: !!address, refetchInterval: 5000 },
  }) as { data: bigint | undefined; refetch: () => void };

  // Oracle health check
  const { data: oraclePrice, isError: oracleError } = useReadContract({
    address: CONTRACTS.POSITION_MANAGER.address,
    abi: CONTRACTS.POSITION_MANAGER.abi,
    functionName: "getCurrentPrice",
    args: [asset.address],
    query: { enabled: !!asset.address, refetchInterval: 30000, retry: 1 },
  }) as { data: bigint | undefined; isError: boolean };

  // ── FIX #1: Also check if asset is whitelisted in PositionManager ─────────
  const { data: isBtcWhitelisted } = useReadContract({
    address: CONTRACTS.POSITION_MANAGER.address,
    abi: CONTRACTS.POSITION_MANAGER.abi,
    functionName: "whitelistedOracles",
    args: [ASSETS[0].address],
    query: { refetchInterval: 60000 },
  }) as { data: boolean | undefined };

  const { data: isEthWhitelisted } = useReadContract({
    address: CONTRACTS.POSITION_MANAGER.address,
    abi: CONTRACTS.POSITION_MANAGER.abi,
    functionName: "whitelistedOracles",
    args: [ASSETS[1].address],
    query: { refetchInterval: 60000 },
  }) as { data: boolean | undefined };

  const isCurrentAssetWhitelisted = asset.symbol === "BTC" ? (isBtcWhitelisted ?? true) : (isEthWhitelisted ?? true);

  const oraclePriceNum = oraclePrice ? parseFloat(formatUnits(oraclePrice, 18)) : 0;
  const oracleHealthy = !oracleError && oraclePriceNum > 0 && isCurrentAssetWhitelisted;

  const { writeContractAsync, isPending } = useWriteContract();

  const rawMaxLevRef = useRef<bigint>(BigInt(0));
  useEffect(() => { if (rawMaxLev) rawMaxLevRef.current = rawMaxLev; }, [rawMaxLev]);

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
    query: { enabled: !!approveHash },
  });
  const { isSuccess: depositConfirmed } = useWaitForTransactionReceipt({
    hash: depositHash,
    query: { enabled: !!depositHash },
  });
  const { isSuccess: closeConfirmed } = useWaitForTransactionReceipt({
    hash: closeHash,
    query: { enabled: !!closeHash },
  });

  // ── FIX #2C: After close confirmed — aggressive refetch of BOTH vault reads
  // settleTrade() updates traderCollateral. unlockCollateral() updates lockedCollateral.
  // Both happen in closePosition() → we must refetch both.
  useEffect(() => {
    if (!closeConfirmed || closeHandledRef.current) return;
    closeHandledRef.current = true;

    const refetchAll = () => {
      void refetchVault();
      void refetchLocked();   // ← THIS WAS MISSING in original afterTrade()
      void refetchPos();
      void refetchBtcPos();
      void refetchEthPos();
      void refetchWalletBal();
    };

    // Immediate
    refetchAll();

    // Staggered polls — chain needs time to mine + indexer needs time to reflect
    [500, 1000, 2000, 3500, 5000, 8000, 12000, 18000, 25000].forEach((ms) => {
      setTimeout(refetchAll, ms);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeConfirmed]);

  // ── Derived Values ────────────────────────────────────────────────────────
  const maxLev = rawMaxLev ? decodeLeverage(rawMaxLev) : 50;
  const vaultBal = rawVaultBal ? decodeVaultBal(rawVaultBal) : 0;
  const walletUsdc = rawUsdcBal ? parseFloat(formatUnits(rawUsdcBal, 6)) : 0;
  const collateral = parseFloat(collInput) || 0;
  const posSize = collateral * leverage;
  const fees = posSize * 0.00025;
  const entryPx = orderType === "limit" ? parseFloat(limitPx) || price : price;
  const liqPx =
    entryPx > 0 && leverage > 1
      ? side === "long"
        ? entryPx * (1 - 1 / leverage + 0.005)
        : entryPx * (1 + 1 / leverage - 0.005)
      : 0;

  const sliderPct = maxLev > 1 ? ((leverage - 1) / (maxLev - 1)) * 100 : 0;
  const sliderBg = `linear-gradient(to right,#F0B90B 0%,#F0B90B ${sliderPct}%,#EAECEF ${sliderPct}%,#EAECEF 100%)`;

  // ── FIX #2D: Unified locked collateral calculation ────────────────────────
  // getLockedCollateral() returns 6-dec value. decodeLockedCollateral formats with 6 dec → USD.
  // getTraderCollateral() returns 18-dec value. decodeVaultBal formats with 18 dec → USD.
  // Both are now in USD, subtraction is valid.
  // If getLockedCollateral not available in vault ABI, fall back to summing positions.
  const totalLockedCollat = rawLockedFromVault !== undefined
    ? decodeLockedCollateral(rawLockedFromVault)
    : (() => {
        let total = 0;
        if (rawBtcPos?.isOpen) total += decodeCollateral(rawBtcPos.collateral);
        if (rawEthPos?.isOpen) total += decodeCollateral(rawEthPos.collateral);
        return total;
      })();

  const lockedCollat = rawPos?.isOpen ? decodeCollateral(rawPos.collateral) : 0;

  // vaultAvail = total deposited - locked in trades
  const vaultAvail = Math.max(0, vaultBal - totalLockedCollat);

  const EPSILON = 0.0001;
  const vaultSufficient = collateral <= 0 || vaultAvail >= collateral - EPSILON;
  const needsDeposit = !vaultSufficient && collateral > 0;
  const depositAmount = needsDeposit ? Math.max(0, collateral - vaultAvail) : 0;
  const depositAmountBN =
    needsDeposit && depositAmount > 0.0001
      ? parseUnits(depositAmount.toFixed(6), 6)
      : BigInt(0);
  const needsApproval =
    needsDeposit &&
    depositAmountBN > BigInt(0) &&
    (rawAllowance ?? BigInt(0)) < depositAmountBN;

  const btcPosOpen = rawBtcPos?.isOpen ?? false;
  const ethPosOpen = rawEthPos?.isOpen ?? false;
  const currentAssetPosOpen = rawPos?.isOpen ?? false;
  const anyPosOpen = btcPosOpen || ethPosOpen;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toast = useCallback((flow: TxFlow, msg: string) => {
    setTxFlow(flow);
    setTxMsg(msg);
    if (flow === "ok") setTimeout(() => setTxFlow("idle"), 6000);
  }, []);

  // ── FIX #2E: afterTrade now includes refetchLocked ────────────────────────
  const afterTrade = useCallback(async () => {
    await Promise.all([
      refetchPos(),
      refetchVault(),
      refetchLocked(),    // ← ADDED: must refetch locked collateral too
      refetchWalletBal(),
      refetchAllowance(),
      refetchBtcPos(),
      refetchEthPos(),
    ]);
    // Staggered follow-up refetches
    const later = (ms: number) => setTimeout(() => {
      void refetchPos();
      void refetchVault();
      void refetchLocked();
      void refetchWalletBal();
      void refetchBtcPos();
      void refetchEthPos();
    }, ms);
    later(2000);
    later(5000);
    later(10000);
  }, [refetchPos, refetchVault, refetchLocked, refetchWalletBal, refetchAllowance, refetchBtcPos, refetchEthPos]);

  // ── Step 3: Open Position ─────────────────────────────────────────────────
  const doOpenPosition = useCallback(async () => {
    if (!address) return;
    const coll = collRef.current;
    const px = priceRef.current;
    const lev = levRef.current;
    const dir = sideRef.current;
    const mode = modeRef.current;
    const otype = otypeRef.current;
    const lpx = lpxRef.current;
    const assetAddr = addrRef.current;
    const assetObj = ASSETS.find((a) => a.address === assetAddr) ?? ASSETS[0];

    if (coll <= 0 || px === 0) { toast("err", "Invalid amount or price"); return; }
    if (otype === "limit" && !(parseFloat(lpx) > 0)) { toast("err", "Enter a valid limit price"); return; }

    const stepLabel = pendingCollRef.current > BigInt(0) ? "Step 3/3 — " : "";
    toast("pending", `${stepLabel}${otype === "market" ? "Opening position…" : "Placing limit order…"}`);

    try {
      // FIX: Send 18-dec collateral so vault.lockCollateral and vault.settleTrade work correctly
      // vault.deposit() stores traderCollateral as 18-dec (amount * 1e12)
      // lockCollateral(user, amount) must match that precision
      // parseUnits(x, 18) = parseUnits(x, 6) * 1e12
      const collBN = parseUnits(coll.toFixed(18), 18);
      const levBN = encodeLeverage(lev, rawMaxLevRef.current);
      const isLong = dir === "long";

      if (otype === "market") {
        await writeContractAsync({
          address: CONTRACTS.POSITION_MANAGER.address,
          abi: CONTRACTS.POSITION_MANAGER.abi,
          functionName: "openPosition",
          args: [assetAddr, collBN, levBN, isLong, mode],
        });
        toast("ok", `${assetObj.symbol} ${dir.toUpperCase()} ${lev}× opened!`);
      } else {
        const lpxFloat = parseFloat(lpx);
        const lpxWhole = Math.floor(lpxFloat);
        const lpxFrac = Math.round((lpxFloat - lpxWhole) * 1e8);
        const tgtPx =
          BigInt(lpxWhole) * BigInt("1000000000000000000") +
          BigInt(lpxFrac) * BigInt("10000000000");
        await writeContractAsync({
          address: CONTRACTS.POSITION_MANAGER.address,
          abi: CONTRACTS.POSITION_MANAGER.abi,
          functionName: "placeLimitOrder",
          args: [assetAddr, collBN, levBN, tgtPx, isLong, mode],
        });
        toast("ok", `Limit order placed at $${fmtPrice(parseFloat(lpx))}`);
      }
      setCollInput("");
      setLimitPx("");
      pendingCollRef.current = BigInt(0);
      await afterTrade();
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      const raw = err?.shortMessage ?? err?.message ?? "Transaction failed";

      // ── FIX #1: Better BTC-specific error messages ────────────────────────
      if (raw.includes("InvalidAsset")) {
        // This is the BTC bug — PositionManager.addAsset() was never called
        toast(
          "err",
          `${assetObj.symbol} not whitelisted in PositionManager. Run:\ncast send ${CONTRACTS.POSITION_MANAGER.address} "addAsset(address)" ${assetAddr} --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key $PRIVATE_KEY`
        );
      } else if (raw.includes("PositionAlreadyExists")) {
        toast("err", `${assetObj.symbol} already has an open position. Close it from the panel below.`);
      } else if (raw.includes("StalePrice")) {
        toast("err", `${assetObj.symbol} oracle price is stale. Run setAsset() on PriceOracle with heartbeat=86400.`);
      } else if (raw.includes("InvalidPrice")) {
        toast("err", `${assetObj.symbol} oracle returned invalid price — Chainlink feed may be down on Sepolia.`);
      } else if (raw.includes("ZeroAmount")) {
        toast("err", "Amount cannot be zero");
      } else if (raw.includes("InvalidLeverage")) {
        toast("err", `Invalid leverage — max allowed is ${maxLev}×`);
      } else if (raw.includes("InsufficientCollateral")) {
        toast("err", "Not enough free collateral in vault. Close other positions or deposit more.");
      } else if (raw.includes("EnforcedPause")) {
        toast("err", "Trading is currently paused by admin");
      } else if (raw.includes("User rejected") || raw.includes("user rejected")) {
        toast("err", "Transaction rejected in wallet");
      } else if (raw.includes("execution reverted") || raw.includes("Third-party")) {
        toast("err", `Reverted. Check: (1) ${assetObj.symbol} oracle stale, (2) addAsset() called on PositionManager, (3) vault balance sufficient.`);
      } else {
        toast("err", raw.slice(0, 180));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, writeContractAsync, toast, afterTrade, maxLev]);

  // ── Step 2: Deposit ───────────────────────────────────────────────────────
  const doDeposit = useCallback(async (collBN: bigint) => {
    pendingCollRef.current = collBN;
    toast("depositing", "Step 2/3 — Depositing USDC into vault…");
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.VAULT.address,
        abi: VAULT_DEPOSIT_ABI,
        functionName: "deposit",
        args: [collBN],
      });
      setDepositHash(hash);
      depositHandledRef.current = false;
    } catch (e: unknown) {
      const err = e as { shortMessage?: string };
      toast("err", err?.shortMessage ?? "Deposit failed");
    }
  }, [writeContractAsync, toast]);

  // ── Step 1: Approve ───────────────────────────────────────────────────────
  const doApprove = useCallback(async (collBN: bigint) => {
    pendingCollRef.current = collBN;
    toast("approving", "Step 1/3 — Approving USDC for vault deposit…");
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.USDC.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.VAULT.address, maxUint256],
      });
      setApproveHash(hash);
      approveHandledRef.current = false;
    } catch (e: unknown) {
      const err = e as { shortMessage?: string };
      toast("err", err?.shortMessage ?? "Approval failed");
    }
  }, [writeContractAsync, toast]);

  useEffect(() => {
    if (approveConfirmed && approveHash && !approveHandledRef.current) {
      approveHandledRef.current = true;
      void (async () => {
        await refetchAllowance();
        setTimeout(() => { void doDeposit(pendingCollRef.current); }, 800);
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveConfirmed, approveHash]);

  useEffect(() => {
    if (depositConfirmed && depositHash && !depositHandledRef.current) {
      depositHandledRef.current = true;
      setTimeout(() => { void doOpenPosition(); }, 2500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositConfirmed, depositHash]);

  // ── Handle Place Order ────────────────────────────────────────────────────
  const handlePlaceOrder = useCallback(async () => {
    if (!isConnected || !address) { toast("err", "Connect wallet first"); return; }
    if (collateral <= 0) { toast("err", "Enter collateral amount"); return; }
    if (price === 0) { toast("err", "Price feed not ready yet…"); return; }
    if (orderType === "limit" && !(parseFloat(limitPx) > 0)) { toast("err", "Enter a valid limit price"); return; }

    if (currentAssetPosOpen) {
      toast("err", `${asset.symbol} position is already open. Close it below first.`);
      return;
    }

    // ── FIX #1: Pre-flight whitelist check ───────────────────────────────────
    if (!isCurrentAssetWhitelisted) {
      toast(
        "err",
        `${asset.symbol} not whitelisted in PositionManager! Admin must call:\ncast send ${CONTRACTS.POSITION_MANAGER.address} "addAsset(address)" ${asset.address} --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key $PRIVATE_KEY`
      );
      return;
    }

    if (vaultSufficient) {
      pendingCollRef.current = BigInt(0);
      await doOpenPosition();
      return;
    }

    const shortfall = Math.max(0, collateral - vaultAvail);
    if (walletUsdc < shortfall - 0.0001) {
      toast("err", `Insufficient USDC. Need ${fmtUSD(shortfall)} more from wallet`);
      return;
    }

    const depositBN = parseUnits(shortfall.toFixed(6), 6);
    pendingCollRef.current = depositBN;
    if (needsApproval) {
      await doApprove(depositBN);
    } else {
      await doDeposit(depositBN);
    }
  }, [
    isConnected, address, collateral, price, orderType, limitPx,
    vaultSufficient, vaultAvail, walletUsdc, needsApproval,
    currentAssetPosOpen, asset, isCurrentAssetWhitelisted,
    doApprove, doDeposit, doOpenPosition, toast,
  ]);

  // ── Market Close ──────────────────────────────────────────────────────────
  const handleMarketClose = useCallback(async (closeAsset: Asset) => {
    if (!isConnected || !address) return;
    toast("pending", `Closing ${closeAsset.symbol} at market…`);
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.POSITION_MANAGER.address,
        abi: CONTRACTS.POSITION_MANAGER.abi,
        functionName: "closePosition",
        args: [closeAsset.address],
      });
      closeHandledRef.current = false;
      setCloseHash(hash as `0x${string}`);
      // FIX #2F: Show "updating..." message so user knows to wait
      toast("ok", `${closeAsset.symbol} closed ✓ — vault balance updating in ~5s…`);
      await afterTrade();
    } catch (e: unknown) {
      const err = e as { shortMessage?: string; message?: string };
      const raw = err?.shortMessage ?? err?.message ?? "Close failed";
      toast("err", raw.includes("NoPositionFound") ? "No open position found to close" : raw.slice(0, 100));
    }
  }, [isConnected, address, writeContractAsync, toast, afterTrade]);

  // ── Limit Close ───────────────────────────────────────────────────────────
  const handleLimitClose = useCallback(async (closeAsset: Asset, limitPxStr: string) => {
    if (!isConnected || !address) return;
    const lp = parseFloat(limitPxStr);
    if (!lp || lp <= 0) { toast("err", "Invalid close price"); return; }
    toast("pending", `Placing limit close for ${closeAsset.symbol} @ $${fmtPrice(lp)}…`);
    try {
      const tgtPx = parseUnits(lp.toFixed(18), 18);
      const posData = rawPos;
      if (closeAsset.address === asset.address && posData?.isOpen) {
        await writeContractAsync({
          address: CONTRACTS.POSITION_MANAGER.address,
          abi: CONTRACTS.POSITION_MANAGER.abi,
          functionName: "placeLimitOrder",
          args: [closeAsset.address, posData.collateral, posData.leverage, tgtPx, !posData.isLong, posData.mode as MarginMode],
        });
      } else {
        toast("err", `Switch to ${closeAsset.symbol} tab to place a limit close`);
        return;
      }
      toast("ok", `Limit close placed @ $${fmtPrice(lp)}`);
      await afterTrade();
    } catch (e: unknown) {
      const err = e as { shortMessage?: string };
      toast("err", err?.shortMessage ?? "Limit close failed");
    }
  }, [isConnected, address, rawPos, asset.address, writeContractAsync, toast, afterTrade]);

  // ── Fill by % ─────────────────────────────────────────────────────────────
  const fillPct = (pct: number) => {
    const bal = vaultAvail > 0 ? vaultAvail : walletUsdc;
    if (bal > 0) setCollInput(((bal * pct) / 100).toFixed(2));
  };

  // ── Derived UI ────────────────────────────────────────────────────────────
  const isSubmitting = isPending || txFlow === "approving" || txFlow === "depositing" || txFlow === "pending";

  const spinner = (
    <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
      <div style={{
        width: 15, height: 15, borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "#fff",
        animation: "nxSpin 0.7s linear infinite",
      }} />
      {txFlow === "approving" ? "Approving USDC…" : txFlow === "depositing" ? "Depositing to Vault…" : "Processing…"}
    </span>
  );

  let ctaLabel: React.ReactNode = "Connect Wallet to Trade";
  if (isConnected) {
    if (isSubmitting) ctaLabel = spinner;
    else if (!isCurrentAssetWhitelisted) ctaLabel = `${asset.symbol} Not Whitelisted — Admin Action Required`;
    else if (currentAssetPosOpen) ctaLabel = `${asset.symbol} Position Already Open — Close Below`;
    else if (needsDeposit && needsApproval) ctaLabel = `Approve → Deposit → ${side === "long" ? "Long" : "Short"} ${asset.symbol}`;
    else if (needsDeposit) ctaLabel = `Deposit $${depositAmount.toFixed(2)} → ${side === "long" ? "Long" : "Short"} ${asset.symbol}`;
    else if (orderType === "limit") ctaLabel = `Place ${side === "long" ? "Buy" : "Sell"} Limit — ${asset.symbol}`;
    else ctaLabel = `${side === "long" ? "▲ Long" : "▼ Short"} ${asset.symbol} ${leverage}×`;
  }

  const ctaDisabled = isSubmitting || !isConnected || currentAssetPosOpen || !isCurrentAssetWhitelisted;

  const ctaBg = ctaDisabled
    ? "#F5F5F5"
    : needsDeposit && needsApproval
    ? "linear-gradient(135deg,#F0B90B,#D9A10A)"
    : needsDeposit
    ? "linear-gradient(135deg,#3B82F6,#1D4ED8)"
    : side === "long"
    ? "linear-gradient(135deg,#0ECB81 0%,#00A86B 100%)"
    : "linear-gradient(135deg,#F6465D 0%,#CF304A 100%)";

  const ctaShadow = ctaDisabled
    ? "none"
    : needsDeposit
    ? "0 6px 20px rgba(59,130,246,0.25)"
    : side === "long"
    ? "0 6px 20px rgba(14,203,129,0.25)"
    : "0 6px 20px rgba(246,70,93,0.25)";

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", background: "#F0F1F2",
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
      paddingTop: 64, display: "flex", flexDirection: "column",
      fontSize: 12, color: "#1E2026",
    }}>
      {/* ── TOP BAR ── */}
      <div style={{
        display: "flex", alignItems: "center", padding: "0 16px",
        background: "#fff", borderBottom: "1px solid #EAECEF",
        height: 54, position: "sticky", top: 64, zIndex: 50, gap: 0, overflowX: "auto",
      }}>
        {/* Asset Selector */}
        <div ref={dropRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            onClick={() => setAssetDrop(!assetDrop)}
            style={{
              display: "flex", alignItems: "center", gap: 10, background: "transparent",
              border: "none", padding: "8px 16px 8px 0", cursor: "pointer", fontFamily: "inherit",
              borderRight: "1px solid #EAECEF", marginRight: 16,
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: "50%", background: asset.color + "18",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `1.5px solid ${asset.color}50`, flexShrink: 0,
            }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: asset.color }}>{asset.icon}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.2 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: "#1E2026", letterSpacing: "0.5px" }}>
                {asset.symbol}/USDT
              </span>
              <span style={{ fontSize: 9, color: "#848E9C", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase" }}>
                PERP · Click to switch
              </span>
            </div>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 2 }}>
              <path d="M2 4l4 4 4-4" stroke="#848E9C" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>

          {assetDrop && (
            <div style={{
              position: "fixed", top: 118, left: 16, background: "#fff",
              border: "1px solid #EAECEF", borderRadius: 12, zIndex: 9999,
              minWidth: 260, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", overflow: "hidden",
            }}>
              <div style={{
                padding: "10px 16px 8px", fontSize: 10, color: "#848E9C", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #F5F5F5",
              }}>Select Market</div>
              {ASSETS.map((a) => {
                const hasPos = (a.symbol === "BTC" && btcPosOpen) || (a.symbol === "ETH" && ethPosOpen);
                // FIX #1: Show whitelist warning in dropdown
                const notWhitelisted = a.symbol === "BTC" ? isBtcWhitelisted === false : isEthWhitelisted === false;
                return (
                  <button
                    key={a.address}
                    onClick={() => { setAsset(a); setAssetDrop(false); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                      width: "100%", border: "none", cursor: "pointer", fontFamily: "inherit",
                      transition: "background 0.12s",
                      background: a.address === asset.address ? a.color + "10" : "transparent",
                      borderLeft: a.address === asset.address ? `3px solid ${a.color}` : "3px solid transparent",
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: a.color + "15",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      border: `1.5px solid ${a.color}40`,
                    }}>
                      <span style={{ fontWeight: 900, fontSize: 16, color: a.color }}>{a.icon}</span>
                    </div>
                    <div style={{ textAlign: "left", flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1E2026" }}>{a.symbol}/USDT PERP</div>
                      <div style={{ fontSize: 10, color: notWhitelisted ? "#F6465D" : "#848E9C" }}>
                        {notWhitelisted ? "⚠ Not whitelisted in contract" : `${a.name} · Perpetual`}
                      </div>
                    </div>
                    {hasPos && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: "#0ECB8118", color: "#0ECB81", border: "1px solid #0ECB8130", whiteSpace: "nowrap" }}>
                        OPEN
                      </span>
                    )}
                    {a.address === asset.address && !hasPos && (
                      <span style={{ color: a.color, fontSize: 14, fontWeight: 800 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Price + 24h Change */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, borderLeft: "1px solid #EAECEF", paddingLeft: 16, flexShrink: 0 }}>
          {loading ? (
            <div style={{ width: 90, height: 24, background: "#F5F5F5", borderRadius: 6, animation: "nxPulse 1.4s ease-in-out infinite" }} />
          ) : (
            <>
              <span style={{ fontSize: 22, fontWeight: 800, color: ch24 >= 0 ? "#0ECB81" : "#F6465D", letterSpacing: "0.5px" }}>
                {fmtPrice(price)}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                background: ch24 >= 0 ? "#0ECB8118" : "#F6465D18",
                color: ch24 >= 0 ? "#0ECB81" : "#F6465D",
                border: `1px solid ${ch24 >= 0 ? "#0ECB8130" : "#F6465D30"}`,
              }}>
                {ch24 >= 0 ? "▲" : "▼"} {Math.abs(ch24).toFixed(2)}%
              </span>
            </>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <TickStat label="24H High" value={high24 > 0 ? fmtPrice(high24) : "—"} />
          <TickStat label="24H Low" value={low24 > 0 ? fmtPrice(low24) : "—"} />
          <TickStat label="24H Vol" value={vol24 > 0 ? `$${(vol24 / 1e9).toFixed(2)}B` : "—"} />
          <TickStat label="Funding" value="-0.0198%" vc="#F6465D" />
        </div>

        {!loading && (
          <div style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 20, background: "#0ECB8110", border: "1px solid #0ECB8130",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#0ECB81", animation: "nxPulse 1.5s ease-in-out infinite" }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: "#0ECB81", letterSpacing: "1.5px" }}>LIVE</span>
          </div>
        )}
      </div>

      {/* ── BODY ── */}
      <div className="nx-main" style={{ display: "flex", flex: 1, background: "#EAECEF", gap: 1, minHeight: 0 }}>
        {/* ── LEFT: Chart + Positions ── */}
        <div className="nx-left" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#fff", borderRight: "1px solid #EAECEF" }}>
          {/* Chart Toolbar */}
          <div style={{ display: "flex", alignItems: "center", padding: "6px 14px", borderBottom: "1px solid #EAECEF", background: "#fff", flexShrink: 0, gap: 4 }}>
            <div style={{ display: "flex", gap: 2 }}>
              {TV_INTERVALS.map((iv) => (
                <button key={iv.value} onClick={() => setChartInterval(iv.value)} style={{
                  padding: "5px 10px", border: "none", borderRadius: 5, cursor: "pointer",
                  fontFamily: "inherit", fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                  background: chartInterval === iv.value ? "#F0B90B" : "transparent",
                  color: chartInterval === iv.value ? "#fff" : "#848E9C",
                }}>{iv.label}</button>
              ))}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
              <button style={{ padding: "5px 10px", border: "none", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", fontSize: 11, background: !showTrades ? "#F5F5F5" : "transparent", color: !showTrades ? "#1E2026" : "#848E9C", fontWeight: !showTrades ? 700 : 400 }} onClick={() => setShowTrades(false)}>Chart</button>
              <button style={{ padding: "5px 10px", border: "none", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", fontSize: 11, background: showTrades ? "#F5F5F5" : "transparent", color: showTrades ? "#1E2026" : "#848E9C", fontWeight: showTrades ? 700 : 400 }} onClick={() => setShowTrades(true)}>Trades</button>
            </div>
          </div>

          {/* Chart Area */}
          <div style={{ flex: "0 0 460px", minHeight: 460, overflow: "hidden", background: "#fff" }}>
            {showTrades ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "8px 16px", borderBottom: "1px solid #EAECEF", background: "#FAFAFA" }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#848E9C", letterSpacing: "0.5px" }}>Price (USDT)</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#848E9C", textAlign: "center" }}>Qty</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#848E9C", textAlign: "right" }}>Time</span>
                </div>
                <div style={{ overflowY: "auto", flex: 1, scrollbarWidth: "none" }}>
                  {trades.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 40, color: "#848E9C", fontSize: 12 }}>Connecting…</div>
                  ) : trades.map((t) => (
                    <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "4px 16px", fontSize: 11, borderBottom: "1px solid #F5F5F5" }}>
                      <span style={{ color: t.buy ? "#0ECB81" : "#F6465D", fontWeight: 700 }}>{fmtPrice(t.price)}</span>
                      <span style={{ color: "#848E9C", textAlign: "center" }}>{t.qty.toFixed(5)}</span>
                      <span style={{ color: "#B7BDC6", fontSize: 10, textAlign: "right" }}>{t.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <TradingViewChart key={chartKey} symbol={asset.tvSymbol} interval={chartInterval} chartKey={chartKey} />
            )}
          </div>

          {/* ── Open Positions Panel ── */}
          <div style={{ flex: 1, background: "#FAFAFA", borderTop: "1px solid #EAECEF" }}>
            <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid #EAECEF", display: "flex", alignItems: "center", gap: 10, background: "#fff" }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "#1E2026", letterSpacing: "0.3px" }}>Open Positions</span>
              {anyPosOpen && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "#0ECB8118", color: "#0ECB81", border: "1px solid #0ECB8130" }}>Active</span>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                {btcPosOpen && <span style={{ fontSize: 10, color: "#F7931A", fontWeight: 700 }}>₿ BTC</span>}
                {ethPosOpen && <span style={{ fontSize: 10, color: "#627EEA", fontWeight: 700 }}>Ξ ETH</span>}
                {!anyPosOpen && <span style={{ fontSize: 10, color: "#B7BDC6" }}>All markets</span>}
              </div>
            </div>

            <div style={{ padding: "12px 16px", display: "flex", gap: 12, flexWrap: "wrap" }}>
              {isConnected && address ? (
                <AllPositionsPanel address={address} onMarketClose={handleMarketClose} onLimitClose={handleLimitClose} isPending={isPending} />
              ) : null}
              {isConnected && !anyPosOpen && (
                <div style={{ width: "100%", padding: "28px 0", textAlign: "center", color: "#B7BDC6", fontSize: 12 }}>No open positions</div>
              )}
              {!isConnected && (
                <div style={{ width: "100%", padding: "28px 0", textAlign: "center", color: "#B7BDC6", fontSize: 12 }}>Connect wallet to view positions</div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Trade Panel ── */}
        <div className="nx-right" style={{ width: 348, display: "flex", flexDirection: "column", gap: 12, padding: 14, background: "#fff", overflowY: "auto", borderLeft: "1px solid #EAECEF" }}>
          {/* Order Type Tabs */}
          <div style={{ display: "flex", background: "#F5F5F5", borderRadius: 10, padding: 3, gap: 3 }}>
            {(["market", "limit"] as OrderType[]).map((t) => (
              <button key={t} onClick={() => setOrderType(t)} style={{
                flex: 1, padding: "9px", border: "none", borderRadius: 8,
                background: orderType === t ? "#fff" : "transparent",
                color: orderType === t ? "#1E2026" : "#848E9C",
                fontWeight: orderType === t ? 700 : 500, fontSize: 12, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
                boxShadow: orderType === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              }}>
                {t === "market" ? "Market" : "Limit"}
              </button>
            ))}
          </div>

          {/* Margin Mode + Vault Balance Row */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setMarginModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#F5F5F5", border: "1px solid #EAECEF", borderRadius: 7, cursor: "pointer", fontFamily: "inherit" }}
            >
              <span style={{ fontWeight: 700, fontSize: 11, color: marginMode === 1 ? "#D97706" : "#2563EB" }}>
                {marginMode === 1 ? "Cross" : "Isolated"}
              </span>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="#848E9C" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <span style={{ color: "#E0E0E0" }}>|</span>
            <span style={{ fontSize: 11, color: "#848E9C" }}>One-Way</span>
            {/* FIX #2G: Click to force-refresh vault balance */}
            <div
              style={{ marginLeft: "auto", textAlign: "right", cursor: "pointer" }}
              title="Click to refresh vault balance"
              onClick={() => {
                void refetchVault();
                void refetchLocked();
                void refetchBtcPos();
                void refetchEthPos();
                void refetchWalletBal();
              }}
            >
              <div style={{ fontSize: 9, color: "#B7BDC6", fontWeight: 600, letterSpacing: "0.5px" }}>VAULT AVAIL ↻</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: vaultAvail > 0 ? "#0ECB81" : "#848E9C" }}>
                {isConnected ? fmtUSD(vaultAvail) : "—"}
              </div>
              {totalLockedCollat > 0 && (
                <div style={{ fontSize: 9, color: "#F0B90B", fontWeight: 600 }}>
                  {fmtUSD(totalLockedCollat)} in trades
                </div>
              )}
              {vaultBal > 0 && (
                <div style={{ fontSize: 8, color: "#B7BDC6" }}>deposited: {fmtUSD(vaultBal)}</div>
              )}
            </div>
          </div>

          {/* Wallet USDC */}
          {isConnected && walletUsdc > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 12px", background: "#F5F5F5", borderRadius: 8, border: "1px solid #EAECEF" }}>
              <span style={{ fontSize: 10, color: "#848E9C" }}>Wallet USDC</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#1E2026" }}>{fmtUSD(walletUsdc)}</span>
            </div>
          )}

          {/* FIX #1: Not whitelisted warning (higher priority than oracle warning) */}
          {isConnected && !isCurrentAssetWhitelisted && (
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "#FFF0F0", border: "1px solid #F6465D40" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#A8071A", marginBottom: 6 }}>
                🚫 {asset.symbol} not whitelisted in PositionManager
              </div>
              <div style={{ fontSize: 10, color: "#A8071A", marginBottom: 6, lineHeight: 1.5 }}>
                Oracle is set ✓ but PositionManager.addAsset() was never called. Run:
              </div>
              <code style={{
                display: "block", fontSize: 9, color: "#5C0000", background: "#FFD6D6",
                padding: "6px 8px", borderRadius: 4, fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.6,
              }}>
                {`cast send ${CONTRACTS.POSITION_MANAGER.address} "addAsset(address)" ${asset.address} --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key $PRIVATE_KEY`}
              </code>
            </div>
          )}

          {/* Oracle health warning — only shown when asset is whitelisted but oracle stale */}
          {isConnected && isCurrentAssetWhitelisted && !oracleHealthy && (
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "#FFF8F0", border: "1px solid #F0B90B50" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#92600A", marginBottom: 3 }}>
                ⚠️ {asset.symbol} oracle stale — fix with:
              </div>
              <code style={{
                display: "block", fontSize: 9, color: "#5C3B0A", background: "#F5E6CC",
                padding: "4px 6px", borderRadius: 4, fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.5,
              }}>
                {`cast send ${CONTRACTS.ORACLE.address} "setAsset(address,address,uint256)" ${asset.address} ${asset.symbol === "BTC" ? "0x1b44F351481282D86Cb30CE00E53f7c9eF0f68B5" : "0x694AA1769357215DE4FAC081bf1f309aDC325306"} 86400 --rpc-url https://ethereum-sepolia-rpc.publicnode.com --private-key $PRIVATE_KEY`}
              </code>
            </div>
          )}

          {/* Position open banner */}
          {isConnected && currentAssetPosOpen && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 9, background: "#F0B90B08", border: "1px solid #F0B90B40" }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>ℹ️</span>
              <span style={{ fontSize: 11, color: "#92600A", lineHeight: 1.6 }}>
                You already have an open <strong>{asset.symbol}</strong> position. Close it below before opening a new one.
                {asset.symbol === "BTC" ? " You can still open ETH separately." : " You can still open BTC separately."}
              </span>
            </div>
          )}

          {/* Long / Short */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {(["long", "short"] as Side[]).map((s) => (
              <button key={s} onClick={() => setSide(s)} style={{
                padding: "13px 8px", borderRadius: 10, fontWeight: 800, fontSize: 13,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: side === s ? (s === "long" ? "linear-gradient(135deg,#0ECB81,#00A86B)" : "linear-gradient(135deg,#F6465D,#CF304A)") : "#F5F5F5",
                color: side === s ? "#fff" : "#848E9C",
                boxShadow: side === s ? (s === "long" ? "0 4px 14px rgba(14,203,129,0.28)" : "0 4px 14px rgba(246,70,93,0.28)") : "none",
                border: "none", outline: side === s ? "none" : "1px solid #EAECEF",
              }}>
                {s === "long" ? "▲ Long" : "▼ Short"}
              </button>
            ))}
          </div>

          {/* Limit Price Input */}
          {orderType === "limit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 10, color: "#848E9C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Limit Price</label>
              <div style={{ display: "flex", alignItems: "center", background: "#FAFAFA", border: "1.5px solid #EAECEF", borderRadius: 8, overflow: "hidden" }}>
                <input type="number" placeholder={price > 0 ? fmtPrice(price) : "0.00"} value={limitPx} onChange={(e) => setLimitPx(e.target.value)}
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "10px 12px", color: "#1E2026", fontFamily: "inherit", fontSize: 14, fontWeight: 700 }} />
                <span style={{ padding: "10px 12px", color: "#848E9C", fontSize: 11, fontWeight: 700, borderLeft: "1px solid #EAECEF", background: "#F5F5F5", whiteSpace: "nowrap" }}>USD</span>
              </div>
            </div>
          )}

          {/* Collateral Input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 10, color: "#848E9C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Order Value</label>
            <div style={{ display: "flex", alignItems: "center", background: "#FAFAFA", border: "1.5px solid #EAECEF", borderRadius: 8, overflow: "hidden" }}>
              <input type="number" placeholder="0.00" value={collInput} onChange={(e) => setCollInput(e.target.value)}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", padding: "10px 12px", color: "#1E2026", fontFamily: "inherit", fontSize: 14, fontWeight: 700 }} />
              <span style={{ padding: "10px 12px", color: "#848E9C", fontSize: 11, fontWeight: 700, borderLeft: "1px solid #EAECEF", background: "#F5F5F5", whiteSpace: "nowrap" }}>USDC</span>
            </div>
          </div>

          {/* % Presets */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {SIZE_PRESETS.map((p) => (
              <button key={p} onClick={() => fillPct(p)} style={{ padding: "6px 0", background: "#F5F5F5", border: "1px solid #EAECEF", borderRadius: 6, color: "#848E9C", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}>
                {p}%
              </button>
            ))}
          </div>

          {/* Leverage Slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <label style={{ fontSize: 10, color: "#848E9C", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Leverage</label>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#F0B90B" }}>{leverage}×</span>
            </div>
            <input type="range" min={1} max={maxLev} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))}
              style={{ width: "100%", height: 4, appearance: "none", WebkitAppearance: "none", borderRadius: 4, outline: "none", cursor: "pointer", background: sliderBg }} />
            <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
              {LEV_PRESETS.filter((l) => l <= maxLev).map((l) => (
                <button key={l} onClick={() => setLeverage(l)} style={{
                  flex: 1, padding: "5px 0", borderRadius: 5, fontSize: 11, cursor: "pointer",
                  fontFamily: "inherit", transition: "all 0.15s",
                  background: leverage === l ? "#F0B90B" : "#F5F5F5",
                  color: leverage === l ? "#fff" : "#848E9C",
                  fontWeight: leverage === l ? 800 : 500,
                  border: leverage === l ? "none" : "1px solid #EAECEF",
                }}>
                  {l}×
                </button>
              ))}
            </div>
          </div>

          {/* Balance Status */}
          {collateral > 0 && isConnected && (
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #EAECEF" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: vaultSufficient ? "#F0FFF8" : "#FFF8F0", borderBottom: "1px solid #EAECEF" }}>
                <div>
                  <span style={{ fontSize: 11, color: "#848E9C", fontWeight: 600 }}>Vault Available</span>
                  {lockedCollat > 0 && (
                    <div style={{ fontSize: 9, color: "#F0B90B" }}>{fmtUSD(lockedCollat)} in open position</div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: vaultSufficient ? "#0ECB81" : "#F0B90B" }}>{fmtUSD(vaultAvail)}</span>
                  {vaultSufficient ? (
                    <span style={{ fontSize: 10, color: "#0ECB81", background: "#0ECB8115", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>✓ OK</span>
                  ) : (
                    <span style={{ fontSize: 10, color: "#F0B90B", background: "#F0B90B15", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>+{fmtUSD(depositAmount)}</span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "#FAFAFA" }}>
                <span style={{ fontSize: 11, color: "#848E9C", fontWeight: 600 }}>Wallet USDC</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1E2026" }}>{fmtUSD(walletUsdc)}</span>
                  {needsDeposit && walletUsdc < depositAmount - 0.0001 && (
                    <span style={{ fontSize: 10, color: "#F6465D", background: "#F6465D15", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>Insufficient</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Multi-Step Flow */}
          {needsDeposit && collateral > 0 && isConnected && (
            <div style={{ background: "#F8F9FA", border: "1px solid #EAECEF", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, color: "#848E9C", fontWeight: 700, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Auto-deposit flow</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {needsApproval && (
                  <>
                    <StepBadge step={1} label="Approve USDC for vault" active={txFlow === "approving"} done={txFlow === "depositing" || txFlow === "pending" || txFlow === "ok"} />
                    <div style={{ width: 1, height: 8, background: "#EAECEF", marginLeft: 9 }} />
                  </>
                )}
                <StepBadge step={needsApproval ? 2 : 1} label={`Deposit ${fmtUSD(depositAmount)} USDC → Vault`} active={txFlow === "depositing"} done={txFlow === "pending" || txFlow === "ok"} />
                <div style={{ width: 1, height: 8, background: "#EAECEF", marginLeft: 9 }} />
                <StepBadge step={needsApproval ? 3 : 2} label={`Open ${side === "long" ? "Long" : "Short"} ${leverage}× ${asset.symbol}`} active={txFlow === "pending"} done={txFlow === "ok"} />
              </div>
            </div>
          )}

          {/* Insufficient Warning */}
          {needsDeposit && walletUsdc < depositAmount - 0.0001 && isConnected && collateral > 0 && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 9, background: "#F6465D08", border: "1px solid #F6465D30" }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
              <span style={{ fontSize: 11, color: "#A8071A", lineHeight: 1.6 }}>Not enough USDC in wallet. Need {fmtUSD(depositAmount)} more.</span>
            </div>
          )}

          {/* Order Summary */}
          <div style={{ background: "#FAFAFA", border: "1px solid #EAECEF", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            <SRow label="Order Value" value={posSize > 0 ? fmtUSD(posSize) : "—"} />
            <SRow label="Required Margin" value={collateral > 0 ? fmtUSD(collateral) : "—"} />
            <SRow label="Est. Fee (0.025%)" value={fees > 0 ? fmtUSD(fees) : "—"} />
            <div style={{ borderTop: "1px solid #EAECEF", margin: "2px 0" }} />
            <SRow label="Liq. Price" value={posSize > 0 && liqPx > 0 ? fmtPrice(liqPx) : "N/A"} vc="#F6465D" />
            <SRow label="Entry Price" value={entryPx > 0 ? fmtPrice(entryPx) : "—"} />
          </div>

          {/* Toast */}
          {txFlow !== "idle" && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 9, border: "1px solid",
              borderColor: txFlow === "ok" ? "#0ECB8140" : txFlow === "err" ? "#F6465D40" : "#F0B90B40",
              background: txFlow === "ok" ? "#0ECB8108" : txFlow === "err" ? "#F6465D08" : "#F0B90B08",
            }}>
              {(txFlow === "pending" || txFlow === "approving" || txFlow === "depositing") && (
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(240,185,11,0.2)", borderTopColor: "#F0B90B", animation: "nxSpin 0.7s linear infinite", flexShrink: 0, marginTop: 1 }} />
              )}
              {txFlow === "ok" && <span style={{ color: "#0ECB81", fontSize: 14, flexShrink: 0 }}>✓</span>}
              {txFlow === "err" && <span style={{ color: "#F6465D", fontSize: 14, flexShrink: 0 }}>✕</span>}
              <span style={{ flex: 1, fontSize: 11, color: "#1E2026", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{txMsg}</span>
              {txFlow !== "pending" && txFlow !== "approving" && txFlow !== "depositing" && (
                <button onClick={() => setTxFlow("idle")} style={{ background: "none", border: "none", color: "#848E9C", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
              )}
            </div>
          )}

          {/* CTA Button */}
          <button
            disabled={ctaDisabled}
            onClick={() => { void handlePlaceOrder(); }}
            style={{
              width: "100%", padding: "14px 0", border: "none", borderRadius: 10,
              fontFamily: "inherit", fontWeight: 800, fontSize: 14, letterSpacing: "0.2px",
              transition: "all 0.2s", cursor: ctaDisabled ? "not-allowed" : "pointer",
              background: ctaBg, color: ctaDisabled ? "#848E9C" : "#fff",
              boxShadow: ctaShadow, opacity: isSubmitting ? 0.75 : 1,
            }}
          >
            {ctaLabel}
          </button>

          {/* Open positions summary chips */}
          {isConnected && (rawBtcPos?.isOpen || rawEthPos?.isOpen) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {rawBtcPos?.isOpen && (
                <div style={{ flex: 1, padding: "6px 10px", background: rawBtcPos.isLong ? "#F0FFF8" : "#FFF5F5", border: `1px solid ${rawBtcPos.isLong ? "#0ECB8130" : "#F6465D30"}`, borderRadius: 7, fontSize: 10 }}>
                  <span style={{ fontWeight: 700, color: rawBtcPos.isLong ? "#0ECB81" : "#F6465D" }}>₿ BTC {rawBtcPos.isLong ? "▲ Long" : "▼ Short"}</span>
                  <span style={{ color: "#848E9C", marginLeft: 4 }}>{fmtUSD(decodeCollateral(rawBtcPos.collateral))} margin</span>
                </div>
              )}
              {rawEthPos?.isOpen && (
                <div style={{ flex: 1, padding: "6px 10px", background: rawEthPos.isLong ? "#F0FFF8" : "#FFF5F5", border: `1px solid ${rawEthPos.isLong ? "#0ECB8130" : "#F6465D30"}`, borderRadius: 7, fontSize: 10 }}>
                  <span style={{ fontWeight: 700, color: rawEthPos.isLong ? "#0ECB81" : "#F6465D" }}>Ξ ETH {rawEthPos.isLong ? "▲ Long" : "▼ Short"}</span>
                  <span style={{ color: "#848E9C", marginLeft: 4 }}>{fmtUSD(decodeCollateral(rawEthPos.collateral))} margin</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── MARGIN MODE MODAL ── */}
      {marginModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}
          onClick={() => setMarginModal(false)}
        >
          <div
            style={{ background: "#fff", border: "1px solid #EAECEF", borderRadius: 16, width: 400, maxWidth: "calc(100vw - 32px)", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: "1px solid #EAECEF" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#1E2026" }}>Margin Mode</span>
              <button onClick={() => setMarginModal(false)} style={{ background: "none", border: "none", fontSize: 22, color: "#848E9C", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {([
                { mode: 0 as MarginMode, icon: "🔒", title: "Isolated Margin", color: "#2563EB", desc: "Only this position's collateral is at risk. Max loss equals your deposited margin. PnL is isolated per position." },
                { mode: 1 as MarginMode, icon: "🔗", title: "Cross Margin", color: "#FBBF24", desc: "All positions share one margin pool. PnL updates in real-time across all open positions. Higher capital efficiency, higher risk." },
              ] as const).map(({ mode, icon, title, color, desc }) => (
                <button key={mode} onClick={() => { setMarginMode(mode); setMarginModal(false); }} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "14px",
                  border: `2px solid ${marginMode === mode ? color : "#EAECEF"}`,
                  borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  background: marginMode === mode ? color + "08" : "#FAFAFA",
                  transition: "all 0.15s", width: "100%",
                }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <div style={{ textAlign: "left", flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color, marginBottom: 4 }}>{title}</div>
                    <div style={{ fontSize: 11, color: "#848E9C", lineHeight: 1.6 }}>{desc}</div>
                  </div>
                  {marginMode === mode && <span style={{ color, fontSize: 18 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Global CSS ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes nxSpin  { to { transform: rotate(360deg); } }
        @keyframes nxPulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=range] { -webkit-appearance: none; appearance: none; }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 14px; height: 14px;
          border-radius: 50%; background: #F0B90B; border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(240,185,11,0.5); cursor: pointer;
        }
        input[type=range]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #F0B90B; border: 2px solid #fff; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #EAECEF; border-radius: 4px; }
        .nx-right { scrollbar-width: none; }
        @media (max-width: 900px) {
          .nx-main  { flex-direction: column !important; }
          .nx-right { width: 100% !important; border-left: none !important; border-top: 1px solid #EAECEF; }
          .nx-left  { min-height: 420px; }
        }
      `}</style>
    </div>
  );
}
