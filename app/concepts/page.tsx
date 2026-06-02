'use client';

import {
  Badge, Box, Flex, Icon, Input, InputGroup, InputLeftElement,
  Spinner, Tab, TabList, TabPanel, TabPanels, Tabs, Text, VStack, useColorModeValue,
} from '@chakra-ui/react';
import { MdSearch, MdWarning } from 'react-icons/md';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/card/Card';
import { Concept, MasteryStatus, Misconception } from '@/types/learning';

const MASTERY_COLOR: Record<MasteryStatus, string> = { mastered: 'green', strong: 'blue', improving: 'yellow', weak: 'red', unknown: 'gray' };
const MASTERY_LABEL: Record<MasteryStatus, string> = { mastered: 'Mastered', strong: 'Strong', improving: 'Improving', weak: 'Weak', unknown: 'Not started' };

function ConceptCard({ concept }: { concept: Concept }) {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.50');
  const router = useRouter();
  return (
    <Card p="16px" cursor="pointer" _hover={{ bg: hoverBg }} onClick={() => router.push(`/concepts/${concept.id}`)}>
      <Flex justify="space-between" align="flex-start" mb="8px">
        <Text color={textColor} fontWeight="700" fontSize="sm" flex="1" me="8px">{concept.name}</Text>
        <Badge colorScheme={MASTERY_COLOR[concept.status]} borderRadius="full" fontSize="xs" flexShrink={0}>{MASTERY_LABEL[concept.status]}</Badge>
      </Flex>
      <Text color={subColor} fontSize="xs" lineHeight="1.6" mb="10px">{concept.simpleDefinition}</Text>
      <Flex gap="12px" wrap="wrap">
        <Text color={subColor} fontSize="xs">{concept.sessionCount} session{concept.sessionCount !== 1 ? 's' : ''}</Text>
        {concept.prerequisites.length > 0 && <Text color={subColor} fontSize="xs">Requires: {concept.prerequisites.join(', ')}</Text>}
        {concept.misconceptionCount > 0 && (
          <Flex align="center" gap="4px">
            <Icon as={MdWarning} color="orange.400" w="12px" h="12px" />
            <Text color="orange.400" fontSize="xs">{concept.misconceptionCount} misconception</Text>
          </Flex>
        )}
      </Flex>
    </Card>
  );
}

function MisconceptionCard({ m }: { m: Misconception }) {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const bg = useColorModeValue('orange.50', 'whiteAlpha.50');
  return (
    <Box bg={bg} borderRadius="12px" p="14px 16px" borderLeft="3px solid" borderColor="orange.400">
      <Flex align="center" justify="space-between" mb="8px">
        <Flex align="center" gap="6px"><Icon as={MdWarning} color="orange.400" w="14px" h="14px" /><Text color={textColor} fontSize="xs" fontWeight="700">{m.conceptName}</Text></Flex>
        <Badge colorScheme={m.status === 'unresolved' ? 'orange' : m.status === 'acknowledged' ? 'yellow' : 'green'} borderRadius="full" fontSize="xs">{m.status}</Badge>
      </Flex>
      <Text color={textColor} fontSize="xs" fontStyle="italic" mb="6px">"{m.text}"</Text>
      <Text color={subColor} fontSize="xs">→ {m.correction}</Text>
      <Text color={subColor} fontSize="xs" mt="6px">{m.goalTopic} · {m.detectedAt}</Text>
    </Box>
  );
}

export default function ConceptLibrary() {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');

  const [allConcepts, setAllConcepts] = useState<Concept[]>([]);
  const [allMisconceptions, setAllMisconceptions] = useState<Misconception[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    fetch('/api/concepts').then(r => r.json()).then(({ concepts, misconceptions }: { concepts: Concept[]; misconceptions: Misconception[] }) => {
      setAllConcepts(concepts);
      setAllMisconceptions(misconceptions);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const tabs = ['all', 'weak', 'mastered', 'review'];
    return allConcepts.filter(c => {
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.simpleDefinition.toLowerCase().includes(q) || c.goalTopic.toLowerCase().includes(q);
      const tab = tabs[tabIndex];
      const matchTab = tab === 'all' || (tab === 'weak' && (c.status === 'weak' || c.status === 'unknown')) || (tab === 'mastered' && c.status === 'mastered') || (tab === 'review' && c.misconceptionCount > 0);
      return matchSearch && matchTab;
    });
  }, [allConcepts, search, tabIndex]);

  const byGoal = useMemo(() => {
    const g: Record<string, Concept[]> = {};
    for (const c of filtered) { if (!g[c.goalTopic]) g[c.goalTopic] = []; g[c.goalTopic].push(c); }
    return g;
  }, [filtered]);

  const unresolvedMisconceptions = allMisconceptions.filter(m => m.status === 'unresolved');

  if (loading) return <Flex align="center" justify="center" minH="60vh"><Spinner color="brand.500" size="lg" /></Flex>;

  return (
    <Box w="100%" maxW="1000px">
      <Flex justify="space-between" align="center" mb="24px" wrap="wrap" gap="12px">
        <Box>
          <Text fontSize="2xl" fontWeight="700" color={textColor}>Concept Library</Text>
          <Text color={subColor} fontSize="sm">{allConcepts.length} concepts across {new Set(allConcepts.map(c => c.goalTopic)).size} goals</Text>
        </Box>
      </Flex>

      <InputGroup mb="20px">
        <InputLeftElement pointerEvents="none"><Icon as={MdSearch} color={subColor} w="18px" h="18px" /></InputLeftElement>
        <Input placeholder="Search concepts, definitions, topics..." value={search} onChange={e => setSearch(e.target.value)} borderRadius="12px" />
      </InputGroup>

      <Tabs index={tabIndex} onChange={setTabIndex} mb="24px" colorScheme="brand" variant="soft-rounded">
        <TabList gap="8px">
          <Tab borderRadius="full" fontSize="sm">All ({allConcepts.length})</Tab>
          <Tab borderRadius="full" fontSize="sm">Weak ({allConcepts.filter(c => c.status === 'weak' || c.status === 'unknown').length})</Tab>
          <Tab borderRadius="full" fontSize="sm">Mastered ({allConcepts.filter(c => c.status === 'mastered').length})</Tab>
          <Tab borderRadius="full" fontSize="sm">Review due {unresolvedMisconceptions.length > 0 && <Badge colorScheme="orange" borderRadius="full" ms="4px" fontSize="xs">{unresolvedMisconceptions.length}</Badge>}</Tab>
        </TabList>
        <TabPanels>{[0,1,2,3].map(i => <TabPanel key={i} p="0" pt="0" />)}</TabPanels>
      </Tabs>

      {Object.keys(byGoal).length === 0
        ? <Text color={subColor} fontSize="sm">No concepts match your search.</Text>
        : Object.entries(byGoal).map(([topic, concepts]) => (
          <Box key={topic} mb="28px">
            <Flex align="center" mb="14px" gap="10px"><Text color={textColor} fontWeight="700" fontSize="md">{topic}</Text><Badge colorScheme="brand" borderRadius="full">{concepts.length}</Badge></Flex>
            <VStack spacing="12px" align="stretch">{concepts.map(c => <ConceptCard key={c.id} concept={c} />)}</VStack>
          </Box>
        ))}

      {(tabIndex === 0 || tabIndex === 3) && unresolvedMisconceptions.length > 0 && (
        <Box mt="8px">
          <Flex align="center" mb="14px" gap="8px"><Text color={textColor} fontWeight="700" fontSize="md">Unresolved Misconceptions</Text><Badge colorScheme="orange" borderRadius="full">{unresolvedMisconceptions.length}</Badge></Flex>
          <VStack spacing="12px" align="stretch">{unresolvedMisconceptions.map(m => <MisconceptionCard key={m.id} m={m} />)}</VStack>
        </Box>
      )}
    </Box>
  );
}
