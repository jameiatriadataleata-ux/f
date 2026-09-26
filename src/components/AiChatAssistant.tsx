import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles, User, RefreshCw, Mail, ArrowLeft, ArrowUpRight, LifeBuoy, CheckCircle } from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  text: string;
  isTransfer?: boolean;
}

interface AiChatAssistantProps {
  onSendMessage: (prompt: string, history: { role: string; text: string }[]) => Promise<{ reply: string; transferToSupport?: boolean; localSimulation?: boolean }>;
}

export const AiChatAssistant: React.FC<AiChatAssistantProps> = ({ onSendMessage }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `مرحباً بك! أنا مستشارك الرقمي المدعوم بالذكاء الاصطناعي لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة. 🌟
      
يسعدني مساعدتك في كافة الأعمال الإدارية والتطوعية. إليك بعض ما يمكنني القيام به من أجلك:
1. 📝 صياغة وكتابة مقترحات مبادرات احترافية.
2. ✉️ كتابة خطابات رسمية موجهة للشركاء أو الداعمين أو المتطوعين.
3. 📊 تحليل نسب الحضور والغياب وأداء الفرق التطوعية.
4. 🛠️ اقتراح خطط لتوزيع المتطوعين واقتراح التحسينات الرقمية.

أنا هنا لخدمتك! يمكنك كتابة طلبك أو الاختيار من النماذج السريعة بالأسفل.`
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      // Prepare history
      const history = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await onSendMessage(textToSend, history);
      
      const assistantMsg: Message = { 
        role: 'assistant', 
        text: res.reply,
        isTransfer: res.transferToSupport
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (res.transferToSupport) {
        setTransferSuccess(true);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "عذراً، حدث خطأ في معالجة طلبك حالياً. يرجى مراجعة اتصال الإنترنت الخاص بك أو إعادة المحاولة."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: "كتابة مبادرة تطوعية 📝", prompt: "اكتب لي مقترح مبادرة تنظيمية متكاملة لخدمة زوار مكة بمخطط العسيلة تشمل الأهداف، الشروط، خطة التوزيع والمهام." },
    { label: "صياغة خطاب رسمي ✉️", prompt: "اكتب خطاباً رسمياً من المدير التنفيذي لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة إلى إدارة الشراكات المجتمعية لطلب رعاية ودعم فريق الإسعافات الأولية." },
    { label: "تحليل غياب المتطوعين 📊", prompt: "قم بتحليل نسب وأسباب الغياب المتوقعة في الفعاليات التطوعية الميدانية، واقترح طرقاً ذكية لتحفيز المتطوعين على الحضور الكامل (الالتزام بالسديري والوقت)." },
    { label: "تحسين أداء الفرق 💡", prompt: "اقترح خطة عملية لتحسين التعاون والانضباط وتوزيع المهام بين المتطوعين وقادة الفرق التطوعية بالجمعية." },
    { label: "تحويل للدعم الفني 🛠️", prompt: "الرجاء تحويل محادثتنا فوراً إلى الدعم الفني لحل مشكلة تقنية معقدة في بطاقة المتطوع الذكية." }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-neutral-100 dark:border-slate-800 shadow-xs flex flex-col h-[580px]" dir="rtl">
      {/* AI Header */}
      <div className="bg-linear-to-r from-emerald-600 to-emerald-700 p-4 rounded-t-2xl flex items-center justify-between text-white shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
            <Bot className="w-5.5 h-5.5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black">مستشار ريادة العطاء الذكي</h3>
              <span className="bg-emerald-500/30 text-[8.5px] px-2 py-0.5 rounded-full font-bold border border-white/10 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                Gemini 3.5
              </span>
            </div>
            <p className="text-[9px] text-emerald-100 mt-0.5">أتمتة ذكية ومساندة إدارية شاملة للجمعية</p>
          </div>
        </div>
        <button 
          id="btn-clear-chat"
          onClick={() => {
            setMessages([
              {
                role: 'assistant',
                text: `تم بدء جلسة استشارية جديدة. كيف يمكنني خدمتك اليوم بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة؟`
              }
            ]);
            setTransferSuccess(false);
          }}
          className="text-white hover:bg-white/10 p-1.5 rounded-lg transition-all text-xs flex items-center gap-1 cursor-pointer"
          title="جلسة جديدة"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-50/50 dark:bg-slate-950/50">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'} animate-fade-in`}>
            <div className={`flex items-start gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                m.role === 'user' 
                  ? 'bg-neutral-200 dark:bg-slate-700 border-neutral-300 dark:border-slate-600 text-neutral-600 dark:text-slate-200' 
                  : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              }`}>
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Text Bubble */}
              <div className="space-y-1">
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-2xs ${
                  m.role === 'user' 
                    ? 'bg-neutral-800 dark:bg-emerald-700 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 text-neutral-800 dark:text-slate-100 rounded-tl-none border border-neutral-100 dark:border-slate-700'
                }`}>
                  {m.text}
                </div>

                {/* Technical Support Escalation Indicator */}
                {m.isTransfer && (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 rounded-xl mt-2 text-[10px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <LifeBuoy className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-spin" />
                    <div>
                      <strong className="block font-bold">جاري التحويل للدعم الفني...</strong>
                      <span>تم تسليم تفاصيل الاستفسار وسجل المحادثة بالكامل لمهندسي الدعم الفني بالجمعية. سيصلك إشعار فوري عند المعالجة دون الحاجة لإزعاج الإدارة.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-end">
            <div className="flex items-start gap-2 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl rounded-tl-none border border-neutral-100 dark:border-slate-700 text-neutral-400 dark:text-slate-400 text-xs flex items-center gap-2 shadow-2xs">
                <span>جاري معالجة طلبك وصياغة الرد الذكي...</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Action Chips */}
      <div className="p-2 bg-neutral-50 dark:bg-slate-900 border-t border-b border-neutral-100 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(qp.prompt)}
            className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 text-neutral-600 dark:text-slate-300 border border-neutral-200 dark:border-slate-700 px-3 py-1 rounded-full text-[10.5px] font-medium transition-all shadow-2xs cursor-pointer select-none"
          >
            <span>{qp.label}</span>
            <ArrowUpRight className="w-3 h-3 opacity-60" />
          </button>
        ))}
      </div>

      {/* Input box */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(inputText);
        }}
        className="p-3 bg-white dark:bg-slate-900 rounded-b-2xl flex gap-2 border-t border-neutral-100 dark:border-slate-800"
      >
        <input
          id="ai-assistant-text-input"
          type="text"
          placeholder="اسألني عن صياغة مبادرة، كتابة خطاب، أو تحليل إحصائيات..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={loading}
          className="flex-1 px-4 py-2 text-xs rounded-xl border border-neutral-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:opacity-50"
        />
        <button
          id="btn-ai-send"
          type="submit"
          disabled={!inputText.trim() || loading}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-200 dark:disabled:bg-slate-800 text-white p-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-4 h-4 rotate-180" />
        </button>
      </form>
    </div>
  );
};
