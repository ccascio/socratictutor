'use client';

import {
  Badge, Box, Button, Flex, Icon, Input, Spinner, Text, VStack, useColorModeValue,
} from '@chakra-ui/react';
import { MdAutoAwesome, MdPerson, MdSend, MdStop } from 'react-icons/md';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/types/learning';

interface LiveConcept { name: string; status: 'confirmed' | 'learning' | 'untested' }
interface DetectedMisconception { text: string; correction: string; conceptName: string }

const STATUS_COLOR = { confirmed: 'green', learning: 'blue', untested: 'gray' } as const;

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

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
  const [ending, setEnding] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tutorTyping]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    setTutorTyping(true);
    fetch(`/api/sessions/${sessionId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
      .then(r => { if (!r.ok) throw new Error('chat error'); return r.json(); })
      .then((data: { tutorMessage: string; messages?: ChatMessage[] }) => {
        setMessages(data.messages?.length
          ? data.messages
          : [{ role: 'tutor', content: data.tutorMessage }]);
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
        conceptsExtracted: LiveConcept[];
        misconception: DetectedMisconception | null;
      };
      setMessages(prev => [...prev, { role: 'tutor', content: data.tutorMessage }]);
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

  const handleEndSession = async () => {
    setEnding(true);
    try { await fetch(`/api/sessions/${sessionId}/end`, { method: 'POST' }); } catch {}
    router.push(`/session/${sessionId}/summary`);
  };

  return (
    <Box w="100%">
      <Flex gap="20px" align="flex-start" w="100%">

        {/* ── LEFT: Chat ─────────────────── */}
        <Box flex="1" minW="0">
          {/* Messages area */}
          <Box
            bg={chatBg}
            border="1px solid"
            borderColor={borderColor}
            borderRadius="16px 16px 0 0"
            overflowY="auto"
            minH="420px"
            maxH="520px"
            p="24px"
          >
            {messages.length === 0 && !tutorTyping && (
              <Flex align="center" justify="center" h="120px">
                <Spinner color="brand.500" size="md" />
              </Flex>
            )}
            <VStack spacing="18px" align="stretch">
              {messages.map((msg, i) => (
                <Flex
                  key={i}
                  direction={msg.role === 'user' ? 'row-reverse' : 'row'}
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
                    bg={msg.role === 'tutor'
                      ? 'linear-gradient(135deg, #4A25E1 0%, #7B5AFF 100%)'
                      : userAvatarBg}
                  >
                    <Icon
                      as={msg.role === 'tutor' ? MdAutoAwesome : MdPerson}
                      color={msg.role === 'tutor' ? 'white' : textColor}
                      w="14px" h="14px"
                    />
                  </Flex>
                  <Box
                    bg={msg.role === 'tutor'
                      ? bgTutor
                      : 'linear-gradient(135deg, #4A25E1 0%, #7B5AFF 100%)'}
                    borderRadius={msg.role === 'tutor'
                      ? '16px 16px 16px 4px'
                      : '16px 16px 4px 16px'}
                    px="16px"
                    py="11px"
                    maxW="80%"
                    border={msg.role === 'tutor' ? '1px solid' : 'none'}
                    borderColor={borderColor}
                  >
                    <Text
                      color={msg.role === 'tutor' ? textColor : 'white'}
                      fontSize="sm"
                      lineHeight="1.65"
                    >
                      {msg.content}
                    </Text>
                  </Box>
                </Flex>
              ))}

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
          w="220px"
          flexShrink={0}
          display={{ base: 'none', lg: 'block' }}
        >
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
