import { useState, useRef, FormEvent, useEffect } from 'react';
import { FiSend, FiUser, FiMessageSquare } from 'react-icons/fi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessage } from '@shared/schema';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  messages: ChatMessage[];
  disabled: boolean;
}

export default function ChatInterface({
  onSendMessage,
  isLoading,
  messages,
  disabled
}: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled || isLoading) return;
    
    try {
      await onSendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  // Function to format message content with line breaks
  const formatMessage = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };
  
  return (
    <Card className="w-full h-full">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-lg text-near-navy">Refinement Chat</CardTitle>
        <CardDescription className="text-sm text-near-gray-500">
          Ask for specific changes to be made to the resume
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col h-full">
        <ScrollArea className="p-4 flex-1 max-h-80 overflow-y-auto bg-near-gray-50" ref={scrollAreaRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`flex mb-4 ${msg.isUser ? 'justify-end' : ''}`}>
              {!msg.isUser && (
                <div className="w-8 h-8 rounded-full bg-near-navy flex items-center justify-center text-white mr-3 flex-shrink-0">
                  <FiMessageSquare className="text-sm" />
                </div>
              )}
              
              <div className={`rounded-lg p-3 max-w-[85%] ${
                msg.isUser ? 'bg-near-blue text-white' : 'bg-near-gray-100 text-near-gray-800'
              }`}>
                <p>{formatMessage(msg.message)}</p>
              </div>
              
              {msg.isUser && (
                <div className="w-8 h-8 rounded-full bg-near-gray-200 flex items-center justify-center ml-3 flex-shrink-0">
                  <FiUser className="text-near-gray-500 text-sm" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex mb-4">
              <div className="w-8 h-8 rounded-full bg-near-navy flex items-center justify-center text-white mr-3 flex-shrink-0">
                <FiMessageSquare className="text-sm" />
              </div>
              <div className="bg-near-gray-100 rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-near-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-near-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-near-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
        
        <form onSubmit={handleSubmit} className="p-4 border-t border-near-gray-200">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Type your adjustments here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={disabled || isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              className="bg-near-blue text-white"
              disabled={disabled || isLoading || !message.trim()}
            >
              <FiSend />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
