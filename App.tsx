
import React, { useState, useRef, useEffect } from 'react';
import { Message, AppStatus, GroundingSource } from './types';
import { chatWithGemini } from './services/geminiService';
import { HEADER_LOGO_URL, INTRO_BANNER_URL } from './assets';
import { Send, User, Bot, ExternalLink, ShieldCheck, Image as ImageIcon, Trash2, RotateCcw } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', image: INTRO_BANNER_URL }
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleClearChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (window.confirm('대화 내역을 모두 초기화하시겠습니까?')) {
      setMessages([{ role: 'model', image: INTRO_BANNER_URL }]);
      setStatus(AppStatus.IDLE);
      setInput('');
    }
  };

  const handleDownloadTable = async (index: number) => {
    const container = document.getElementById(`msg-container-${index}`);
    const table = container?.querySelector('table');
    if (table) {
      try {
        const dataUrl = await htmlToImage.toPng(table as HTMLElement, { backgroundColor: '#ffffff', padding: 20 });
        const link = document.createElement('a');
        link.download = `NIP-Table-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('이미지 저장 실패:', err);
      }
    }
  };

  // 마크다운 텍스트에서 표를 감싸는 헬퍼 함수
  const renderContent = (text: string, msgIdx: number) => {
    if (!text) return null;
    
    // 이 간단한 구현은 표가 포함된 텍스트를 파싱하여 컨테이너로 감쌉니다.
    const parts = text.split(/(\|.*\|(?:\r?\n\|.*\|)*)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('|')) {
        return (
          <div key={i} className="table-container relative group/table">
            <div className="overflow-x-auto">
              <table dangerouslySetInnerHTML={{ __html: convertMarkdownTableToHTML(part) }} />
            </div>
            <button 
              onClick={() => handleDownloadTable(msgIdx)}
              className="absolute top-2 right-2 opacity-0 group-hover/table:opacity-100 transition-opacity bg-white/90 border border-slate-200 p-1.5 rounded-md shadow-sm hover:bg-blue-50 hover:text-blue-600 flex items-center gap-1 text-[10px] font-bold"
              title="이미지로 저장"
            >
              <ImageIcon className="w-3 h-3" />
              이미지로 저장
            </button>
          </div>
        );
      }
      return <div key={i} dangerouslySetInnerHTML={{ __html: convertMarkdownToHTML(part) }} />;
    });
  };

  // 초간단 마크다운 변환기 (시스템 프롬프트 형식에 최적화)
  const convertMarkdownToHTML = (md: string) => {
    return md
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  const convertMarkdownTableToHTML = (tableMd: string) => {
    const rows = tableMd.trim().split('\n');
    let html = '';
    
    rows.forEach((row, i) => {
      if (row.includes('---')) return; // 구분선 무시
      const cells = row.split('|').filter(c => c.trim() !== '' || row.indexOf('|') !== -1);
      // 양 끝 빈 문자열 제거
      if (cells[0] === '') cells.shift();
      if (cells[cells.length - 1] === '') cells.pop();

      const tag = i === 0 ? 'th' : 'td';
      const rowContent = cells.map(c => `<${tag}>${c.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</${tag}>`).join('');
      
      if (i === 0) html += `<thead><tr>${rowContent}</tr></thead><tbody>`;
      else html += `<tr>${rowContent}</tr>`;
    });
    
    html += '</tbody>';
    return html;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || status === AppStatus.LOADING) return;

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const userMessage: Message = { role: 'user', text: trimmedInput };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setStatus(AppStatus.LOADING);

    const modelMessagePlaceholder: Message = { role: 'model', text: '', thought: '', isStreaming: true };
    setMessages(prev => [...prev, modelMessagePlaceholder]);

    // Construct history: Only include messages that have text.
    const history = messages
      .filter(m => m.text) 
      .concat(userMessage)
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text || '' }]
      }));

    let currentText = '';
    let currentThought = '';

    try {
      await chatWithGemini(
        history,
        (chunk) => {
          if (chunk.text) currentText += chunk.text;
          if (chunk.thought) currentThought += chunk.thought;

          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (newMessages[lastIndex]?.role === 'model') {
              newMessages[lastIndex] = { 
                ...newMessages[lastIndex], 
                text: currentText,
                thought: currentThought 
              };
            }
            return newMessages;
          });
        },
        (groundingChunks) => {
          const sources: GroundingSource[] = groundingChunks
            .map((chunk: any) => ({
              title: chunk.web?.title || '질병관리청 공식 정보',
              uri: chunk.web?.uri
            }))
            .filter((s: GroundingSource) => 
              s.uri && (s.uri.includes('kdca.go.kr') || s.uri.includes('nip.kdca.go.kr'))
            );

          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (newMessages[lastIndex]?.role === 'model') {
              newMessages[lastIndex] = { 
                ...newMessages[lastIndex], 
                isStreaming: false,
                groundingSources: sources 
              };
            }
            return newMessages;
          });
          setStatus(AppStatus.IDLE);
        },
        (error: any) => {
          if (error.name === 'AbortError') return;
          
          console.error(error);
          setStatus(AppStatus.ERROR);
          
          let errorHint = '잠시 후 다시 시도해 주세요.';
          if (error.message.includes('요청이 너무 많습니다')) {
            errorHint = '분당 질문 제한을 초과했습니다. 1분 정도 기다리거나 위쪽 [새 대화 시작] 버튼을 눌러주세요.';
          }

          setMessages(prev => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            if (newMessages[lastIndex]?.role === 'model') {
              newMessages[lastIndex] = { 
                ...newMessages[lastIndex], 
                role: 'model', 
                text: `⚠️ ${error.message}\n\n💡 **안내:** ${errorHint}`,
                isStreaming: false 
              };
            }
            return newMessages;
          });
        },
        abortControllerRef.current.signal
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatus(AppStatus.ERROR);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white border-x border-slate-200 shadow-xl overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-slate-100 p-4 flex items-center justify-between shadow-sm h-[72px]">
        <div className="flex items-center">
          {/* Header Logo Image */}
          <img 
            src={HEADER_LOGO_URL}
            alt="예방접종 오피셜 봇" 
            className="h-10 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all border border-transparent hover:border-red-100"
            title="대화 초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">새 대화 시작</span>
          </button>
          <div className="hidden sm:flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            공식 데이터 모드
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 space-y-8 bg-slate-50/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[95%] sm:max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar - Hide avatar for Image messages (Banner) to look cleaner */}
              {!msg.image && (
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === 'user' ? 'bg-slate-200' : 'bg-blue-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-5 h-5 text-slate-500" /> : <Bot className="w-5 h-5 text-white" />}
                </div>
              )}

              {/* Message Content */}
              <div id={`msg-container-${idx}`} className={`space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                
                {/* Image Message (Banner) or Text Bubble */}
                {msg.image ? (
                  <div className="overflow-hidden rounded-2xl shadow-sm border border-slate-100 bg-white">
                    <img 
                      src={msg.image} 
                      alt="안내 배너" 
                      className="w-full h-auto object-contain max-w-2xl block mx-auto"
                    />
                  </div>
                ) : (
                  <div className={`rounded-2xl px-5 py-4 shadow-sm leading-relaxed border transition-all ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white border-blue-600 rounded-tr-none' 
                      : 'bg-white text-slate-800 border-slate-200 rounded-tl-none shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]'
                  }`}>
                    <div className="markdown-body text-sm sm:text-base">
                      {/* Thought Process (Thinking) */}
                      {msg.thought && (
                        <div className="mb-4 p-3 bg-slate-50 border-l-2 border-slate-200 rounded-r-lg text-[11px] text-slate-500 italic">
                          <div className="font-bold mb-1 flex items-center gap-1 text-slate-400 uppercase tracking-tighter">
                            <Bot className="w-3 h-3" />
                            NIP 데이터 분석 프로세스
                          </div>
                          <div className="whitespace-pre-wrap opacity-80">{msg.thought}</div>
                        </div>
                      )}

                      {msg.text ? renderContent(msg.text, idx) : (msg.isStreaming && !msg.thought && (
                        <div className="flex items-center gap-1.5 py-2">
                          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                          <span className="text-xs text-slate-400 font-medium italic">NIP 데이터를 분석하고 있습니다...</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounding Sources */}
                {msg.groundingSources && msg.groundingSources.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-1">
                    {msg.groundingSources.map((source, sIdx) => (
                      <a 
                        key={sIdx}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-[10px] px-3 py-1.5 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {source.title.length > 30 ? source.title.substring(0, 30) + '...' : source.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={scrollRef} className="h-4" />
      </main>

      {/* Input Area */}
      <footer className="p-4 border-t border-slate-100 bg-white">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status === AppStatus.LOADING}
            placeholder="예방접종에 대해 질문하세요..."
            className="w-full bg-slate-100 border border-transparent rounded-2xl py-4 pl-5 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === AppStatus.LOADING || !input.trim()}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-slate-300 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-3 text-center">
          <p className="text-[10px] text-slate-400 inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-500" />
            공식 데이터 답변 중 • <strong>중요 키워드는 강조 처리</strong>됩니다.
          </p>
          <div className="text-[9px] font-bold text-red-500/70 mt-1 uppercase tracking-tighter">
            ※ 접종 전 반드시 지정 의료기관 전문의와 상담하세요.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
