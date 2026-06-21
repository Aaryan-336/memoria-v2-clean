import { Brain } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Brain className="w-8 h-8 text-blue-500 dark:text-blue-400" />
          <span className="text-xl font-bold text-foreground">Memoria AI</span>
        </div>
        {children}
      </div>
    </div>
  );
}
