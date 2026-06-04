'use client';

import {
  Badge, Box, Button, Flex, HStack, Icon, IconButton, Input, Spinner, Text, Textarea, Tooltip, VStack, useColorModeValue, useToast,
} from '@chakra-ui/react';
import { MdAutoAwesome, MdBugReport, MdCheck, MdClose, MdContentCopy, MdDelete, MdEdit, MdExpandLess, MdExpandMore, MdPerson, MdRefresh, MdSend, MdStop } from 'react-icons/md';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/types/learning';

interface LiveConcept { name: string; status: 'confirmed' | 'learning' | 'untested' }
interface DetectedMisconception { text: string; correction: string; conceptName: string }
interface LlmTrace {
  skipped: boolean;
  reason?: string;
  sourceContextChars: number;
  retrieval: {
    query: string;
    embeddingModel: string;
    vectorChunkCount: number;
    vectorSearchRan: boolean;
    similarityThreshold: number;
    matchedChunkCount: number;
    fallbackUsed: boolean;
    sourceDocumentCount: number;
    error: string | null;
    chunks: { score: number; content: string }[];
  };
  request?: {
    model: string;
    temperature: number;
    system: string;
    prompt: string;
  };
}

const STATUS_COLOR = { confirmed: 'green', learning: 'blue', untested: 'gray' } as const;

function LlmTracePanel({ trace }: { trace: LlmTrace | null }) {
  const [showPrompts, setShowPrompts] = useState(false);
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const panelBg = useColorModeValue('white', 'navy.800');
  const codeBg = useColorModeValue('gray.50', 'whiteAlpha.100');

  return (
    <Box
      bg={panelBg}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="14px"
      p="16px"
      mb="12px"
    >
      <Flex align="center" gap="8px" mb="10px">
        <Icon as={MdBugReport} color="brand.500" />
        <Text color={textColor} fontWeight="700" fontSize="sm">LLM Trace</Text>
      </Flex>

      {!trace ? (
        <Text color={subColor} fontSize="xs">Appears after the next tutor turn.</Text>
      ) : (
        <VStack spacing="8px" align="stretch">
          <Flex justify="space-between" gap="10px">
            <Text color={subColor} fontSize="xs">Vector search</Text>
            <Badge colorScheme={trace.retrieval.vectorSearchRan ? 'green' : 'gray'} borderRadius="full" fontSize="10px">
              {trace.retrieval.vectorSearchRan ? 'ran' : 'not run'}
            </Badge>
          </Flex>
          <Flex justify="space-between" gap="10px">
            <Text color={subColor} fontSize="xs">Matched chunks</Text>
            <Text color={textColor} fontSize="xs" fontWeight="700">
              {trace.retrieval.matchedChunkCount} / {trace.retrieval.vectorChunkCount}
            </Text>
          </Flex>
          <Flex justify="space-between" gap="10px">
            <Text color={subColor} fontSize="xs">Fallback context</Text>
            <Badge colorScheme={trace.retrieval.fallbackUsed ? 'orange' : 'gray'} borderRadius="full" fontSize="10px">
              {trace.retrieval.fallbackUsed ? 'used' : 'no'}
            </Badge>
          </Flex>
          <Text color={subColor} fontSize="xs" noOfLines={2}>
            Query: {trace.retrieval.query}
          </Text>
          {trace.retrieval.error && (
            <Text color="orange.500" fontSize="xs" noOfLines={2}>
              Retrieval error: {trace.retrieval.error}
            </Text>
          )}
          {trace.skipped && (
            <Text color={subColor} fontSize="xs">{trace.reason}</Text>
          )}
          {trace.retrieval.chunks.length > 0 && (
            <VStack spacing="6px" align="stretch">
              {trace.retrieval.chunks.map((chunk, i) => (
                <Box key={i} bg={codeBg} borderRadius="8px" p="8px">
                  <Text color={textColor} fontSize="10px" fontWeight="700" mb="3px">
                    Chunk {i + 1} · score {chunk.score}
                  </Text>
                  <Text color={subColor} fontSize="10px" noOfLines={3}>
                    {chunk.content}
                  </Text>
                </Box>
              ))}
            </VStack>
          )}
          {trace.request && (
            <>
              <Button
                size="xs"
                variant="ghost"
                colorScheme="brand"
                rightIcon={<Icon as={showPrompts ? MdExpandLess : MdExpandMore} />}
                onClick={() => setShowPrompts(v => !v)}
              >
                {showPrompts ? 'Hide prompts' : 'Show prompts'}
              </Button>
              {showPrompts && (
                <VStack spacing="8px" align="stretch">
                  <Text color={subColor} fontSize="xs">
                    {trace.request.model} · temp {trace.request.temperature} · {trace.sourceContextChars} context chars
                  </Text>
                  <Text color={textColor} fontSize="10px" fontWeight="700">System</Text>
                  <Textarea value={trace.request.system} readOnly rows={7} fontSize="10px" bg={codeBg} resize="vertical" />
                  <Text color={textColor} fontSize="10px" fontWeight="700">User prompt</Text>
                  <Textarea value={trace.request.prompt} readOnly rows={7} fontSize="10px" bg={codeBg} resize="vertical" />
                </VStack>
              )}
            </>
          )}
        </VStack>
      )}
    </Box>
  );
}

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;
  const toast = useToast();

  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.400', 'gray.500');
  const bgTutor = useColorModeValue('gray.50', 'navy.700');
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const chatBg = useColorModeValue('white', 'navy.800');
  const inputBg = useColorModeValue('white', 'navy.800');
  const userAvatarBg = useColorModeValue('gray.200', 'whiteAlpha.200');
  const misconceptionBg = useColorModeValue('orange.50', 'whiteAlpha.100');
  const panelBg = useColorModeValue('white', 'navy.800');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [tutorTyping, setTutorTyping] = useState(false);
  const [liveConcepts, setLiveConcepts] = useState<LiveConcept[]>([]);
  const [misconceptions, setMisconceptions] = useState<DetectedMisconception[]>([]);
  const [llmTrace, setLlmTrace] = useState<LlmTrace | null>(null);
  const [ending, setEnding] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [messageActionId, setMessageActionId] = useState<string | null>(null);
  const [messageActionType, setMessageActionType] = useState<'delete' | 'edit' | 'regenerate' | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initializedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tutorTyping]);

  useEffect(() => {
    if (initializedSessionRef.current === sessionId) return;
    initializedSessionRef.current = sessionId;
    setMessages([]);
    setLiveConcepts([]);
    setMisconceptions([]);
    setLlmTrace(null);
    setEditingMessageId(null);
    setEditDraft('');
    setMessageActionId(null);
    setMessageActionType(null);
    setTutorTyping(true);
    fetch(`/api/sessions/${sessionId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(r => { if (!r.ok) throw new Error('chat error'); return r.json(); })
      .then((data: { tutorMessage: string; messages?: ChatMessage[]; llmTrace?: LlmTrace }) => {
        setMessages(data.messages?.length
          ? data.messages
          : [{ role: 'tutor', content: data.tutorMessage }]);
        setLlmTrace(data.llmTrace ?? null);
      })
      .catch(() => {})
      .finally(() => setTutorTyping(false));
  }, [sessionId]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || tutorTyping) return;
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    setInput('');
    setTutorTyping(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: trimmed }),
      });
      if (!res.ok) throw new Error(`chat ${res.status}`);
      const data = await res.json() as {
        tutorMessage: string;
        messages?: ChatMessage[];
        conceptsExtracted: LiveConcept[];
        misconception: DetectedMisconception | null;
        llmTrace?: LlmTrace;
      };
      setMessages(data.messages?.length
        ? data.messages
        : prev => [...prev, { role: 'tutor', content: data.tutorMessage }]);
      setLlmTrace(data.llmTrace ?? null);
      window.dispatchEvent(new Event('socratic:goals-changed'));
      setLiveConcepts(prev => {
        const updated = [...prev];
        for (const c of data.conceptsExtracted) {
          const i = updated.findIndex(x => x.name === c.name);
          if (i >= 0) updated[i] = c; else updated.push(c);
        }
        return updated;
      });
      if (data.misconception) setMisconceptions(prev => [...prev, data.misconception!]);
    } catch {
      setMessages(prev => [...prev, { role: 'tutor', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setTutorTyping(false);
    }
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      toast({ title: 'Copied', status: 'success', duration: 1400, position: 'top', isClosable: true });
    } catch {
      toast({ title: 'Copy failed', status: 'error', duration: 1800, position: 'top', isClosable: true });
    }
  };

  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (!msg.id || messageActionId) return;
    setMessageActionId(msg.id);
    setMessageActionType('delete');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages/${msg.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`delete ${res.status}`);
      const data = await res.json() as { messages: ChatMessage[] };
      setMessages(data.messages);
      setLlmTrace(null);
      if (editingMessageId === msg.id) {
        setEditingMessageId(null);
        setEditDraft('');
      }
      window.dispatchEvent(new Event('socratic:goals-changed'));
    } catch {
      toast({ title: 'Could not delete message', status: 'error', duration: 2200, position: 'top', isClosable: true });
    } finally {
      setMessageActionId(null);
      setMessageActionType(null);
    }
  };

  const beginEditMessage = (msg: ChatMessage) => {
    if (!msg.id) return;
    setEditingMessageId(msg.id);
    setEditDraft(msg.content);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditDraft('');
  };

  const handleSaveMessageEdit = async (msg: ChatMessage) => {
    const trimmed = editDraft.trim();
    if (!msg.id || !trimmed || messageActionId) return;
    if (trimmed === msg.content) {
      cancelEditMessage();
      return;
    }

    setMessageActionId(msg.id);
    setMessageActionType('edit');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) throw new Error(`edit ${res.status}`);
      const data = await res.json() as { forked: boolean; sessionId: string; messages: ChatMessage[] };
      setEditingMessageId(null);
      setEditDraft('');
      setLlmTrace(null);
      window.dispatchEvent(new Event('socratic:goals-changed'));
      if (data.forked) {
        toast({ title: 'Conversation forked', status: 'info', duration: 1800, position: 'top', isClosable: true });
        router.push(`/session/${data.sessionId}`);
      } else {
        setMessages(data.messages);
      }
    } catch {
      toast({ title: 'Could not save edit', status: 'error', duration: 2200, position: 'top', isClosable: true });
    } finally {
      setMessageActionId(null);
      setMessageActionType(null);
    }
  };

  const handleRegenerateMessage = async (msg: ChatMessage) => {
    if (!msg.id || msg.role !== 'tutor' || messageActionId) return;
    setMessageActionId(msg.id);
    setMessageActionType('regenerate');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/messages/${msg.id}/regenerate`, { method: 'POST' });
      if (!res.ok) throw new Error(`regenerate ${res.status}`);
      const data = await res.json() as {
        forked: boolean;
        sessionId: string;
        messages: ChatMessage[];
        llmTrace?: LlmTrace;
      };
      setEditingMessageId(null);
      setEditDraft('');
      setLlmTrace(data.llmTrace ?? null);
      window.dispatchEvent(new Event('socratic:goals-changed'));
      if (data.forked) {
        toast({ title: 'Conversation forked', status: 'info', duration: 1800, position: 'top', isClosable: true });
        router.push(`/session/${data.sessionId}`);
      } else {
        setMessages(data.messages);
      }
    } catch {
      toast({ title: 'Could not regenerate answer', status: 'error', duration: 2400, position: 'top', isClosable: true });
    } finally {
      setMessageActionId(null);
      setMessageActionType(null);
    }
  };

  const handleEndSession = async () => {
    setEnding(true);
    try { await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' }); } catch {}
    window.dispatchEvent(new Event('socratic:goals-changed'));
    router.push(`/session/${sessionId}/summary`);
  };

  return (
    <Box w="100%" minH={{ base: 'calc(100vh - 190px)', lg: 'calc(100vh - 180px)' }}>
      <Flex gap="20px" align="stretch" w="100%">

        {/* ── LEFT: Chat ─────────────────── */}
        <Box
          flex="1"
          minW="0"
          display="flex"
          flexDirection="column"
          h={{ base: 'calc(100vh - 210px)', lg: 'calc(100vh - 190px)' }}
          minH="560px"
        >
          {/* Messages area */}
          <Box
            bg={chatBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="16px 16px 0 0"
            overflowY="auto"
            flex="1"
            minH="0"
            p="24px"
          >
            {messages.length === 0 && !tutorTyping && (
              <Flex align="center" justify="center" h="120px">
                <Spinner color="brand.500" size="md" />
              </Flex>
            )}
            <VStack spacing="18px" align="stretch">
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                const isEditing = editingMessageId === msg.id;
                const isBusy = messageActionId === msg.id;

                return (
                  <Box key={msg.id ?? i}>
                    <Flex
                      direction={isUser ? 'row-reverse' : 'row'}
                      align="flex-end"
                      gap="10px"
                    >
                      <Flex
                        borderRadius="full"
                        justify="center"
                        align="center"
                        w="30px"
                        h="30px"
                        flexShrink={0}
                        bg={isUser
                          ? userAvatarBg
                          : 'linear-gradient(135deg, #4A25E1 0%, #7B5AFF 100%)'}
                      >
                        <Icon
                          as={isUser ? MdPerson : MdAutoAwesome}
                          color={isUser ? textColor : 'white'}
                          w="14px" h="14px"
                        />
                      </Flex>
                      <Box
                        bg={isUser
                          ? 'linear-gradient(135deg, #4A25E1 0%, #7B5AFF 100%)'
                          : bgTutor}
                        borderRadius={isUser
                          ? '16px 16px 4px 16px'
                          : '16px 16px 16px 4px'}
                        px="16px"
                        py="11px"
                        maxW="80%"
                        border={isUser ? 'none' : '1px solid'}
                        borderColor={borderColor}
                      >
                        <Text
                          color={isUser ? 'white' : textColor}
                          fontSize="sm"
                          lineHeight="1.65"
                        >
                          {msg.content}
                        </Text>
                      </Box>
                    </Flex>

                    <HStack
                      spacing="2px"
                      justify={isUser ? 'flex-end' : 'flex-start'}
                      ps={isUser ? 0 : '40px'}
                      pe={isUser ? '40px' : 0}
                      mt="4px"
                      opacity={msg.id ? 1 : 0.45}
                    >
                      <Tooltip label="Copy" placement="top" hasArrow openDelay={500}>
                        <IconButton
                          aria-label="Copy message"
                          icon={<MdContentCopy />}
                          size="xs"
                          variant="ghost"
                          color={subColor}
                          onClick={() => handleCopyMessage(msg)}
                        />
                      </Tooltip>
                      <Tooltip label="Modify" placement="top" hasArrow openDelay={500}>
                        <IconButton
                          aria-label="Modify message"
                          icon={<MdEdit />}
                          size="xs"
                          variant="ghost"
                          color={subColor}
                          isDisabled={!msg.id || tutorTyping || !!messageActionId}
                          onClick={() => beginEditMessage(msg)}
                        />
                      </Tooltip>
                      {!isUser && (
                        <Tooltip label="Regenerate answer" placement="top" hasArrow openDelay={500}>
                          <IconButton
                            aria-label="Regenerate answer"
                            icon={<MdRefresh />}
                            size="xs"
                            variant="ghost"
                            color={subColor}
                            isDisabled={!msg.id || tutorTyping || !!messageActionId}
                            isLoading={isBusy && messageActionType === 'regenerate'}
                            onClick={() => handleRegenerateMessage(msg)}
                          />
                        </Tooltip>
                      )}
                      <Tooltip label="Delete" placement="top" hasArrow openDelay={500}>
                        <IconButton
                          aria-label="Delete message"
                          icon={<MdDelete />}
                          size="xs"
                          variant="ghost"
                          color={subColor}
                          isDisabled={!msg.id || tutorTyping || !!messageActionId}
                          isLoading={isBusy && messageActionType === 'delete' && !isEditing}
                          onClick={() => handleDeleteMessage(msg)}
                        />
                      </Tooltip>
                    </HStack>

                    {isEditing && (
                      <Box
                        maxW={{ base: '100%', md: '80%' }}
                        ms={isUser ? 'auto' : '40px'}
                        me={isUser ? '40px' : 'auto'}
                        mt="8px"
                      >
                        <Textarea
                          value={editDraft}
                          onChange={e => setEditDraft(e.target.value)}
                          rows={3}
                          borderRadius="12px"
                          bg={inputBg}
                          borderColor={borderColor}
                          fontSize="sm"
                          resize="vertical"
                          autoFocus
                        />
                        <HStack justify="flex-end" mt="8px" spacing="6px">
                          <Button size="xs" variant="ghost" leftIcon={<Icon as={MdClose} />} onClick={cancelEditMessage}>
                            Cancel
                          </Button>
                          <Button
                            size="xs"
                            colorScheme="brand"
                            leftIcon={<Icon as={MdCheck} />}
                            isLoading={isBusy && messageActionType === 'edit'}
                            isDisabled={!editDraft.trim()}
                            onClick={() => handleSaveMessageEdit(msg)}
                          >
                            Save
                          </Button>
                        </HStack>
                      </Box>
                    )}
                  </Box>
                );
              })}

              {tutorTyping && (
                <Flex align="flex-end" gap="10px">
                  <Flex borderRadius="full" justify="center" align="center"
                    w="30px" h="30px" bg="linear-gradient(135deg, #4A25E1 0%, #7B5AFF 100%)" flexShrink={0}>
                    <Icon as={MdAutoAwesome} color="white" w="14px" h="14px" />
                  </Flex>
                  <Box bg={bgTutor} border="1px solid" borderColor={borderColor}
                    borderRadius="16px 16px 16px 4px" px="16px" py="11px">
                    <Flex gap="4px" align="center">
                      {[0, 1, 2].map(i => (
                        <Box key={i} w="5px" h="5px" borderRadius="full" bg="gray.300"
                          style={{ animation: `bounce ${0.6 + i * 0.15}s ease-in-out infinite alternate` }}
                        />
                      ))}
                    </Flex>
                  </Box>
                </Flex>
              )}
              <div ref={bottomRef} />
            </VStack>
          </Box>

          {/* Input bar */}
          <Box
            bg={inputBg}
            border="1px solid"
            borderTop="none"
            borderColor={borderColor}
            borderRadius="0 0 16px 16px"
            p="14px 16px"
          >
            <Flex gap="10px" align="center">
              <Input
                placeholder="Type your answer…"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                borderRadius="24px"
                isDisabled={tutorTyping}
                fontSize="sm"
                _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px #422AFB' }}
                _placeholder={{ color: subColor }}
                bg={useColorModeValue('gray.50', 'navy.700')}
                border="1px solid"
                borderColor={borderColor}
              />
              <Button
                bg="linear-gradient(135deg, #4A25E1 0%, #7B5AFF 100%)"
                color="white"
                borderRadius="full"
                w="40px"
                h="40px"
                minW="40px"
                p="0"
                onClick={handleSend}
                isDisabled={!input.trim() || tutorTyping}
                _hover={{ opacity: 0.88 }}
                flexShrink={0}
              >
                <Icon as={MdSend} w="16px" h="16px" />
              </Button>
            </Flex>
          </Box>
        </Box>

        {/* ── RIGHT: Info panel ──────────── */}
        <Box
          w="300px"
          flexShrink={0}
          display={{ base: 'none', lg: 'block' }}
          alignSelf="flex-start"
          maxH="calc(100vh - 190px)"
          overflowY="auto"
        >
          <LlmTracePanel trace={llmTrace} />

          {/* Concepts */}
          <Box
            bg={panelBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="14px"
            p="16px"
            mb="12px"
          >
            <Text color={textColor} fontWeight="700" fontSize="sm" mb="4px">Concepts</Text>
            <Text color={subColor} fontSize="xs" mb={liveConcepts.length > 0 ? '12px' : '0'}>
              {liveConcepts.length === 0 ? 'Appear as you answer' : `${liveConcepts.filter(c => c.status !== 'untested').length} / ${liveConcepts.length} explored`}
            </Text>
            {liveConcepts.length > 0 && (
              <VStack spacing="8px" align="stretch">
                {liveConcepts.map(c => (
                  <Flex key={c.name} align="center" justify="space-between" gap="6px">
                    <Text fontSize="xs" color={textColor} flex="1" noOfLines={1}>{c.name}</Text>
                    <Badge colorScheme={STATUS_COLOR[c.status]} borderRadius="full" fontSize="10px">{c.status}</Badge>
                  </Flex>
                ))}
              </VStack>
            )}
          </Box>

          {/* Misconceptions */}
          {misconceptions.length > 0 && (
            <Box
              bg={panelBg}
              border="1px solid"
              borderColor={borderColor}
              borderRadius="14px"
              p="16px"
              mb="12px"
            >
              <Flex align="center" gap="6px" mb="10px">
                <Text fontSize="sm">⚠️</Text>
                <Text color={textColor} fontWeight="700" fontSize="sm">Misconceptions</Text>
                <Badge colorScheme="orange" borderRadius="full" fontSize="10px">{misconceptions.length}</Badge>
              </Flex>
              <VStack spacing="8px" align="stretch">
                {misconceptions.map((m, i) => (
                  <Box key={i} bg={misconceptionBg} borderRadius="8px" p="8px 10px" borderLeft="3px solid" borderColor="orange.400">
                    <Text color={textColor} fontSize="xs" fontWeight="600" mb="3px" noOfLines={2}>{m.text}</Text>
                    <Text color={subColor} fontSize="xs" noOfLines={2}>→ {m.correction}</Text>
                  </Box>
                ))}
              </VStack>
            </Box>
          )}

          {/* End session */}
          <Button
            w="100%"
            variant="outline"
            borderColor="brand.500"
            color="brand.500"
            borderRadius="12px"
            size="sm"
            leftIcon={<Icon as={MdStop} />}
            onClick={handleEndSession}
            isLoading={ending}
            loadingText="Saving…"
            _hover={{ bg: 'brand.50' }}
          >
            End Session
          </Button>
        </Box>

      </Flex>

      {/* Mobile: end session below chat */}
      <Box display={{ base: 'block', lg: 'none' }} mt="14px">
        <Button w="100%" variant="outline" borderColor="brand.500" color="brand.500"
          borderRadius="12px" leftIcon={<Icon as={MdStop} />}
          onClick={handleEndSession} isLoading={ending} loadingText="Saving…">
          End Session
        </Button>
      </Box>
    </Box>
  );
}
