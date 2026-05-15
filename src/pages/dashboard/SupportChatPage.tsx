import { useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { faqItems, type FaqItem } from '@/data/faqData';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Briefcase,
  MessageSquare,
  History,
  Plus,
  CheckCircle,
  DollarSign,
  LayoutDashboard,
  Users,
  Settings,
  ClipboardList,
  Send,
  Loader2,
  MessageCircle,
  Mail,
} from 'lucide-react';

type DashboardRole = 'client' | 'technician' | 'admin';

type SupportChatPageProps = {
  dashboardRole: DashboardRole;
};

type ChatMessage = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  relatedQuestions?: string[];
  showEscalation?: boolean;
};

const clientNavItems = [
  { label: 'Dashboard', href: '/dashboard/client', icon: Home },
  { label: 'My Jobs', href: '/dashboard/client/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/client/bookings', icon: ClipboardList },
  { label: 'Request Service', href: '/dashboard/client/request', icon: Plus },
  { label: 'Messages', href: '/dashboard/client/messages', icon: MessageSquare },
  { label: 'History', href: '/dashboard/client/history', icon: History },
];

const technicianNavItems = [
  { label: 'Dashboard', href: '/dashboard/technician', icon: Home },
  { label: 'Available Jobs', href: '/dashboard/technician/jobs', icon: Briefcase },
  { label: 'My Jobs', href: '/dashboard/technician/my-jobs', icon: CheckCircle },
  { label: 'Messages', href: '/dashboard/technician/messages', icon: MessageSquare },
  { label: 'Earnings', href: '/dashboard/technician/earnings', icon: DollarSign },
];

const adminNavItems = [
  { label: 'Dashboard', href: '/dashboard/admin', icon: LayoutDashboard },
  { label: 'All Jobs', href: '/dashboard/admin/jobs', icon: Briefcase },
  { label: 'Bookings', href: '/dashboard/admin/bookings', icon: ClipboardList },
  { label: 'Technicians', href: '/dashboard/admin/technicians', icon: Users },
  { label: 'Support Chat', href: '/dashboard/admin/support', icon: MessageSquare },
  { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings },
];

const WHATSAPP_SUPPORT_LINK = 'https://wa.me/message/Z2GPKICB6VLAF1';
const escalationKeywords = ['talk to human', 'contact support', 'whatsapp', 'call support', 'human support'];

const stopWords = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how', 'i',
  'in', 'is', 'it', 'my', 'of', 'on', 'or', 'the', 'to', 'what', 'when', 'why',
  'with', 'you', 'your', 'can', 'do', 'does',
]);

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string) =>
  normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2 && !stopWords.has(token));

const hasEscalationIntent = (message: string) => {
  const normalizedMessage = normalizeText(message);
  return escalationKeywords.some((phrase) => normalizedMessage.includes(phrase));
};

const getNavItems = (role: DashboardRole) => {
  if (role === 'client') return clientNavItems;
  if (role === 'technician') return technicianNavItems;
  return adminNavItems;
};

const findFaqMatch = (message: string, items: FaqItem[]) => {
  const normalizedMessage = normalizeText(message);
  const messageTokens = new Set(tokenize(message));

  if (!normalizedMessage) return null;

  let bestMatch: FaqItem | null = null;
  let bestScore = 0;

  for (const item of items) {
    const questionTokens = tokenize(item.question);
    const keywords = tokenize(`${item.category} ${item.question}`);

    let keywordHits = 0;
    for (const keyword of keywords) {
      if (messageTokens.has(keyword) || normalizedMessage.includes(keyword)) {
        keywordHits += 1;
      }
    }

    const keywordScore = keywords.length > 0 ? keywordHits / keywords.length : 0;

    const questionTokenSet = new Set(questionTokens);
    let overlapHits = 0;
    for (const token of messageTokens) {
      if (questionTokenSet.has(token)) overlapHits += 1;
    }
    const overlapScore =
      questionTokenSet.size > 0 ? overlapHits / questionTokenSet.size : 0;

    const normalizedQuestion = normalizeText(item.question);
    const phraseScore =
      normalizedQuestion.includes(normalizedMessage) ||
      normalizedMessage.includes(normalizedQuestion)
        ? 1
        : 0;

    const score = Math.max(keywordScore, overlapScore, phraseScore);
    const isMatch = keywordHits > 0 || overlapScore >= 0.34 || phraseScore === 1;

    if (isMatch && score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (!bestMatch) return null;

  const relatedQuestions = items
    .filter((item) => item.category === bestMatch?.category && item.id !== bestMatch?.id)
    .slice(0, 3)
    .map((item) => item.question);

  return { bestMatch, relatedQuestions };
};

export default function SupportChatPage({ dashboardRole }: SupportChatPageProps) {
  const { role } = useAuth();
  const [input, setInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hi there. Ask me any question about bookings, quotes, payments, technicians, or your account.',
      relatedQuestions: [
        'How do I request a service?',
        'How do I accept a quote?',
        'How do I pay for a service?',
      ],
    },
  ]);

  const messageCounterRef = useRef(1);

  const navItems = useMemo(() => getNavItems(dashboardRole), [dashboardRole]);
  const layoutRole = role === 'support' ? 'support' : dashboardRole;

  const nextMessageId = (sender: 'user' | 'bot') => {
    messageCounterRef.current += 1;
    return `${sender}-${messageCounterRef.current}`;
  };

  const logUnansweredQuestion = (question: string) => {
    try {
      const storageKey = 'dia_unanswered_support_questions';
      const existing = localStorage.getItem(storageKey);
      const previous = existing ? (JSON.parse(existing) as Array<{ question: string; created_at: string }>) : [];
      const updated = [...previous, { question, created_at: new Date().toISOString() }];
      localStorage.setItem(storageKey, JSON.stringify(updated.slice(-200)));
    } catch (error) {
      console.error('APP ERROR:', error);
    }
  };

  const sendMessage = (rawMessage: string) => {
    const message = rawMessage.trim();
    if (!message || isBotTyping) return;

    const userMessage: ChatMessage = {
      id: nextMessageId('user'),
      sender: 'user',
      text: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsBotTyping(true);

    window.setTimeout(() => {
      const match = findFaqMatch(message, faqItems);
      const escalationIntent = hasEscalationIntent(message);

      let botMessage: ChatMessage;

      if (match) {
        botMessage = {
          id: nextMessageId('bot'),
          sender: 'bot',
          text: escalationIntent
            ? `${match.bestMatch.answer}\n\nWould you like to contact support directly on WhatsApp?`
            : match.bestMatch.answer,
          relatedQuestions: match.relatedQuestions,
          showEscalation: escalationIntent,
        };
      } else if (escalationIntent) {
        botMessage = {
          id: nextMessageId('bot'),
          sender: 'bot',
          text: 'Would you like to contact support directly on WhatsApp?',
          showEscalation: true,
        };
      } else {
        botMessage = {
          id: nextMessageId('bot'),
          sender: 'bot',
          text: "I couldn't find an answer. Would you like to contact support?",
          showEscalation: true,
        };
        logUnansweredQuestion(message);
      }

      setMessages((prev) => [...prev, botMessage]);
      setIsBotTyping(false);
    }, 350);
  };

  return (
    <DashboardLayout navItems={navItems} userRole={layoutRole}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Chat</h1>
          <p className="text-gray-400">
            Instant answers from the FAQ knowledge base.
          </p>
        </div>

        <Card className="bg-[#1a1a1a] border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg">Chat Assistant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-[55vh] min-h-[360px] overflow-y-auto rounded-lg border border-gray-800 bg-[#111] p-3 sm:p-4 space-y-3">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] sm:max-w-[80%] rounded-lg px-3 py-2 ${
                      message.sender === 'user'
                        ? 'bg-[#00C853] text-black'
                        : 'bg-[#2a2a2a] text-gray-200 border border-gray-700'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-line">{message.text}</p>

                    {message.relatedQuestions && message.relatedQuestions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-400">Related questions:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {message.relatedQuestions.map((question) => (
                            <Badge
                              key={`${message.id}-${question}`}
                              className="bg-[#111] text-gray-300 border border-gray-700 cursor-pointer hover:border-[#00C853]/60"
                              onClick={() => sendMessage(question)}
                            >
                              {question}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.showEscalation && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button asChild size="sm" className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold">
                          <a href={WHATSAPP_SUPPORT_LINK} target="_blank" rel="noreferrer">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Chat on WhatsApp
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="border-gray-600 text-gray-200 hover:bg-[#3a3a3a]">
                          <a href="mailto:support@doitall9ja.com?subject=Support%20Request%20from%20Chat">
                            <Mail className="mr-2 h-4 w-4" />
                            Email Support
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isBotTyping && (
                <div className="flex justify-start">
                  <div className="max-w-[92%] sm:max-w-[80%] rounded-lg px-3 py-2 bg-[#2a2a2a] text-gray-200 border border-gray-700">
                    <p className="text-sm flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-[#00C853]" />
                      Finding the best answer...
                    </p>
                  </div>
                </div>
              )}
            </div>

            <form
              className="flex flex-col sm:flex-row gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(input);
              }}
            >
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask a question..."
                className="bg-[#2a2a2a] border-gray-700 text-white placeholder:text-gray-500"
                disabled={isBotTyping}
              />
              <Button
                type="submit"
                className="bg-[#00C853] hover:bg-[#00C853]/90 text-black font-semibold sm:w-auto w-full"
                disabled={isBotTyping}
              >
                <Send className="mr-2 h-4 w-4" />
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
