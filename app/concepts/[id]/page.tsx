'use client';

import {
  Badge, Box, Button, Divider, Flex, Icon, Spinner, Tag, TagLabel,
  Text, VStack, Wrap, WrapItem, useColorModeValue,
} from '@chakra-ui/react';
import {
  MdArrowBack, MdCheckCircle, MdOutlineFlashOn, MdPlayArrow, MdWarning,
} from 'react-icons/md';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Card from '@/components/card/Card';
import { Concept, Misconception } from '@/types/learning';
import type { ConceptDetail } from '@/lib/repos';

const MASTERY_COLOR: Record<Concept['status'], string> = {
  mastered: 'green', strong: 'blue', improving: 'yellow', weak: 'red', unknown: 'gray',
};
const MASTERY_LABEL: Record<Concept['status'], string> = {
  mastered: 'Mastered', strong: 'Strong', improving: 'Improving', weak: 'Weak', unknown: 'Not started',
};

function MisconceptionItem({ m }: { m: Misconception }) {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const bg = useColorModeValue('orange.50', 'whiteAlpha.50');
  return (
    <Box bg={bg} borderRadius="10px" p="12px 14px" borderLeft="3px solid" borderColor="orange.400">
      <Flex align="center" justify="space-between" mb="6px">
        <Flex align="center" gap="6px">
          <Icon as={MdWarning} color="orange.400" w="13px" h="13px" />
          <Text color={textColor} fontSize="xs" fontWeight="700">{m.conceptName}</Text>
        </Flex>
        <Badge
          colorScheme={m.status === 'resolved' ? 'green' : m.status === 'acknowledged' ? 'yellow' : 'orange'}
          borderRadius="full" fontSize="xs"
        >
          {m.status}
        </Badge>
      </Flex>
      <Text color={textColor} fontSize="xs" fontStyle="italic" mb="6px">"{m.text}"</Text>
      <Text color={subColor} fontSize="xs">→ {m.correction}</Text>
      <Text color={subColor} fontSize="10px" mt="6px">{m.detectedAt}</Text>
    </Box>
  );
}

export default function ConceptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conceptId = params?.id as string;

  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const summaryBg = useColorModeValue('secondaryGray.300', 'navy.700');
  const sessionHoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  const [detail, setDetail] = useState<ConceptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/concepts/${conceptId}`)
      .then(r => { if (r.status === 404) { setNotFound(true); return null; } return r.json(); })
      .then(data => { if (data) setDetail(data as ConceptDetail); })
      .finally(() => setLoading(false));
  }, [conceptId]);

  if (loading) return <Flex align="center" justify="center" minH="60vh"><Spinner color="brand.500" size="lg" /></Flex>;

  if (notFound || !detail) return (
    <Flex direction="column" align="center" justify="center" minH="40vh" gap="16px">
      <Text color={textColor} fontSize="lg">Concept not found.</Text>
      <Button variant="outline" borderColor="brand.500" color="brand.500" borderRadius="12px"
        onClick={() => router.push('/concepts')}>Back to Library</Button>
    </Flex>
  );

  const { concept, misconceptions, sessions, relatedConcepts, flashcards } = detail;

  // Resolve prerequisite names → ids for clickable links
  const prereqMap: Record<string, string> = {};
  for (const rc of relatedConcepts) prereqMap[rc.name.toLowerCase()] = rc.id;

  const handleStartSession = async () => {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goalId: concept.goalId }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/session/${id}`);
    }
  };

  return (
    <Box w="100%" maxW="960px">
      {/* Back nav */}
      <Button variant="ghost" leftIcon={<Icon as={MdArrowBack} />} onClick={() => router.push('/concepts')}
        color={subColor} size="sm" mb="8px">
        Concept Library
      </Button>

      {/* Header */}
      <Flex justify="space-between" align="flex-start" mb="28px" wrap="wrap" gap="12px">
        <Box>
          <Flex align="center" gap="10px" mb="6px" wrap="wrap">
            <Text color={textColor} fontSize="2xl" fontWeight="700">{concept.name}</Text>
            <Badge colorScheme={MASTERY_COLOR[concept.status]} borderRadius="full" fontSize="sm" px="10px" py="2px">
              {MASTERY_LABEL[concept.status]}
            </Badge>
          </Flex>
          <Flex align="center" gap="8px" wrap="wrap">
            <Badge colorScheme="brand" variant="subtle" borderRadius="full" fontSize="xs">{concept.goalTopic}</Badge>
            <Text color={subColor} fontSize="xs">
              {concept.sessionCount} session{concept.sessionCount !== 1 ? 's' : ''}
              {concept.misconceptionCount > 0 && ` · ${concept.misconceptionCount} misconception${concept.misconceptionCount !== 1 ? 's' : ''}`}
            </Text>
          </Flex>
        </Box>
        <Button
          bg="linear-gradient(15.46deg, #4A25E1 26.3%, #7B5AFF 86.4%)"
          color="white" borderRadius="12px" size="sm"
          leftIcon={<Icon as={MdPlayArrow} />}
          onClick={handleStartSession}
          _hover={{ opacity: 0.88 }}
        >
          New Session
        </Button>
      </Flex>

      <Flex gap="20px" align="flex-start" direction={{ base: 'column', lg: 'row' }}>
        {/* ── LEFT: main content ── */}
        <Box flex="1" minW={0}>

          {/* Definition */}
          {concept.simpleDefinition && (
            <Card mb="20px" bg={summaryBg}>
              <Text color={subColor} fontSize="10px" fontWeight="700" letterSpacing="0.05em"
                textTransform="uppercase" mb="8px">Definition</Text>
              <Text color={textColor} fontSize="sm" lineHeight="1.7">{concept.simpleDefinition}</Text>
            </Card>
          )}

          {/* Misconceptions */}
          <Card mb="20px">
            <Flex align="center" gap="8px" mb={misconceptions.length > 0 ? '16px' : '0'}>
              <Text color={textColor} fontWeight="700" fontSize="md">Misconceptions</Text>
              {misconceptions.length > 0 && (
                <Badge colorScheme="orange" borderRadius="full">{misconceptions.length}</Badge>
              )}
            </Flex>
            {misconceptions.length === 0
              ? <Text color={subColor} fontSize="sm">No misconceptions recorded for this concept.</Text>
              : <VStack spacing="10px" align="stretch">
                {misconceptions.map(m => <MisconceptionItem key={m.id} m={m} />)}
              </VStack>}
          </Card>

          {/* Flashcards */}
          <Card mb="20px">
            <Flex align="center" gap="8px" mb={flashcards.length > 0 ? '16px' : '0'}>
              <Icon as={MdOutlineFlashOn} color="brand.500" w="16px" h="16px" />
              <Text color={textColor} fontWeight="700" fontSize="md">Flashcards</Text>
              {flashcards.length > 0 && (
                <Badge colorScheme="brand" borderRadius="full">{flashcards.length}</Badge>
              )}
            </Flex>
            {flashcards.length === 0
              ? <Text color={subColor} fontSize="sm">No flashcards yet — complete a session to generate them.</Text>
              : <VStack spacing="0" align="stretch" divider={<Divider borderColor={borderColor} />}>
                {flashcards.map((card, i) => (
                  <Box key={i} py="12px">
                    <Text color={textColor} fontSize="sm" fontWeight="600" mb="4px">Q: {card.q}</Text>
                    <Text color={subColor} fontSize="sm">A: {card.a}</Text>
                  </Box>
                ))}
              </VStack>}
          </Card>
        </Box>

        {/* ── RIGHT: sidebar ── */}
        <Box w={{ base: '100%', lg: '280px' }} flexShrink={0}>

          {/* Sessions */}
          <Card mb="20px">
            <Text color={textColor} fontWeight="700" fontSize="md" mb={sessions.length > 0 ? '14px' : '8px'}>
              Sessions
            </Text>
            {sessions.length === 0
              ? <Text color={subColor} fontSize="sm">Not discussed in any completed session yet.</Text>
              : <VStack spacing="0" align="stretch" divider={<Divider borderColor={borderColor} />}>
                {sessions.map(s => (
                  <Box
                    key={s.id} py="10px" cursor="pointer"
                    borderRadius="8px" px="4px" mx="-4px"
                    _hover={{ bg: sessionHoverBg }}
                    onClick={() => router.push(`/session/${s.id}/summary`)}
                  >
                    <Text color={textColor} fontSize="xs" fontWeight="600" mb="2px">
                      {new Date(s.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    {s.durationMinutes > 0 && (
                      <Text color={subColor} fontSize="10px">{s.durationMinutes} min</Text>
                    )}
                    {s.summary && (
                      <Text color={subColor} fontSize="xs" noOfLines={2} mt="4px">{s.summary}</Text>
                    )}
                  </Box>
                ))}
              </VStack>}
          </Card>

          {/* Prerequisites */}
          {concept.prerequisites.length > 0 && (
            <Card mb="20px">
              <Text color={textColor} fontWeight="700" fontSize="md" mb="12px">Prerequisites</Text>
              <Wrap spacing="8px">
                {concept.prerequisites.map(name => {
                  const targetId = prereqMap[name.toLowerCase()];
                  return (
                    <WrapItem key={name}>
                      <Tag
                        size="sm" borderRadius="full" variant="subtle" colorScheme="purple"
                        cursor={targetId ? 'pointer' : 'default'}
                        onClick={() => targetId && router.push(`/concepts/${targetId}`)}
                      >
                        <TagLabel>{name}</TagLabel>
                      </Tag>
                    </WrapItem>
                  );
                })}
              </Wrap>
            </Card>
          )}

          {/* Related concepts */}
          {relatedConcepts.length > 0 && (
            <Card>
              <Text color={textColor} fontWeight="700" fontSize="md" mb="12px">
                Related ({concept.goalTopic})
              </Text>
              <VStack spacing="6px" align="stretch">
                {relatedConcepts.slice(0, 8).map(rc => (
                  <Flex
                    key={rc.id} align="center" justify="space-between" cursor="pointer"
                    borderRadius="8px" px="6px" py="4px" mx="-6px"
                    _hover={{ bg: sessionHoverBg }}
                    onClick={() => router.push(`/concepts/${rc.id}`)}
                  >
                    <Text color={textColor} fontSize="xs" noOfLines={1} flex="1" me="8px">{rc.name}</Text>
                    <Badge colorScheme={MASTERY_COLOR[rc.status]} borderRadius="full" fontSize="10px" flexShrink={0}>
                      {MASTERY_LABEL[rc.status]}
                    </Badge>
                  </Flex>
                ))}
                {relatedConcepts.length > 8 && (
                  <Text color={subColor} fontSize="xs" mt="4px">
                    +{relatedConcepts.length - 8} more
                  </Text>
                )}
              </VStack>
            </Card>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
