import { FileChange, Project, FileDiff } from '../types/ui';

export const MOCK_FILE_CHANGES: FileChange[] = [
  { path: 'app/components/CaptionCard.tsx', additions: 0, deletions: 2 },
  { path: 'app/components/PhotoStrip.tsx', additions: 33, deletions: 2 },
  { path: 'app/components/PreviewPolaroid.tsx', additions: 6, deletions: 2 },
  { path: 'app/components/PromptDialog.tsx', additions: 12, deletions: 1 },
  { path: 'app/components/ShutterStatusOverlay.tsx', additions: 7, deletions: 1 },
  { path: 'app/components/SnapButton.tsx', additions: 17, deletions: 19 },
  { path: 'app/globals.css', additions: 33, deletions: 12 },
  { path: 'app/layout.tsx', additions: 38, deletions: 6 },
  { path: 'app/page.tsx', additions: 58, deletions: 7 },
];

export const MOCK_PROJECTS: Project[] = [
  {
    name: 'shoo',
    isOpen: true,
    threads: [
      { id: '1', title: 'Audit Shoo codebase for security', time: '1m', active: true, status: 'loading' },
      { id: '2', title: 'Fix dev command error', time: '2h' },
      { id: '3', title: 'Audit entire codebase', time: '3h' },
      { id: '4', title: 'Audit Shoo codebase for risks', time: '3h' },
      { id: '5', title: 'Explain Convex user updates', time: '14h', meta: '+27 -1' },
      { id: '6', title: 'Configure Prettier and React...', time: '19h' },
      { id: '7', title: 'Fix missing Convex install', time: '18h' },
      { id: '8', title: 'Simplify basic auth example', time: '1d' },
      { id: '9', title: 'Add dashboard service view', time: '1d' },
      { id: '10', title: 'Add CI and minimal tests', time: '1d' },
    ]
  },
  {
    name: 'lawn',
    isOpen: false,
    threads: [
      { id: '11', title: 'app', time: '2d' },
      { id: '12', title: 'Add tasteful dark mode', time: '3d' },
    ]
  }
];

export const MOCK_ROUTE_FILE: FileDiff = {
  path: 'app/api/generate/route.ts',
  lines: [
    { lineNum: 260, content: '', type: 'normal' },
    { lineNum: 261, content: '    const captionPromise = client.responses', type: 'normal' },
    { lineNum: 262, content: '      .create({', type: 'normal' },
    { lineNum: 263, content: '        model: "gpt-4-vision",', type: 'remove' },
    { lineNum: 263, content: '        model: "gpt-4o",', type: 'add' },
    { lineNum: 264, content: '      })', type: 'normal' },
    { lineNum: 265, content: '', type: 'normal' },
    { lineNum: 266, content: '    const instructions:', type: 'normal' },
    { lineNum: 267, content: '      "write a short polaroid caption as if someone labeled it with a sharpie"', type: 'normal' },
    { lineNum: 268, content: '      input: prompt,', type: 'normal' },
  ]
};

export const MOCK_EFFECTS_FILE: FileDiff = {
  path: 'app/components/BackgroundEffects.tsx',
  lines: [
    { lineNum: 1, content: 'export function BackgroundEffects() {', type: 'normal' },
    { lineNum: 2, content: '  return (', type: 'normal' },
    { lineNum: 3, content: '    <div className="pointer-events-none absolute inset-0">', type: 'normal' },
    { lineNum: 4, content: '      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.4)_100%)]" />', type: 'add' },
    { lineNum: 5, content: '      <div className="absolute inset-0 opacity-[0.15] mix-blend-soft-light bg-noise" />', type: 'normal' },
    { lineNum: 6, content: '      <div className="absolute inset-0 opacity-[0.55] mix-blend-overlay [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />', type: 'normal' },
    { lineNum: 7, content: '      <div className="absolute inset-0 opacity-[0.35] [background:radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />', type: 'normal' },
    { lineNum: 8, content: '      <div className="absolute inset-0 bg-radial-gradient [mask-image:url(/noise.png)]" />', type: 'remove' },
    { lineNum: 9, content: '      <div className="absolute -top-10 left-1/2 h-[420px] w-[760px] -translate-x-1/2 bg-emerald-500/10 blur-[120px]" />', type: 'add' },
    { lineNum: 10, content: '    </div>', type: 'normal' },
    { lineNum: 11, content: '  );', type: 'normal' },
    { lineNum: 12, content: '}', type: 'normal' },
  ]
};

export const MOCK_TOP_PANEL_FILE: FileDiff = {
  path: 'app/components/BoothTopPanel.tsx',
  lines: [
    { lineNum: 1, content: 'type BoothTopPanelProps = {', type: 'normal' },
    { lineNum: 2, content: '  isGenerating: boolean;', type: 'normal' },
    { lineNum: 3, content: '  hasPhotos: boolean;', type: 'normal' },
    { lineNum: 4, content: '};', type: 'normal' },
    { lineNum: 5, content: '', type: 'normal' },
    { lineNum: 6, content: 'export function BoothTopPanel({ isGenerating, hasPhotos }: BoothTopPanelProps) {', type: 'normal' },
    { lineNum: 7, content: '  return (', type: 'normal' },
    { lineNum: 8, content: '    <div className="mb-7 mt-10 flex items-center justify-between rounded-[30px] border border-white/10 bg-black/40 px-6 py-4 backdrop-blur-md">', type: 'add' },
    { lineNum: 9, content: '      <div className="flex items-center gap-3.5">', type: 'normal' },
    { lineNum: 10, content: '        <div', type: 'normal' },
    { lineNum: 11, content: '          className={`h-3 w-3 rounded-full border border-black/50 shadow-[0_0_10px_rgba(0,255,0,0.5)] transition-colors duration-500 ${', type: 'normal' },
    { lineNum: 12, content: '            isGenerating ? "bg-red-400" : hasPhotos ? "bg-emerald-400" : "bg-zinc-600"', type: 'normal' },
    { lineNum: 13, content: '          }`}', type: 'normal' },
    { lineNum: 14, content: '        />', type: 'normal' },
    { lineNum: 15, content: '        <span className="h-3 w-3 rounded-full border border-black/50 bg-amber-400 shadow-sm" />', type: 'normal' },
    { lineNum: 16, content: '        <span className="h-3 w-3 rounded-full border border-black/50 bg-white shadow-sm" />', type: 'normal' },
    { lineNum: 17, content: '      </div>', type: 'normal' },
    { lineNum: 18, content: '', type: 'normal' },
    { lineNum: 19, content: '      <div className="relative h-[20px] w-[70px] rounded-full border border-white/10 bg-black/50">', type: 'normal' },
    { lineNum: 20, content: '        <div className="absolute inset-0 bg-noise opacity-20" />', type: 'remove' },
  ]
};
