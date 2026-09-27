'use client'

import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group/code rounded-xl overflow-hidden border border-border/60 my-3">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border/60">
        <span className="text-[11px] font-mono text-muted-foreground uppercase">{language || 'text'}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          }}
          className="text-[11px] flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{ margin: 0, background: 'transparent', fontSize: '0.8rem', padding: '0.875rem 1rem' }}
        codeTagProps={{ style: { fontFamily: 'var(--font-mono)' } }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}

export const Markdown = memo(function Markdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('prose-chat text-sm', className)}>
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !className
            if (isInline) {
              return <code className={className} {...props}>{children}</code>
            }
            return <CodeBlock language={match?.[1] ?? ''} value={String(children).replace(/\n$/, '')} />
          },
          pre({ children }) {
            return <>{children}</>
          },
          a({ href, children }) {
            return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
