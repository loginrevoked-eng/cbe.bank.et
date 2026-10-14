import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  CircleDollarSign,
  Receipt,
  CreditCard,
  Split,
  PiggyBank,
  Banknote,
  Landmark,
  Building2,
  Phone,
  Repeat,
  Wallet,
  ReceiptText,
  ArrowUpRight,
  ArrowDownLeft,
  ScanQrCode,
  House,
  Settings,
} from "lucide-react";

const GOLD = "#d9b46c";

// Horizontal row of round shortcuts under the card
const QUICK_ACTIONS = [
  { label: "Cash Out", icon: CircleDollarSign },
  { label: "Mini Statement", icon: Receipt },
  { label: "Cards", icon: CreditCard },
  { label: "Bill Share", icon: Split },
  { label: "Savings", icon: PiggyBank },
  { label: "Loans", icon: Banknote },
];

// The two wide cards
const PRIMARY_ACTIONS = [
  { title: "CBE Transfer", sub: "Send Money", icon: ArrowUpRight, tone: "bg-red-100 text-red-500" },
  { title: "Receive", sub: "Get Paid", icon: ArrowDownLeft, tone: "bg-green-100 text-green-600" },
];

// The 2-column grid of tiles
const TILES = [
  { label: "Airtime", icon: Phone },
  { label: "Other Transfers", icon: Repeat },
  { label: "CBEBirr", icon: Wallet },
  { label: "Bills & Utilities", icon: ReceiptText },
  { label: "Banks", icon: Landmark },
  { label: "Merchants", icon: Building2 },
];

// World map as a dot matrix (1,716 land dots on a 120 x 46 grid, 3 degrees per dot)
const MAP_DOTS =
  "M22.5 0.5h0M25.5 0.5h0M26.5 0.5h0M27.5 0.5h0M29.5 0.5h0M31.5 0.5h0M32.5 0.5h0M33.5 0.5h0M34.5 0.5h0M36.5 0.5h0M37.5 0.5h0M38.5 0.5h0M39.5 0.5h0M40.5 0.5h0M41.5 0.5h0M42.5 0.5h0M43.5 0.5h0M44.5 0.5h0M45.5 0.5h0M46.5 0.5h0M47.5 0.5h0M48.5 0.5h0M49.5 0.5h0M50.5 0.5h0M51.5 0.5h0M52.5 0.5h0M64.5 0.5h0M65.5 0.5h0M93.5 0.5h0M94.5 0.5h0M21.5 1.5h0M22.5 1.5h0M24.5 1.5h0M26.5 1.5h0M28.5 1.5h0M29.5 1.5h0M30.5 1.5h0M31.5 1.5h0M32.5 1.5h0M40.5 1.5h0M41.5 1.5h0M42.5 1.5h0M43.5 1.5h0M44.5 1.5h0M45.5 1.5h0M46.5 1.5h0M47.5 1.5h0M48.5 1.5h0M49.5 1.5h0M50.5 1.5h0M51.5 1.5h0M52.5 1.5h0M79.5 1.5h0M80.5 1.5h0M90.5 1.5h0M91.5 1.5h0M92.5 1.5h0M93.5 1.5h0M94.5 1.5h0M95.5 1.5h0M96.5 1.5h0M97.5 1.5h0M106.5 1.5h0M107.5 1.5h0M18.5 2.5h0M19.5 2.5h0M21.5 2.5h0M22.5 2.5h0M23.5 2.5h0M24.5 2.5h0M26.5 2.5h0M27.5 2.5h0M28.5 2.5h0M30.5 2.5h0M31.5 2.5h0M32.5 2.5h0M42.5 2.5h0M43.5 2.5h0M44.5 2.5h0M45.5 2.5h0M46.5 2.5h0M47.5 2.5h0M48.5 2.5h0M49.5 2.5h0M50.5 2.5h0M51.5 2.5h0M52.5 2.5h0M77.5 2.5h0M78.5 2.5h0M83.5 2.5h0M87.5 2.5h0M88.5 2.5h0M89.5 2.5h0M90.5 2.5h0M91.5 2.5h0M92.5 2.5h0M93.5 2.5h0M94.5 2.5h0M95.5 2.5h0M96.5 2.5h0M97.5 2.5h0M98.5 2.5h0M99.5 2.5h0M100.5 2.5h0M101.5 2.5h0M102.5 2.5h0M106.5 2.5h0M107.5 2.5h0M108.5 2.5h0M6.5 3.5h0M7.5 3.5h0M8.5 3.5h0M9.5 3.5h0M10.5 3.5h0M11.5 3.5h0M12.5 3.5h0M13.5 3.5h0M15.5 3.5h0M16.5 3.5h0M17.5 3.5h0M18.5 3.5h0M19.5 3.5h0M21.5 3.5h0M22.5 3.5h0M23.5 3.5h0M24.5 3.5h0M25.5 3.5h0M27.5 3.5h0M28.5 3.5h0M29.5 3.5h0M31.5 3.5h0M32.5 3.5h0M34.5 3.5h0M35.5 3.5h0M36.5 3.5h0M37.5 3.5h0M42.5 3.5h0M43.5 3.5h0M44.5 3.5h0M45.5 3.5h0M46.5 3.5h0M47.5 3.5h0M48.5 3.5h0M49.5 3.5h0M50.5 3.5h0M51.5 3.5h0M66.5 3.5h0M67.5 3.5h0M68.5 3.5h0M69.5 3.5h0M70.5 3.5h0M80.5 3.5h0M82.5 3.5h0M83.5 3.5h0M85.5 3.5h0M86.5 3.5h0M87.5 3.5h0M88.5 3.5h0M89.5 3.5h0M90.5 3.5h0M91.5 3.5h0M92.5 3.5h0M93.5 3.5h0M94.5 3.5h0M95.5 3.5h0M96.5 3.5h0M97.5 3.5h0M98.5 3.5h0M99.5 3.5h0M100.5 3.5h0M101.5 3.5h0M102.5 3.5h0M103.5 3.5h0M104.5 3.5h0M105.5 3.5h0M106.5 3.5h0M107.5 3.5h0M108.5 3.5h0M109.5 3.5h0M110.5 3.5h0M111.5 3.5h0M112.5 3.5h0M113.5 3.5h0M114.5 3.5h0M115.5 3.5h0M117.5 3.5h0M118.5 3.5h0M0.5 4.5h0M1.5 4.5h0M2.5 4.5h0M6.5 4.5h0M7.5 4.5h0M8.5 4.5h0M9.5 4.5h0M10.5 4.5h0M11.5 4.5h0M12.5 4.5h0M13.5 4.5h0M14.5 4.5h0M15.5 4.5h0M16.5 4.5h0M17.5 4.5h0M18.5 4.5h0M19.5 4.5h0M20.5 4.5h0M21.5 4.5h0M22.5 4.5h0M23.5 4.5h0M24.5 4.5h0M25.5 4.5h0M26.5 4.5h0M27.5 4.5h0M28.5 4.5h0M29.5 4.5h0M30.5 4.5h0M31.5 4.5h0M35.5 4.5h0M36.5 4.5h0M37.5 4.5h0M38.5 4.5h0M42.5 4.5h0M43.5 4.5h0M44.5 4.5h0M45.5 4.5h0M46.5 4.5h0M47.5 4.5h0M64.5 4.5h0M65.5 4.5h0M66.5 4.5h0M67.5 4.5h0M68.5 4.5h0M69.5 4.5h0M70.5 4.5h0M72.5 4.5h0M73.5 4.5h0M75.5 4.5h0M76.5 4.5h0M77.5 4.5h0M78.5 4.5h0M79.5 4.5h0M80.5 4.5h0M81.5 4.5h0M82.5 4.5h0M83.5 4.5h0M84.5 4.5h0M85.5 4.5h0M86.5 4.5h0M87.5 4.5h0M88.5 4.5h0M89.5 4.5h0M90.5 4.5h0M91.5 4.5h0M92.5 4.5h0M93.5 4.5h0M94.5 4.5h0M95.5 4.5h0M96.5 4.5h0M97.5 4.5h0M98.5 4.5h0M99.5 4.5h0M100.5 4.5h0M101.5 4.5h0M102.5 4.5h0M103.5 4.5h0M104.5 4.5h0M105.5 4.5h0M106.5 4.5h0M107.5 4.5h0M108.5 4.5h0M109.5 4.5h0M110.5 4.5h0M111.5 4.5h0M112.5 4.5h0M113.5 4.5h0M114.5 4.5h0M115.5 4.5h0M116.5 4.5h0M117.5 4.5h0M118.5 4.5h0M119.5 4.5h0M6.5 5.5h0M7.5 5.5h0M8.5 5.5h0M9.5 5.5h0M10.5 5.5h0M11.5 5.5h0M12.5 5.5h0M13.5 5.5h0M14.5 5.5h0M15.5 5.5h0M16.5 5.5h0M17.5 5.5h0M18.5 5.5h0M19.5 5.5h0M20.5 5.5h0M21.5 5.5h0M22.5 5.5h0M23.5 5.5h0M24.5 5.5h0M25.5 5.5h0M26.5 5.5h0M27.5 5.5h0M28.5 5.5h0M29.5 5.5h0M31.5 5.5h0M36.5 5.5h0M37.5 5.5h0M43.5 5.5h0M44.5 5.5h0M45.5 5.5h0M63.5 5.5h0M64.5 5.5h0M65.5 5.5h0M66.5 5.5h0M67.5 5.5h0M68.5 5.5h0M69.5 5.5h0M70.5 5.5h0M71.5 5.5h0M72.5 5.5h0M73.5 5.5h0M74.5 5.5h0M75.5 5.5h0M76.5 5.5h0M77.5 5.5h0M78.5 5.5h0M79.5 5.5h0M80.5 5.5h0M81.5 5.5h0M82.5 5.5h0M83.5 5.5h0M84.5 5.5h0M85.5 5.5h0M86.5 5.5h0M87.5 5.5h0M88.5 5.5h0M89.5 5.5h0M90.5 5.5h0M91.5 5.5h0M92.5 5.5h0M93.5 5.5h0M94.5 5.5h0M95.5 5.5h0M96.5 5.5h0M97.5 5.5h0M98.5 5.5h0M99.5 5.5h0M100.5 5.5h0M101.5 5.5h0M102.5 5.5h0M103.5 5.5h0M104.5 5.5h0M105.5 5.5h0M106.5 5.5h0M107.5 5.5h0M108.5 5.5h0M109.5 5.5h0M110.5 5.5h0M111.5 5.5h0M112.5 5.5h0M113.5 5.5h0M114.5 5.5h0M115.5 5.5h0M116.5 5.5h0M117.5 5.5h0M118.5 5.5h0M119.5 5.5h0M5.5 6.5h0M6.5 6.5h0M7.5 6.5h0M8.5 6.5h0M9.5 6.5h0M10.5 6.5h0M11.5 6.5h0M12.5 6.5h0M13.5 6.5h0M14.5 6.5h0M15.5 6.5h0M16.5 6.5h0M17.5 6.5h0M18.5 6.5h0M19.5 6.5h0M20.5 6.5h0M21.5 6.5h0M22.5 6.5h0M23.5 6.5h0M24.5 6.5h0M25.5 6.5h0M26.5 6.5h0M27.5 6.5h0M28.5 6.5h0M34.5 6.5h0M35.5 6.5h0M36.5 6.5h0M45.5 6.5h0M62.5 6.5h0M63.5 6.5h0M64.5 6.5h0M65.5 6.5h0M67.5 6.5h0M68.5 6.5h0M69.5 6.5h0M70.5 6.5h0M71.5 6.5h0M72.5 6.5h0M73.5 6.5h0M74.5 6.5h0M75.5 6.5h0M76.5 6.5h0M77.5 6.5h0M78.5 6.5h0M79.5 6.5h0M80.5 6.5h0M81.5 6.5h0M82.5 6.5h0M83.5 6.5h0M84.5 6.5h0M85.5 6.5h0M86.5 6.5h0M87.5 6.5h0M88.5 6.5h0M89.5 6.5h0M90.5 6.5h0M91.5 6.5h0M92.5 6.5h0M93.5 6.5h0M94.5 6.5h0M95.5 6.5h0M96.5 6.5h0M97.5 6.5h0M98.5 6.5h0M99.5 6.5h0M100.5 6.5h0M101.5 6.5h0M102.5 6.5h0M103.5 6.5h0M104.5 6.5h0M105.5 6.5h0M106.5 6.5h0M107.5 6.5h0M108.5 6.5h0M109.5 6.5h0M110.5 6.5h0M111.5 6.5h0M114.5 6.5h0M115.5 6.5h0M116.5 6.5h0M7.5 7.5h0M8.5 7.5h0M15.5 7.5h0M16.5 7.5h0M17.5 7.5h0M18.5 7.5h0M19.5 7.5h0M20.5 7.5h0M21.5 7.5h0M22.5 7.5h0M23.5 7.5h0M24.5 7.5h0M25.5 7.5h0M26.5 7.5h0M27.5 7.5h0M28.5 7.5h0M34.5 7.5h0M35.5 7.5h0M36.5 7.5h0M37.5 7.5h0M38.5 7.5h0M58.5 7.5h0M63.5 7.5h0M64.5 7.5h0M65.5 7.5h0M67.5 7.5h0M68.5 7.5h0M69.5 7.5h0M70.5 7.5h0M71.5 7.5h0M72.5 7.5h0M73.5 7.5h0M74.5 7.5h0M75.5 7.5h0M76.5 7.5h0M77.5 7.5h0M78.5 7.5h0M79.5 7.5h0M80.5 7.5h0M81.5 7.5h0M82.5 7.5h0M83.5 7.5h0M84.5 7.5h0M85.5 7.5h0M86.5 7.5h0M87.5 7.5h0M88.5 7.5h0M89.5 7.5h0M90.5 7.5h0M91.5 7.5h0M92.5 7.5h0M93.5 7.5h0M94.5 7.5h0M95.5 7.5h0M96.5 7.5h0M97.5 7.5h0M98.5 7.5h0M99.5 7.5h0M100.5 7.5h0M101.5 7.5h0M102.5 7.5h0M103.5 7.5h0M104.5 7.5h0M105.5 7.5h0M106.5 7.5h0M112.5 7.5h0M113.5 7.5h0M16.5 8.5h0M17.5 8.5h0M18.5 8.5h0M19.5 8.5h0M20.5 8.5h0M21.5 8.5h0M22.5 8.5h0M23.5 8.5h0M24.5 8.5h0M25.5 8.5h0M26.5 8.5h0M27.5 8.5h0M28.5 8.5h0M29.5 8.5h0M30.5 8.5h0M31.5 8.5h0M32.5 8.5h0M33.5 8.5h0M34.5 8.5h0M35.5 8.5h0M36.5 8.5h0M37.5 8.5h0M38.5 8.5h0M39.5 8.5h0M40.5 8.5h0M57.5 8.5h0M59.5 8.5h0M65.5 8.5h0M67.5 8.5h0M68.5 8.5h0M69.5 8.5h0M70.5 8.5h0M71.5 8.5h0M72.5 8.5h0M73.5 8.5h0M74.5 8.5h0M75.5 8.5h0M76.5 8.5h0M77.5 8.5h0M78.5 8.5h0M79.5 8.5h0M80.5 8.5h0M81.5 8.5h0M82.5 8.5h0M83.5 8.5h0M84.5 8.5h0M85.5 8.5h0M86.5 8.5h0M87.5 8.5h0M88.5 8.5h0M89.5 8.5h0M90.5 8.5h0M91.5 8.5h0M92.5 8.5h0M93.5 8.5h0M94.5 8.5h0M95.5 8.5h0M96.5 8.5h0M97.5 8.5h0M98.5 8.5h0M99.5 8.5h0M100.5 8.5h0M101.5 8.5h0M102.5 8.5h0M103.5 8.5h0M104.5 8.5h0M105.5 8.5h0M112.5 8.5h0M113.5 8.5h0M17.5 9.5h0M18.5 9.5h0M19.5 9.5h0M20.5 9.5h0M21.5 9.5h0M22.5 9.5h0M23.5 9.5h0M24.5 9.5h0M25.5 9.5h0M26.5 9.5h0M27.5 9.5h0M28.5 9.5h0M29.5 9.5h0M30.5 9.5h0M31.5 9.5h0M32.5 9.5h0M34.5 9.5h0M35.5 9.5h0M36.5 9.5h0M37.5 9.5h0M38.5 9.5h0M39.5 9.5h0M40.5 9.5h0M41.5 9.5h0M59.5 9.5h0M61.5 9.5h0M62.5 9.5h0M63.5 9.5h0M64.5 9.5h0M65.5 9.5h0M66.5 9.5h0M67.5 9.5h0M68.5 9.5h0M69.5 9.5h0M70.5 9.5h0M71.5 9.5h0M72.5 9.5h0M73.5 9.5h0M74.5 9.5h0M75.5 9.5h0M76.5 9.5h0M77.5 9.5h0M78.5 9.5h0M79.5 9.5h0M80.5 9.5h0M81.5 9.5h0M82.5 9.5h0M83.5 9.5h0M84.5 9.5h0M85.5 9.5h0M86.5 9.5h0M87.5 9.5h0M88.5 9.5h0M89.5 9.5h0M90.5 9.5h0M91.5 9.5h0M92.5 9.5h0M93.5 9.5h0M94.5 9.5h0M95.5 9.5h0M96.5 9.5h0M97.5 9.5h0M98.5 9.5h0M99.5 9.5h0M100.5 9.5h0M101.5 9.5h0M102.5 9.5h0M103.5 9.5h0M104.5 9.5h0M105.5 9.5h0M106.5 9.5h0M107.5 9.5h0M112.5 9.5h0M19.5 10.5h0M20.5 10.5h0M21.5 10.5h0M22.5 10.5h0M23.5 10.5h0M24.5 10.5h0M25.5 10.5h0M26.5 10.5h0M27.5 10.5h0M28.5 10.5h0M29.5 10.5h0M30.5 10.5h0M31.5 10.5h0M32.5 10.5h0M33.5 10.5h0M34.5 10.5h0M35.5 10.5h0M36.5 10.5h0M37.5 10.5h0M40.5 10.5h0M41.5 10.5h0M58.5 10.5h0M59.5 10.5h0M60.5 10.5h0M61.5 10.5h0M62.5 10.5h0M63.5 10.5h0M64.5 10.5h0M65.5 10.5h0M66.5 10.5h0M67.5 10.5h0M68.5 10.5h0M69.5 10.5h0M70.5 10.5h0M71.5 10.5h0M72.5 10.5h0M73.5 10.5h0M74.5 10.5h0M75.5 10.5h0M76.5 10.5h0M77.5 10.5h0M78.5 10.5h0M79.5 10.5h0M80.5 10.5h0M81.5 10.5h0M82.5 10.5h0M83.5 10.5h0M84.5 10.5h0M85.5 10.5h0M86.5 10.5h0M87.5 10.5h0M88.5 10.5h0M89.5 10.5h0M90.5 10.5h0M91.5 10.5h0M92.5 10.5h0M93.5 10.5h0M94.5 10.5h0M95.5 10.5h0M96.5 10.5h0M97.5 10.5h0M98.5 10.5h0M99.5 10.5h0M100.5 10.5h0M101.5 10.5h0M102.5 10.5h0M103.5 10.5h0M104.5 10.5h0M105.5 10.5h0M106.5 10.5h0M107.5 10.5h0M19.5 11.5h0M20.5 11.5h0M21.5 11.5h0M22.5 11.5h0M23.5 11.5h0M24.5 11.5h0M25.5 11.5h0M26.5 11.5h0M27.5 11.5h0M28.5 11.5h0M29.5 11.5h0M30.5 11.5h0M31.5 11.5h0M32.5 11.5h0M33.5 11.5h0M34.5 11.5h0M35.5 11.5h0M36.5 11.5h0M37.5 11.5h0M38.5 11.5h0M39.5 11.5h0M60.5 11.5h0M61.5 11.5h0M62.5 11.5h0M63.5 11.5h0M65.5 11.5h0M66.5 11.5h0M67.5 11.5h0M68.5 11.5h0M69.5 11.5h0M71.5 11.5h0M72.5 11.5h0M73.5 11.5h0M74.5 11.5h0M75.5 11.5h0M78.5 11.5h0M79.5 11.5h0M80.5 11.5h0M81.5 11.5h0M82.5 11.5h0M83.5 11.5h0M84.5 11.5h0M85.5 11.5h0M86.5 11.5h0M87.5 11.5h0M88.5 11.5h0M89.5 11.5h0M90.5 11.5h0M91.5 11.5h0M92.5 11.5h0M93.5 11.5h0M94.5 11.5h0M95.5 11.5h0M96.5 11.5h0M97.5 11.5h0M98.5 11.5h0M99.5 11.5h0M100.5 11.5h0M101.5 11.5h0M102.5 11.5h0M103.5 11.5h0M104.5 11.5h0M105.5 11.5h0M19.5 12.5h0M20.5 12.5h0M21.5 12.5h0M22.5 12.5h0M23.5 12.5h0M24.5 12.5h0M25.5 12.5h0M26.5 12.5h0M27.5 12.5h0M28.5 12.5h0M29.5 12.5h0M30.5 12.5h0M31.5 12.5h0M32.5 12.5h0M33.5 12.5h0M34.5 12.5h0M35.5 12.5h0M57.5 12.5h0M58.5 12.5h0M59.5 12.5h0M60.5 12.5h0M64.5 12.5h0M66.5 12.5h0M67.5 12.5h0M68.5 12.5h0M74.5 12.5h0M75.5 12.5h0M78.5 12.5h0M79.5 12.5h0M80.5 12.5h0M81.5 12.5h0M82.5 12.5h0M83.5 12.5h0M84.5 12.5h0M85.5 12.5h0M86.5 12.5h0M87.5 12.5h0M88.5 12.5h0M89.5 12.5h0M90.5 12.5h0M91.5 12.5h0M92.5 12.5h0M93.5 12.5h0M94.5 12.5h0M95.5 12.5h0M96.5 12.5h0M97.5 12.5h0M98.5 12.5h0M99.5 12.5h0M100.5 12.5h0M101.5 12.5h0M102.5 12.5h0M103.5 12.5h0M107.5 12.5h0M19.5 13.5h0M20.5 13.5h0M21.5 13.5h0M22.5 13.5h0M23.5 13.5h0M24.5 13.5h0M25.5 13.5h0M26.5 13.5h0M27.5 13.5h0M28.5 13.5h0M29.5 13.5h0M30.5 13.5h0M31.5 13.5h0M32.5 13.5h0M33.5 13.5h0M34.5 13.5h0M57.5 13.5h0M58.5 13.5h0M59.5 13.5h0M65.5 13.5h0M67.5 13.5h0M69.5 13.5h0M70.5 13.5h0M71.5 13.5h0M72.5 13.5h0M73.5 13.5h0M74.5 13.5h0M75.5 13.5h0M78.5 13.5h0M79.5 13.5h0M80.5 13.5h0M81.5 13.5h0M82.5 13.5h0M83.5 13.5h0M84.5 13.5h0M85.5 13.5h0M86.5 13.5h0M87.5 13.5h0M88.5 13.5h0M89.5 13.5h0M90.5 13.5h0M91.5 13.5h0M92.5 13.5h0M93.5 13.5h0M94.5 13.5h0M95.5 13.5h0M96.5 13.5h0M97.5 13.5h0M98.5 13.5h0M99.5 13.5h0M102.5 13.5h0M19.5 14.5h0M20.5 14.5h0M21.5 14.5h0M22.5 14.5h0M23.5 14.5h0M24.5 14.5h0M25.5 14.5h0M26.5 14.5h0M27.5 14.5h0M28.5 14.5h0M29.5 14.5h0M30.5 14.5h0M31.5 14.5h0M32.5 14.5h0M33.5 14.5h0M34.5 14.5h0M60.5 14.5h0M61.5 14.5h0M62.5 14.5h0M63.5 14.5h0M67.5 14.5h0M72.5 14.5h0M73.5 14.5h0M74.5 14.5h0M75.5 14.5h0M76.5 14.5h0M77.5 14.5h0M78.5 14.5h0M79.5 14.5h0M80.5 14.5h0M81.5 14.5h0M82.5 14.5h0M83.5 14.5h0M84.5 14.5h0M85.5 14.5h0M86.5 14.5h0M87.5 14.5h0M88.5 14.5h0M89.5 14.5h0M90.5 14.5h0M91.5 14.5h0M92.5 14.5h0M93.5 14.5h0M94.5 14.5h0M95.5 14.5h0M96.5 14.5h0M97.5 14.5h0M98.5 14.5h0M99.5 14.5h0M102.5 14.5h0M105.5 14.5h0M106.5 14.5h0M21.5 15.5h0M22.5 15.5h0M23.5 15.5h0M24.5 15.5h0M25.5 15.5h0M26.5 15.5h0M27.5 15.5h0M28.5 15.5h0M29.5 15.5h0M30.5 15.5h0M31.5 15.5h0M32.5 15.5h0M33.5 15.5h0M57.5 15.5h0M58.5 15.5h0M59.5 15.5h0M60.5 15.5h0M61.5 15.5h0M62.5 15.5h0M63.5 15.5h0M72.5 15.5h0M73.5 15.5h0M74.5 15.5h0M75.5 15.5h0M76.5 15.5h0M77.5 15.5h0M78.5 15.5h0M79.5 15.5h0M80.5 15.5h0M81.5 15.5h0M82.5 15.5h0M83.5 15.5h0M84.5 15.5h0M85.5 15.5h0M86.5 15.5h0M87.5 15.5h0M88.5 15.5h0M89.5 15.5h0M90.5 15.5h0M91.5 15.5h0M92.5 15.5h0M93.5 15.5h0M94.5 15.5h0M95.5 15.5h0M96.5 15.5h0M97.5 15.5h0M98.5 15.5h0M99.5 15.5h0M103.5 15.5h0M104.5 15.5h0M21.5 16.5h0M22.5 16.5h0M23.5 16.5h0M24.5 16.5h0M25.5 16.5h0M26.5 16.5h0M27.5 16.5h0M28.5 16.5h0M29.5 16.5h0M30.5 16.5h0M31.5 16.5h0M32.5 16.5h0M57.5 16.5h0M58.5 16.5h0M59.5 16.5h0M60.5 16.5h0M61.5 16.5h0M62.5 16.5h0M63.5 16.5h0M64.5 16.5h0M65.5 16.5h0M67.5 16.5h0M68.5 16.5h0M69.5 16.5h0M70.5 16.5h0M71.5 16.5h0M72.5 16.5h0M73.5 16.5h0M74.5 16.5h0M75.5 16.5h0M76.5 16.5h0M77.5 16.5h0M78.5 16.5h0M79.5 16.5h0M80.5 16.5h0M81.5 16.5h0M82.5 16.5h0M83.5 16.5h0M84.5 16.5h0M85.5 16.5h0M86.5 16.5h0M87.5 16.5h0M88.5 16.5h0M89.5 16.5h0M90.5 16.5h0M91.5 16.5h0M92.5 16.5h0M93.5 16.5h0M94.5 16.5h0M95.5 16.5h0M96.5 16.5h0M97.5 16.5h0M98.5 16.5h0M99.5 16.5h0M22.5 17.5h0M23.5 17.5h0M24.5 17.5h0M25.5 17.5h0M26.5 17.5h0M27.5 17.5h0M32.5 17.5h0M56.5 17.5h0M57.5 17.5h0M58.5 17.5h0M59.5 17.5h0M60.5 17.5h0M61.5 17.5h0M62.5 17.5h0M63.5 17.5h0M64.5 17.5h0M65.5 17.5h0M66.5 17.5h0M67.5 17.5h0M68.5 17.5h0M69.5 17.5h0M70.5 17.5h0M72.5 17.5h0M73.5 17.5h0M74.5 17.5h0M75.5 17.5h0M78.5 17.5h0M79.5 17.5h0M80.5 17.5h0M81.5 17.5h0M82.5 17.5h0M83.5 17.5h0M84.5 17.5h0M85.5 17.5h0M86.5 17.5h0M87.5 17.5h0M88.5 17.5h0M89.5 17.5h0M90.5 17.5h0M91.5 17.5h0M92.5 17.5h0M93.5 17.5h0M94.5 17.5h0M95.5 17.5h0M96.5 17.5h0M97.5 17.5h0M98.5 17.5h0M99.5 17.5h0M24.5 18.5h0M25.5 18.5h0M26.5 18.5h0M55.5 18.5h0M56.5 18.5h0M57.5 18.5h0M58.5 18.5h0M59.5 18.5h0M60.5 18.5h0M61.5 18.5h0M62.5 18.5h0M63.5 18.5h0M64.5 18.5h0M65.5 18.5h0M66.5 18.5h0M67.5 18.5h0M68.5 18.5h0M69.5 18.5h0M70.5 18.5h0M71.5 18.5h0M72.5 18.5h0M73.5 18.5h0M74.5 18.5h0M75.5 18.5h0M76.5 18.5h0M78.5 18.5h0M82.5 18.5h0M83.5 18.5h0M84.5 18.5h0M85.5 18.5h0M86.5 18.5h0M87.5 18.5h0M88.5 18.5h0M89.5 18.5h0M90.5 18.5h0M91.5 18.5h0M92.5 18.5h0M93.5 18.5h0M94.5 18.5h0M95.5 18.5h0M96.5 18.5h0M97.5 18.5h0M98.5 18.5h0M99.5 18.5h0M100.5 18.5h0M25.5 19.5h0M26.5 19.5h0M27.5 19.5h0M54.5 19.5h0M55.5 19.5h0M56.5 19.5h0M57.5 19.5h0M58.5 19.5h0M59.5 19.5h0M60.5 19.5h0M61.5 19.5h0M62.5 19.5h0M63.5 19.5h0M64.5 19.5h0M65.5 19.5h0M66.5 19.5h0M67.5 19.5h0M68.5 19.5h0M69.5 19.5h0M70.5 19.5h0M71.5 19.5h0M73.5 19.5h0M74.5 19.5h0M75.5 19.5h0M76.5 19.5h0M77.5 19.5h0M78.5 19.5h0M79.5 19.5h0M83.5 19.5h0M84.5 19.5h0M85.5 19.5h0M86.5 19.5h0M87.5 19.5h0M88.5 19.5h0M91.5 19.5h0M92.5 19.5h0M93.5 19.5h0M94.5 19.5h0M95.5 19.5h0M96.5 19.5h0M25.5 20.5h0M26.5 20.5h0M27.5 20.5h0M29.5 20.5h0M30.5 20.5h0M35.5 20.5h0M36.5 20.5h0M55.5 20.5h0M56.5 20.5h0M57.5 20.5h0M58.5 20.5h0M59.5 20.5h0M60.5 20.5h0M61.5 20.5h0M62.5 20.5h0M63.5 20.5h0M64.5 20.5h0M65.5 20.5h0M66.5 20.5h0M67.5 20.5h0M68.5 20.5h0M69.5 20.5h0M70.5 20.5h0M71.5 20.5h0M72.5 20.5h0M74.5 20.5h0M75.5 20.5h0M76.5 20.5h0M77.5 20.5h0M78.5 20.5h0M84.5 20.5h0M85.5 20.5h0M86.5 20.5h0M87.5 20.5h0M91.5 20.5h0M92.5 20.5h0M93.5 20.5h0M94.5 20.5h0M96.5 20.5h0M29.5 21.5h0M30.5 21.5h0M31.5 21.5h0M54.5 21.5h0M55.5 21.5h0M56.5 21.5h0M57.5 21.5h0M58.5 21.5h0M59.5 21.5h0M60.5 21.5h0M61.5 21.5h0M62.5 21.5h0M63.5 21.5h0M64.5 21.5h0M65.5 21.5h0M66.5 21.5h0M67.5 21.5h0M68.5 21.5h0M69.5 21.5h0M70.5 21.5h0M71.5 21.5h0M72.5 21.5h0M74.5 21.5h0M75.5 21.5h0M76.5 21.5h0M85.5 21.5h0M86.5 21.5h0M93.5 21.5h0M94.5 21.5h0M95.5 21.5h0M100.5 21.5h0M31.5 22.5h0M54.5 22.5h0M55.5 22.5h0M56.5 22.5h0M57.5 22.5h0M58.5 22.5h0M59.5 22.5h0M60.5 22.5h0M61.5 22.5h0M62.5 22.5h0M63.5 22.5h0M64.5 22.5h0M65.5 22.5h0M66.5 22.5h0M67.5 22.5h0M68.5 22.5h0M69.5 22.5h0M70.5 22.5h0M71.5 22.5h0M72.5 22.5h0M73.5 22.5h0M85.5 22.5h0M86.5 22.5h0M94.5 22.5h0M95.5 22.5h0M101.5 22.5h0M32.5 23.5h0M33.5 23.5h0M35.5 23.5h0M36.5 23.5h0M37.5 23.5h0M38.5 23.5h0M39.5 23.5h0M55.5 23.5h0M56.5 23.5h0M57.5 23.5h0M58.5 23.5h0M59.5 23.5h0M60.5 23.5h0M61.5 23.5h0M62.5 23.5h0M63.5 23.5h0M64.5 23.5h0M65.5 23.5h0M66.5 23.5h0M67.5 23.5h0M68.5 23.5h0M69.5 23.5h0M70.5 23.5h0M71.5 23.5h0M72.5 23.5h0M73.5 23.5h0M74.5 23.5h0M75.5 23.5h0M76.5 23.5h0M85.5 23.5h0M99.5 23.5h0M34.5 24.5h0M35.5 24.5h0M36.5 24.5h0M37.5 24.5h0M38.5 24.5h0M39.5 24.5h0M40.5 24.5h0M56.5 24.5h0M57.5 24.5h0M58.5 24.5h0M59.5 24.5h0M60.5 24.5h0M61.5 24.5h0M62.5 24.5h0M63.5 24.5h0M64.5 24.5h0M65.5 24.5h0M66.5 24.5h0M67.5 24.5h0M68.5 24.5h0M69.5 24.5h0M70.5 24.5h0M71.5 24.5h0M72.5 24.5h0M73.5 24.5h0M74.5 24.5h0M75.5 24.5h0M93.5 24.5h0M101.5 24.5h0M34.5 25.5h0M35.5 25.5h0M36.5 25.5h0M37.5 25.5h0M38.5 25.5h0M39.5 25.5h0M40.5 25.5h0M41.5 25.5h0M42.5 25.5h0M63.5 25.5h0M64.5 25.5h0M65.5 25.5h0M66.5 25.5h0M67.5 25.5h0M68.5 25.5h0M69.5 25.5h0M70.5 25.5h0M71.5 25.5h0M72.5 25.5h0M73.5 25.5h0M74.5 25.5h0M75.5 25.5h0M92.5 25.5h0M98.5 25.5h0M33.5 26.5h0M34.5 26.5h0M35.5 26.5h0M36.5 26.5h0M37.5 26.5h0M38.5 26.5h0M39.5 26.5h0M40.5 26.5h0M41.5 26.5h0M42.5 26.5h0M63.5 26.5h0M64.5 26.5h0M65.5 26.5h0M66.5 26.5h0M67.5 26.5h0M68.5 26.5h0M69.5 26.5h0M70.5 26.5h0M71.5 26.5h0M72.5 26.5h0M73.5 26.5h0M93.5 26.5h0M96.5 26.5h0M97.5 26.5h0M98.5 26.5h0M100.5 26.5h0M33.5 27.5h0M34.5 27.5h0M35.5 27.5h0M36.5 27.5h0M37.5 27.5h0M38.5 27.5h0M39.5 27.5h0M40.5 27.5h0M41.5 27.5h0M42.5 27.5h0M43.5 27.5h0M44.5 27.5h0M45.5 27.5h0M63.5 27.5h0M64.5 27.5h0M65.5 27.5h0M66.5 27.5h0M67.5 27.5h0M68.5 27.5h0M69.5 27.5h0M70.5 27.5h0M71.5 27.5h0M72.5 27.5h0M73.5 27.5h0M94.5 27.5h0M97.5 27.5h0M98.5 27.5h0M100.5 27.5h0M104.5 27.5h0M105.5 27.5h0M106.5 27.5h0M33.5 28.5h0M34.5 28.5h0M35.5 28.5h0M36.5 28.5h0M37.5 28.5h0M38.5 28.5h0M39.5 28.5h0M40.5 28.5h0M41.5 28.5h0M42.5 28.5h0M43.5 28.5h0M44.5 28.5h0M45.5 28.5h0M46.5 28.5h0M47.5 28.5h0M64.5 28.5h0M65.5 28.5h0M66.5 28.5h0M67.5 28.5h0M68.5 28.5h0M69.5 28.5h0M70.5 28.5h0M71.5 28.5h0M72.5 28.5h0M106.5 28.5h0M107.5 28.5h0M108.5 28.5h0M109.5 28.5h0M110.5 28.5h0M34.5 29.5h0M35.5 29.5h0M36.5 29.5h0M37.5 29.5h0M38.5 29.5h0M39.5 29.5h0M40.5 29.5h0M41.5 29.5h0M42.5 29.5h0M43.5 29.5h0M44.5 29.5h0M45.5 29.5h0M46.5 29.5h0M47.5 29.5h0M64.5 29.5h0M65.5 29.5h0M66.5 29.5h0M67.5 29.5h0M68.5 29.5h0M69.5 29.5h0M70.5 29.5h0M71.5 29.5h0M72.5 29.5h0M99.5 29.5h0M107.5 29.5h0M34.5 30.5h0M35.5 30.5h0M36.5 30.5h0M37.5 30.5h0M38.5 30.5h0M39.5 30.5h0M40.5 30.5h0M41.5 30.5h0M42.5 30.5h0M43.5 30.5h0M44.5 30.5h0M45.5 30.5h0M46.5 30.5h0M47.5 30.5h0M65.5 30.5h0M66.5 30.5h0M67.5 30.5h0M68.5 30.5h0M69.5 30.5h0M70.5 30.5h0M71.5 30.5h0M72.5 30.5h0M107.5 30.5h0M35.5 31.5h0M36.5 31.5h0M37.5 31.5h0M38.5 31.5h0M39.5 31.5h0M40.5 31.5h0M41.5 31.5h0M42.5 31.5h0M43.5 31.5h0M44.5 31.5h0M45.5 31.5h0M46.5 31.5h0M64.5 31.5h0M65.5 31.5h0M66.5 31.5h0M67.5 31.5h0M68.5 31.5h0M69.5 31.5h0M70.5 31.5h0M71.5 31.5h0M72.5 31.5h0M73.5 31.5h0M76.5 31.5h0M102.5 31.5h0M103.5 31.5h0M104.5 31.5h0M107.5 31.5h0M36.5 32.5h0M37.5 32.5h0M38.5 32.5h0M39.5 32.5h0M40.5 32.5h0M41.5 32.5h0M42.5 32.5h0M43.5 32.5h0M44.5 32.5h0M45.5 32.5h0M46.5 32.5h0M64.5 32.5h0M65.5 32.5h0M66.5 32.5h0M67.5 32.5h0M68.5 32.5h0M69.5 32.5h0M70.5 32.5h0M71.5 32.5h0M72.5 32.5h0M75.5 32.5h0M101.5 32.5h0M102.5 32.5h0M103.5 32.5h0M104.5 32.5h0M105.5 32.5h0M106.5 32.5h0M107.5 32.5h0M108.5 32.5h0M119.5 32.5h0M37.5 33.5h0M38.5 33.5h0M39.5 33.5h0M40.5 33.5h0M41.5 33.5h0M42.5 33.5h0M43.5 33.5h0M44.5 33.5h0M45.5 33.5h0M46.5 33.5h0M64.5 33.5h0M65.5 33.5h0M66.5 33.5h0M67.5 33.5h0M68.5 33.5h0M69.5 33.5h0M70.5 33.5h0M71.5 33.5h0M75.5 33.5h0M99.5 33.5h0M100.5 33.5h0M101.5 33.5h0M102.5 33.5h0M103.5 33.5h0M104.5 33.5h0M105.5 33.5h0M106.5 33.5h0M107.5 33.5h0M108.5 33.5h0M109.5 33.5h0M37.5 34.5h0M38.5 34.5h0M39.5 34.5h0M40.5 34.5h0M41.5 34.5h0M42.5 34.5h0M43.5 34.5h0M44.5 34.5h0M65.5 34.5h0M66.5 34.5h0M67.5 34.5h0M68.5 34.5h0M69.5 34.5h0M70.5 34.5h0M71.5 34.5h0M75.5 34.5h0M98.5 34.5h0M99.5 34.5h0M100.5 34.5h0M101.5 34.5h0M102.5 34.5h0M103.5 34.5h0M104.5 34.5h0M105.5 34.5h0M106.5 34.5h0M107.5 34.5h0M108.5 34.5h0M109.5 34.5h0M36.5 35.5h0M37.5 35.5h0M38.5 35.5h0M39.5 35.5h0M40.5 35.5h0M41.5 35.5h0M42.5 35.5h0M43.5 35.5h0M65.5 35.5h0M66.5 35.5h0M67.5 35.5h0M68.5 35.5h0M69.5 35.5h0M70.5 35.5h0M98.5 35.5h0M99.5 35.5h0M100.5 35.5h0M101.5 35.5h0M102.5 35.5h0M103.5 35.5h0M104.5 35.5h0M105.5 35.5h0M106.5 35.5h0M107.5 35.5h0M108.5 35.5h0M109.5 35.5h0M110.5 35.5h0M36.5 36.5h0M37.5 36.5h0M38.5 36.5h0M39.5 36.5h0M40.5 36.5h0M41.5 36.5h0M42.5 36.5h0M66.5 36.5h0M67.5 36.5h0M68.5 36.5h0M69.5 36.5h0M98.5 36.5h0M99.5 36.5h0M100.5 36.5h0M101.5 36.5h0M102.5 36.5h0M103.5 36.5h0M104.5 36.5h0M105.5 36.5h0M106.5 36.5h0M107.5 36.5h0M108.5 36.5h0M109.5 36.5h0M110.5 36.5h0M36.5 37.5h0M37.5 37.5h0M38.5 37.5h0M39.5 37.5h0M40.5 37.5h0M41.5 37.5h0M42.5 37.5h0M66.5 37.5h0M67.5 37.5h0M68.5 37.5h0M69.5 37.5h0M99.5 37.5h0M100.5 37.5h0M101.5 37.5h0M105.5 37.5h0M106.5 37.5h0M107.5 37.5h0M108.5 37.5h0M109.5 37.5h0M110.5 37.5h0M36.5 38.5h0M37.5 38.5h0M38.5 38.5h0M39.5 38.5h0M40.5 38.5h0M106.5 38.5h0M107.5 38.5h0M108.5 38.5h0M109.5 38.5h0M36.5 39.5h0M37.5 39.5h0M38.5 39.5h0M39.5 39.5h0M108.5 39.5h0M118.5 39.5h0M35.5 40.5h0M36.5 40.5h0M37.5 40.5h0M108.5 40.5h0M117.5 40.5h0M118.5 40.5h0M35.5 41.5h0M36.5 41.5h0M37.5 41.5h0M116.5 41.5h0M35.5 42.5h0M36.5 42.5h0M37.5 42.5h0M35.5 43.5h0M36.5 43.5h0M35.5 44.5h0M36.5 44.5h0";

// Grey-to-gold dotted world map used as the card watermark
function WorldMapWatermark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 46"
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
    >
      <defs>
        <linearGradient id="map-fade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="120" y2="0">
          <stop offset="0" stopColor="#8d8d8d" />
          <stop offset="1" stopColor={GOLD} />
        </linearGradient>
      </defs>
      <path d={MAP_DOTS} stroke="url(#map-fade)" strokeWidth="0.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function CircleButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-white active:bg-white/30"
    >
      {children}
    </button>
  );
}

function AccountCard({ account, bank, hidden, onToggleHidden }) {
  const [copied, setCopied] = useState(false);

  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(account.number);
    } catch {
      // fallback for non-secure contexts / older webviews
      const t = document.createElement("textarea");
      t.value = account.number;
      t.style.position = "fixed";
      t.style.opacity = "0";
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      document.body.removeChild(t);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-b from-neutral-800 to-neutral-950 p-5 text-white shadow-xl">
      <WorldMapWatermark />

      <div className="relative z-10">
        {/* Bank identity */}
        <div className="flex items-center gap-3">
          <img src={bank.logo} alt="" className="h-10 w-auto max-w-[64px] object-contain" />
          <div className="leading-tight" style={{ color: GOLD }}>
            <p className="font-medium">{bank.name}</p>
            <p className="text-xs">{bank.tagline}</p>
          </div>
        </div>

        {/* Balance */}
        <div className="relative mt-5 flex items-center justify-center gap-2">
          <span className="text-4xl font-bold tracking-widest">
            {hidden ? "******" : account.balance}
          </span>
          <span className="mt-3 text-sm font-medium text-neutral-300">{account.currency}</span>
          <button
            type="button"
            aria-label={hidden ? "Show balance" : "Hide balance"}
            onClick={onToggleHidden}
            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-neutral-400"
          >
            {hidden ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>

        {/* Account line */}
        <div className="mt-4 flex items-center justify-center gap-2 font-mono text-sm">
          <span style={{ color: GOLD }}>
            Saving Account {account.masked}
          </span>
          <button
            type="button"
            aria-label={copied ? "Account number copied" : "Copy account number"}
            onClick={copyNumber}
            className={`rounded-full p-1.5 transition active:scale-90 active:bg-white/10 ${
              copied ? "text-green-400" : "text-neutral-400 hover:text-[#d9b46c]"
            }`}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-500">{account.updatedAt}</p>
      </div>
    </div>
  );
}

// Matches the Python UserRecord dataclass
const DEFAULT_USER = {
  userid: "0",
  account: "1000000008657",
  balance: 12450,
  first_name: "Abdurahman",
  last_name: "",
};
const DEFAULT_BANK = {
  name: "Commercial Bank of Ethiopia",
  tagline: "The bank you can always rely on!",
  logo:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="none" stroke="#d9b46c" stroke-width="2"/><circle cx="20" cy="20" r="8" fill="#d9b46c"/></svg>'
    ),
};

export default function Home({
  user = DEFAULT_USER,
  bank = DEFAULT_BANK,
  defaultReceiverId = "",
  language = "English",
  onScan,
  onAction,
}) {
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(true);

  // Build the card's display data from the UserRecord fields
  const account = useMemo(
    () => ({
      balance: new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(user.balance ?? 0),
      currency: "ETB",
      name: `${user.first_name} ${user.last_name}`.trim(),
      masked: (() => {
        const n = String(user.account);
        if (n.length <= 5) return n;
        return `${n[0]}${"*".repeat(n.length - 5)}${n.slice(-4)}`;
      })(),
      number: user.account,
      updatedAt: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }),
    [user]
  );

  const hideScrollbar = "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-[480px] bg-[#f8f7fb] pb-44 shadow-xl">
      {/* Purple top bar */}
      <header className="flex items-center gap-3 bg-[#7a1c9e] px-5 pb-4 pt-6 text-white">
        <CircleButton label="Menu" onClick={() => onAction?.("Menu")}>
          <LayoutGrid size={22} />
        </CircleButton>

        <div className="leading-tight">
          <p className="text-sm text-white/70">Hello,</p>
          <p className="text-xl font-bold">{user.first_name}</p>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onAction?.("Language")}
            className="flex items-center gap-1 rounded-full bg-white/20 px-4 py-2.5 text-sm font-medium text-white active:bg-white/30"
          >
            {language}
            <ChevronDown size={16} />
          </button>
          <CircleButton label="Refresh" onClick={() => onAction?.("Refresh")}>
            <RefreshCw size={20} />
          </CircleButton>
          <CircleButton label="Search" onClick={() => onAction?.("Search")}>
            <Search size={20} />
          </CircleButton>
        </div>
      </header>

      {/* Single account card, sitting across the purple / light seam */}
      <div className="relative bg-[#7a1c9e]">
        <div className="absolute inset-x-0 bottom-0 h-[72px] rounded-t-[40px] bg-[#f8f7fb]" />
        <div className="relative z-10 px-5 pb-4 pt-1">
          <AccountCard
            account={account}
            bank={bank}
            hidden={hidden}
            onToggleHidden={() => setHidden((h) => !h)}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="relative mt-5">
        <div className={`flex overflow-x-auto px-5 ${hideScrollbar}`}>
          {QUICK_ACTIONS.map(({ label, icon: Glyph }) => (
            <button
              key={label}
              type="button"
              onClick={() => onAction?.(label)}
              className="flex w-[110px] shrink-0 flex-col items-center gap-2 py-1 text-center"
            >
              <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white text-[#7a1c9e] shadow-md">
                <Glyph size={26} />
              </span>
              <span className="w-[84px] text-[15px] font-medium leading-tight text-[#3a0b55]">
                {label}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="More"
          className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#7a1c9e] shadow-md"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Primary actions */}
      <div className="mt-4 grid grid-cols-2 gap-[18px] px-5">
        {PRIMARY_ACTIONS.map(({ title, sub, icon: Glyph, tone }) => (
          <button
            key={title}
            type="button"
            onClick={() =>
            title === "CBE Transfer"
              ? navigate(`/transfer/?from=${encodeURIComponent(user.userid)}&to=${encodeURIComponent(defaultReceiverId)}`)
              : onAction?.(title)
          }
            className="flex items-center gap-3 rounded-2xl bg-white px-4 py-[21px] text-left shadow-md"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}>
              <Glyph size={20} />
            </span>
            <span className="leading-tight">
              <span className="block text-[17px] font-bold text-[#3a0b55]">{title}</span>
              <span className="block text-xs text-neutral-400">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Tiles */}
      <div className="mt-5 grid grid-cols-2 gap-5 px-[27px]">
        {TILES.map(({ label, icon: Glyph }) => (
          <button
            key={label}
            type="button"
            onClick={() => onAction?.(label)}
            className="flex h-[113px] flex-col items-center justify-center gap-3 rounded-3xl bg-white shadow-md"
          >
            <Glyph size={32} className="text-[#7a1c9e]" />
            <span className="text-base font-semibold text-[#3a0b55]">{label}</span>
          </button>
        ))}
      </div>

      {/* Floating Scan QR */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[84px] z-20 mx-auto flex max-w-[480px] justify-center">
        <button
          type="button"
          onClick={onScan}
          className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-white/40 bg-[#7a1c9e] px-5 py-3 text-base font-bold text-white shadow-lg"
        >
          <ScanQrCode size={22} />
          Scan QR
        </button>
      </div>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-[480px] items-center justify-between bg-white px-5 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-[#f0e4cf] px-5 py-3 font-bold text-[#7a1c9e]"
        >
          <House size={22} />
          Home
        </button>
        <button type="button" aria-label="Branches" className="p-3 text-[#7a1c9e]">
          <Landmark size={26} />
        </button>
        <button type="button" aria-label="Settings" className="p-3 text-[#7a1c9e]">
          <Settings size={26} />
        </button>
      </nav>
    </div>
  );
}
