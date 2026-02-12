import React from 'react';

export const highlightCode = (code: string) => {
  // This is a visual approximation, not a real parser
  const parts = code.split(/(\s+|[(){}<>=:;,\[\]])/);
  return parts.map((part, i) => {
    if (['import', 'export', 'const', 'let', 'return', 'function', 'interface', 'from', 'default'].includes(part)) return <span key={i} className="text-[#c586c0]">{part}</span>;
    if (['true', 'false', 'null', 'undefined'].includes(part)) return <span key={i} className="text-[#569cd6]">{part}</span>;
    if (part.startsWith("'") || part.startsWith('"') || part.startsWith('`')) return <span key={i} className="text-[#ce9178]">{part}</span>;
    if (/^[A-Z][a-zA-Z0-9]*$/.test(part)) return <span key={i} className="text-[#4ec9b0]">{part}</span>; // PascalCase like classes/components
    if (/^[a-z]+[A-Z][a-zA-Z]*$/.test(part) && part !== 'className') return <span key={i} className="text-[#dcdcaa]">{part}</span>; // camelCase functions
    if (part === 'className') return <span key={i} className="text-[#9cdcfe]">{part}</span>;
    if (part.startsWith('//')) return <span key={i} className="text-[#6a9955]">{part}</span>;
    // Numbers
    if (!isNaN(Number(part)) && part.trim() !== '') return <span key={i} className="text-[#b5cea8]">{part}</span>;

    return <span key={i} className="text-[#d4d4d4]">{part}</span>;
  });
};
