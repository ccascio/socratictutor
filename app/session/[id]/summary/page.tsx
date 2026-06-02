'use client';

import {
  Badge, Box, Button, Divider, Flex, Grid, Icon, Spinner, Text, VStack, useColorModeValue,
} from '@chakra-ui/react';
import { MdArrowBack, MdAutoAwesome, MdCheckCircle, MdFileDownload, MdPlayArrow, MdWarning } from 'react-icons/md';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Card from '@/components/card/Card';
import { LearningArtifact, Misconception } from '@/types/learning';

export default function SessionSummary() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;

  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const misconceptionBg = useColorModeValue('orange.50', 'whiteAlpha.50');
  const summaryBg = useColorModeValue('secondaryGray.300', 'navy.700');

  const [artifact, setArtifact] = useState<LearningArtifact | null>(null);
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/sessions/${sessionId}/artifact`).then(r => r.ok ? r.json() : null),
      fetch(`/api/concepts`).then(r => r.json()),
    ]).then(([art, { misconceptions: misc }]) => {
      setArtifact(art as LearningArtifact | null);
      setMisconceptions((misc as Misconception[]).filter(m => m.sessionId === sessionId));
    }).finally(() => setLoading(false));
  }, [sessionId]);

  const handleExport = (format: string) => {
    window.open(`/api/export?session=${sessionId}&format=${format}`, '_blank');
  };

  if (loading) return <Flex align="center" justify="center" minH="60vh"><Spinner color="brand.500" size="lg" /></Flex>;

  if (!artifact) return (
    <Flex direction="column" align="center" justify="center" minH="40vh">
      <Text color={textColor} fontSize="lg" mb="16px">Session summary not available yet.</Text>
      <Button onClick={() => router.push('/')} variant="outline" borderColor="brand.500" color="brand.500" borderRadius="12px">
        Back to Dashboard
      </Button>
    </Flex>
  );

  return (
    <Box w="100%" maxW="900px">
      <Flex align="center" mb="8px" gap="12px">
        <Button variant="ghost" leftIcon={<Icon as={MdArrowBack} />} onClick={() => router.push('/')} color={subColor} size="sm">
          Dashboard
        </Button>
      </Flex>
      <Flex justify="space-between" align="flex-start" mb="28px" wrap="wrap" gap="12px">
        <Box>
          <Text color={textColor} fontSize="2xl" fontWeight="700">{artifact.goalTopic}</Text>
          <Text color={subColor} fontSize="sm">Session summary</Text>
        </Box>
        <Flex gap="10px">
          <Button variant="outline" borderColor={borderColor} color={subColor} borderRadius="12px" size="sm"
            leftIcon={<Icon as={MdFileDownload} />} onClick={() => handleExport('markdown')}>Markdown</Button>
          <Button variant="outline" borderColor={borderColor} color={subColor} borderRadius="12px" size="sm"
            leftIcon={<Icon as={MdFileDownload} />} onClick={() => handleExport('anki')}>Anki CSV</Button>
          <Button variant="outline" borderColor={borderColor} color={subColor} borderRadius="12px" size="sm"
            leftIcon={<Icon as={MdFileDownload} />} onClick={() => handleExport('json')}>JSON</Button>
        </Flex>
      </Flex>

      <Card mb="20px" bg={summaryBg}>
        <Text color={textColor} fontSize="sm" lineHeight="1.7">{artifact.summary}</Text>
      </Card>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="20px" mb="20px">
        <Card>
          <Text color={textColor} fontWeight="700" fontSize="md" mb="16px">Concepts</Text>
          <VStack spacing="10px" align="stretch">
            {artifact.mastered.map(name => (
              <Flex key={name} align="center" justify="space-between">
                <Flex align="center" gap="8px"><Icon as={MdCheckCircle} color="green.400" w="16px" h="16px" /><Text color={textColor} fontSize="sm">{name}</Text></Flex>
                <Badge colorScheme="green" borderRadius="full" fontSize="xs">mastered</Badge>
              </Flex>
            ))}
            {artifact.weak.map(name => (
              <Flex key={name} align="center" justify="space-between">
                <Flex align="center" gap="8px"><Icon as={MdAutoAwesome} color="orange.400" w="16px" h="16px" /><Text color={textColor} fontSize="sm">{name}</Text></Flex>
                <Badge colorScheme="orange" borderRadius="full" fontSize="xs">weak</Badge>
              </Flex>
            ))}
          </VStack>
        </Card>

        <Card>
          <Flex align="center" mb="16px" gap="8px">
            <Text color={textColor} fontWeight="700" fontSize="md">Misconceptions</Text>
            {misconceptions.length > 0 && <Badge colorScheme="orange" borderRadius="full">{misconceptions.length}</Badge>}
          </Flex>
          {misconceptions.length === 0
            ? <Text color={subColor} fontSize="sm">None detected this session.</Text>
            : <VStack spacing="12px" align="stretch">
              {misconceptions.map(m => (
                <Box key={m.id} bg={misconceptionBg} borderRadius="10px" p="12px" borderLeft="3px solid" borderColor="orange.400">
                  <Flex align="center" gap="6px" mb="6px">
                    <Icon as={MdWarning} color="orange.400" w="14px" h="14px" />
                    <Text color={textColor} fontSize="xs" fontWeight="700">{m.conceptName}</Text>
                    <Badge colorScheme="orange" borderRadius="full" fontSize="xs" ms="auto">{m.status}</Badge>
                  </Flex>
                  <Text color={textColor} fontSize="xs" mb="6px" fontStyle="italic">"{m.text}"</Text>
                  <Text color={subColor} fontSize="xs">→ {m.correction}</Text>
                </Box>
              ))}
            </VStack>}
        </Card>
      </Grid>

      {artifact.flashcards.length > 0 && (
        <Card mb="20px">
          <Text color={textColor} fontWeight="700" fontSize="md" mb="16px">Flashcards generated ({artifact.flashcards.length})</Text>
          <VStack spacing="0" align="stretch" divider={<Divider borderColor={borderColor} />}>
            {artifact.flashcards.map((card, i) => (
              <Box key={i} py="12px">
                <Text color={textColor} fontSize="sm" fontWeight="600" mb="4px">Q: {card.q}</Text>
                <Text color={subColor} fontSize="sm">A: {card.a}</Text>
              </Box>
            ))}
          </VStack>
        </Card>
      )}

      <Card mb="28px">
        <Text color={textColor} fontWeight="700" fontSize="md" mb="16px">Next Steps</Text>
        <Box bg="linear-gradient(15.46deg, #4A25E1 26.3%, #7B5AFF 86.4%)" borderRadius="12px" p="16px" mb="16px">
          <Text color="white" fontSize="xs" fontWeight="600" mb="4px">SUGGESTED NEXT</Text>
          <Text color="white" fontSize="sm">{artifact.suggestedNext}</Text>
        </Box>
        <VStack spacing="8px" align="stretch">
          {artifact.nextQuestions.map((q, i) => (
            <Flex key={i} align="flex-start" gap="8px">
              <Text color="brand.500" fontWeight="700" fontSize="sm" mt="1px">{i + 1}.</Text>
              <Text color={textColor} fontSize="sm">{q}</Text>
            </Flex>
          ))}
        </VStack>
      </Card>

      <Flex gap="12px" wrap="wrap">
        <Button bg="linear-gradient(15.46deg, #4A25E1 26.3%, #7B5AFF 86.4%)" color="white" borderRadius="12px"
          leftIcon={<Icon as={MdPlayArrow} />} onClick={() => router.push(`/goal/new`)}
          _hover={{ boxShadow: '0px 21px 27px -10px rgba(96,60,255,0.48)', opacity: 0.92 }}>
          Continue Learning
        </Button>
        <Button variant="outline" borderColor="brand.500" color="brand.500" borderRadius="12px" onClick={() => router.push('/concepts')}>
          View Concept Library
        </Button>
        <Button variant="ghost" color={subColor} borderRadius="12px" onClick={() => router.push('/')}>
          Back to Dashboard
        </Button>
      </Flex>
    </Box>
  );
}
