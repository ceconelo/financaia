'use client';

import dynamic from 'next/dynamic';

const ChatInterface = dynamic(() => import('@/components/ChatInterface'), {
  ssr: false,
  loading: () => <div className="container mx-auto p-8 text-center">Carregando chat...</div>
});

export default function ChatPage() {
  return <ChatInterface />;
}
