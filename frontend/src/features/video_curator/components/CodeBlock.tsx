import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy } from 'lucide-react'

export function CodeBlock({ inline, className, children, ...props }: any) {
  const [copied, setCopied] = useState(false)
  const match = /language-(\w+)/.exec(className || '')
  const codeString = String(children).replace(/\n$/, '')

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeString)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback if clipboard API is restricted
    }
  }

  if (!inline && (match || codeString.includes('\n'))) {
    const lang = match ? match[1].toLowerCase() : 'text'
    return (
      <div className="rounded-xl overflow-hidden border border-[#27272a] my-5 shadow-xs not-prose">
        {/* Language Badge Bar with Quick Copy */}
        <div className="bg-[#18181b] px-4 py-1.5 text-[11px] font-mono text-[#a1a1aa] border-b border-[#27272a] flex justify-between items-center select-none">
          <span className="font-semibold text-[#e4e4e7]">{lang}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[10px] font-medium text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
            title="Salin blok kode"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Salin</span>
              </>
            )}
          </button>
        </div>

        {/* VS Code Dark Syntax Highlighting */}
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={lang}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: '1rem',
            borderRadius: 0,
            background: '#121215',
            fontSize: '0.82rem',
            lineHeight: '1.6',
          }}
        >
          {codeString}
        </SyntaxHighlighter>
      </div>
    )
  }

  // Inline code snippet badge
  return (
    <code
      className="bg-[#f4f4f5] text-[#17171c] font-mono text-[11px] px-1.5 py-0.5 rounded border border-[#e4e4e7]"
      {...props}
    >
      {children}
    </code>
  )
}
