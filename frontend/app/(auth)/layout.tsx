import { Brain } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-[var(--accent-mint)]/20 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[200px] h-[200px] rounded-full bg-[var(--accent-sky)]/10 blur-[60px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-memoria-scale-in">
        <div className="flex items-center justify-center gap-2.5 mb-8 group cursor-default">
          <Brain className="w-8 h-8 text-[var(--accent-forest)] transition-transform duration-300 group-hover:scale-110" />
          <span className="text-xl font-black text-foreground tracking-tight">Memoria AI</span>
        </div>
        
        <div className="memoria-card-static shadow-[var(--shadow-elevated)] p-8 sm:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
