export function JsonViewer({ value }: { value: unknown }) {
  return (
    <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-[#1e1e2e] bg-black/50 p-3 font-mono text-xs leading-relaxed text-[#c9c6f5]">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}
