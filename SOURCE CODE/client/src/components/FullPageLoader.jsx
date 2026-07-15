import Loader3D from "./Loader3D";

export default function FullPageLoader({ label = "Loading market data" }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader3D size={80} />
      <p className="text-mute font-mono text-sm tracking-wide animate-pulseGlow">{label}…</p>
    </div>
  );
}
