import AIChat from '@/components/modules/AIChat';

export default function CoachPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide">AI LIFE COACH</h1>
        <p className="text-xs text-muted mt-1">
          Interact with an analytical, data-driven engine optimized with your full vitals, journals, and financial ledgers.
        </p>
      </div>

      <AIChat />
    </div>
  );
}
