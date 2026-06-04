import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

function renderMarkdown(text) {
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')

  const lines = escaped.split('\n')
  const result = []
  let inBullet = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inBullet) { result.push('</ul>'); inBullet = false }
      result.push('<br>')
      continue
    }
    if (!inBullet) { result.push('<ul>'); inBullet = true }
    result.push('<li>' + trimmed + '</li>')
  }
  if (inBullet) result.push('</ul>')

  return result.join('\n')
}

function useTypewriter(text, speed = 20) {
  const [displayed, setDisplayed] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const indexRef = useRef(0)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!text) {
      setDisplayed('')
      setIsTyping(false)
      return
    }

    setIsTyping(true)
    indexRef.current = 0
    setDisplayed('')

    const tick = () => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1))
        indexRef.current++
        timerRef.current = setTimeout(tick, speed)
      } else {
        setIsTyping(false)
      }
    }

    tick()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [text, speed])

  return { displayed, isTyping }
}

function TypewriterMessage({ content, isStreaming }) {
  const { displayed, isTyping } = useTypewriter(content, 15)
  const showCursor = isTyping || isStreaming

  if (!isTyping && content) {
    return (
      <span
        className="typewriter-text markdown"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
    )
  }

  return (
    <span className="typewriter-text">
      {displayed || (isStreaming ? '' : content)}
      {showCursor && <span className="cursor-blink">|</span>}
    </span>
  )
}

function ChatMessage({ role, content, isStreaming }) {
  const isUser = role === 'user'

  return (
    <div className={`message ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-avatar">
        {isUser ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
            <path d="M8 11c2-2 6-2 8 0"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a4 4 0 0 1 4 4v1c0 1.5-1 3-4 4-3-1-4-2.5-4-4V6a4 4 0 0 1 4-4z"/>
            <path d="M7 14c.5-1.5 2-3 5-3s4.5 1.5 5 3"/>
            <path d="M6 18c.7-1.5 2.5-3 6-3s5.3 1.5 6 3"/>
            <path d="M3 22c1-2 3.5-4 9-4s8 2 9 4"/>
            <path d="M12 13v6"/>
            <path d="M9 16h6"/>
          </svg>
        )}
      </div>
      <div className="message-content">
        <div className="message-sender">{isUser ? 'Farmer' : 'FarmChat AI'}</div>
        <div className="message-text">
          {isStreaming || (role === 'assistant' && content) ? (
            <TypewriterMessage content={content} isStreaming={isStreaming} />
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsPanel({ onClose }) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="settings-body">
          <p className="settings-hint">
            FarmChat is powered by Agronomy RAG on Hugging Face Spaces.
          </p>
        </div>
        <div className="settings-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const cancelRequest = () => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    setInput('')
    setError(null)

    const userMessage = { role: 'user', content: trimmed }
    setMessages(prev => [...prev, userMessage])

    const history = [...messages, userMessage]

    const endpoint = import.meta.env.DEV
      ? '/gradio_api/call/ask'
      : 'https://pragadeesh10-agriapp2.hf.space/gradio_api/call/ask'

    const lastMsg = history[history.length - 1]?.content || ''

    setIsLoading(true)
    setStreamingMessage('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const initRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [lastMsg] }),
        signal: controller.signal,
      })

      if (!initRes.ok) {
        const errText = await initRes.text().catch(() => '')
        throw new Error(`HTTP ${initRes.status}: ${errText || initRes.statusText}`)
      }

      const { event_id } = await initRes.json()
      if (!event_id) throw new Error('No event_id received')

      const sseRes = await fetch(endpoint + '/' + event_id, {
        signal: controller.signal,
      })

      if (!sseRes.ok) {
        throw new Error(`SSE HTTP ${sseRes.status}`)
      }

      let fullContent = ''
      const reader = sseRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            try {
              const parsed = JSON.parse(data)
              if (Array.isArray(parsed) && parsed.length > 0) {
                fullContent = parsed[0] || ''
                setStreamingMessage(fullContent)
              }
            } catch {
              if (data && data !== '[]') fullContent += data
              setStreamingMessage(fullContent)
            }
          }
        }
      }

      setStreamingMessage('')
      setMessages(prev => [...prev, { role: 'assistant', content: fullContent }])
    } catch (err) {
      if (err.name === 'AbortError') {
        if (streamingMessage) {
          setMessages(prev => [...prev, { role: 'assistant', content: streamingMessage }])
        }
        setStreamingMessage('')
        return
      }
      setError(err.message)
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
      abortRef.current = null
      setStreamingMessage('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    if (messages.length === 0) return
    setMessages([])
    setStreamingMessage('')
    setError(null)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a4 4 0 0 1 4 4v1c0 1.5-1 3-4 4-3-1-4-2.5-4-4V6a4 4 0 0 1 4-4z"/>
              <path d="M7 14c.5-1.5 2-3 5-3s4.5 1.5 5 3"/>
              <path d="M6 18c.7-1.5 2.5-3 6-3s5.3 1.5 6 3"/>
              <path d="M3 22c1-2 3.5-4 9-4s8 2 9 4"/>
              <path d="M12 13v6"/>
              <path d="M9 16h6"/>
            </svg>
          </div>
          <h1 className="header-title">FarmChat</h1>
        </div>
        <div className="header-right">
          {messages.length > 0 && (
            <button className="icon-btn" onClick={clearChat} title="Clear chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          )}
          <button className="icon-btn" onClick={() => setShowSettings(true)} title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="chat-container">
        {messages.length === 0 && !isLoading ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--leaf-accent)" strokeWidth="1.2" opacity="0.6">
                <path d="M12 2a4 4 0 0 1 4 4v1c0 1.5-1 3-4 4-3-1-4-2.5-4-4V6a4 4 0 0 1 4-4z"/>
                <path d="M7 14c.5-1.5 2-3 5-3s4.5 1.5 5 3"/>
                <path d="M6 18c.7-1.5 2.5-3 6-3s5.3 1.5 6 3"/>
                <path d="M3 22c1-2 3.5-4 9-4s8 2 9 4"/>
                <path d="M12 13v6"/>
                <path d="M9 16h6"/>
              </svg>
            </div>
            <h2>Ask about farming &amp; agriculture</h2>
            <p>Crop advice, soil tips, weather insights — your AI farming assistant is ready.</p>
            <div className="empty-hint">
              <span>
                <svg className="hint-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                Ask about crop diseases
              </span>
              <span>
                <svg className="hint-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Get soil recommendations
              </span>
              <span>
                <svg className="hint-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>
                Weather &amp; irrigation advice
              </span>
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} />
            ))}
            {streamingMessage && (
              <ChatMessage role="assistant" content={streamingMessage} isStreaming />
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {error && (
          <div className="error-bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            className="input-field"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about crops, soil, weather..."
            rows={1}
            disabled={isLoading}
          />
          {isLoading && (
            <button className="btn btn-stop" onClick={cancelRequest} title="Stop">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2"/>
              </svg>
            </button>
          )}
          <button
            className="btn btn-send"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            title="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

export default App
