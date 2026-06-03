'use client';

import {
  Badge, Box, Button, Divider, Flex, Grid, Icon,
  Progress, Spinner, Text, VStack, useColorModeValue, useToast,
} from '@chakra-ui/react';
import { MdAdd, MdAutoAwesome, MdBolt, MdChevronRight, MdWarning } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Card from '@/components/card/Card';
import { LearningGoal, ReviewItem, Session } from '@/types/learning';

function GoalCard({ goal, onContinue }: { goal: LearningGoal; onContinue: () => void }) {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  return (
    <Card>
      <Flex direction="column" h="100%">
        <Flex align="center" mb="14px">
          <Flex borderRadius="full" justify="center" align="center"
            bg="linear-gradient(15.46deg, #4A25E1 26.3%, #7B5AFF 86.4%)"
            w="48px" h="48px" me="14px" flexShrink={0}>
            <Icon as={MdAutoAwesome} color="white" w="24px" h="24px" />
          </Flex>
          <Box flex="1" minW="0">
            <Text color={textColor} fontWeight="700" fontSize="md" noOfLines={1}>{goal.topic}</Text>
            <Text color={subColor} fontSize="xs">
              {goal.sessionCount} session{goal.sessionCount !== 1 ? 's' : ''} · {goal.weakConceptCount} weak
            </Text>
          </Box>
        </Flex>
        <Text color={subColor} fontSize="xs" mb="6px">Mastery</Text>
        <Progress value={goal.masteryPercent} size="sm" borderRadius="full" colorScheme="brand" mb="6px" />
        <Flex justify="space-between" align="center" mb="18px">
          <Text color={textColor} fontWeight="700" fontSize="sm">{goal.masteryPercent}%</Text>
          <Text color={subColor} fontSize="xs">
            Last: {goal.lastSessionAt
              ? new Date(goal.lastSessionAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'never'}
          </Text>
        </Flex>
        <Button variant="outline" size="sm" borderRadius="10px" borderColor="brand.500" color="brand.500"
          rightIcon={<Icon as={MdChevronRight} />} onClick={onContinue} mt="auto" _hover={{ bg: 'brand.100' }}>
          Continue
        </Button>
      </Flex>
    </Card>
  );
}

const REVIEW_GRADES = [
  { quality: 2, label: 'Again', colorScheme: 'red' },
  { quality: 3, label: 'Hard', colorScheme: 'orange' },
  { quality: 4, label: 'Good', colorScheme: 'green' },
  { quality: 5, label: 'Easy', colorScheme: 'blue' },
] as const;

function ReviewRow({
  item,
  isLast,
  onGrade,
  isSubmitting,
}: {
  item: ReviewItem;
  isLast: boolean;
  onGrade: (item: ReviewItem, quality: 2 | 3 | 4 | 5) => void;
  isSubmitting: boolean;
}) {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const dividerColor = useColorModeValue('gray.100', 'whiteAlpha.100');
  const iconMap = {
    misconception: { icon: MdWarning, color: 'orange.400', label: 'Misconception' },
    concept: { icon: MdAutoAwesome, color: 'blue.400', label: 'Concept' },
    flashcard: { icon: MdBolt, color: 'purple.400', label: 'Flashcard' },
  };
  const { icon, color, label } = iconMap[item.sourceType];
  return (
    <>
      <Flex align={{ base: 'stretch', md: 'center' }} py="14px" gap="12px" direction={{ base: 'column', md: 'row' }}>
        <Flex align="center" flex="1" minW="0">
          <Icon as={icon} color={color} w="18px" h="18px" me="12px" flexShrink={0} />
          <Box flex="1" minW="0">
            <Text color={textColor} fontSize="sm" fontWeight="500" noOfLines={1}>{item.label}</Text>
            <Text color={subColor} fontSize="xs">{label} · {item.goalTopic}</Text>
          </Box>
          {item.overdue && <Badge colorScheme="red" borderRadius="full" fontSize="xs" ms="8px">overdue</Badge>}
        </Flex>
        <Flex gap="6px" justify={{ base: 'flex-end', md: 'flex-start' }} flexShrink={0} wrap="wrap">
          {REVIEW_GRADES.map(grade => (
            <Button
              key={grade.quality}
              size="xs"
              variant={grade.quality === 4 ? 'solid' : 'outline'}
              colorScheme={grade.colorScheme}
              borderRadius="8px"
              minW="58px"
              onClick={() => onGrade(item, grade.quality)}
              isLoading={isSubmitting}
              isDisabled={isSubmitting}
              aria-label={`Rate ${item.label} as ${grade.label}`}
            >
              {grade.label}
            </Button>
          ))}
        </Flex>
      </Flex>
      {!isLast && <Divider borderColor={dividerColor} />}
    </>
  );
}

function SessionRow({ session, goals, onClick }: { session: Session; goals: LearningGoal[]; onClick: () => void }) {
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const goal = goals.find(g => g.id === session.goalId);
  return (
    <Card cursor="pointer" onClick={onClick} _hover={{ boxShadow: '0 4px 20px rgba(112,144,176,0.18)' }} transition="box-shadow 0.2s" p="16px 20px">
      <Flex align="center">
        <Box flex="1">
          <Text color={textColor} fontWeight="600" fontSize="sm">{session.topic}</Text>
          <Text color={subColor} fontSize="xs" mt="2px">
            {goal?.topic} · {session.durationMinutes} min · {session.conceptCount} concepts
            {session.misconceptionCount > 0 ? ` · ${session.misconceptionCount} misconception` : ''}
          </Text>
        </Box>
        <Text color={subColor} fontSize="xs" ms="12px" flexShrink={0}>
          {new Date(session.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
        <Icon as={MdChevronRight} color={subColor} ms="8px" />
      </Flex>
    </Card>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const toast = useToast();
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');

  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/goals').then(r => r.json()),
      fetch('/api/sessions').then(r => r.json()),
      fetch('/api/review').then(r => r.json()),
    ]).then(([g, s, r]) => {
      setGoals(g as LearningGoal[]);
      setSessions(s as Session[]);
      setReviewItems(r as ReviewItem[]);
    }).finally(() => setLoading(false));
  }, []);

  const overdueCount = reviewItems.filter(r => r.overdue).length;

  const handleContinueGoal = async (goalId: string) => {
    const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goalId }) });
    const { id } = await res.json() as { id: string };
    router.push(`/session/${id}`);
  };

  const handleReviewGrade = async (item: ReviewItem, quality: 2 | 3 | 4 | 5) => {
    if (reviewingId) return;
    setReviewingId(item.id);

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, quality }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || `Review update failed (${res.status})`);
      }
      setReviewItems(prev => prev.filter(review => review.id !== item.id));
      toast({
        title: 'Review scheduled',
        description: `${item.label} will come back based on your rating.`,
        status: 'success',
        position: 'top',
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Could not save review',
        description: error instanceof Error ? error.message : 'Please try again.',
        status: 'error',
        position: 'top',
        isClosable: true,
      });
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) return <Flex align="center" justify="center" minH="60vh"><Spinner color="brand.500" size="lg" /></Flex>;

  return (
    <Box w="100%" maxW="1200px">
      <Flex justify="space-between" align="center" mb="32px" wrap="wrap" gap="12px">
        <Box>
          <Text fontSize="2xl" fontWeight="700" color={textColor}>Good morning!</Text>
          <Text color={subColor} fontSize="sm">
            {overdueCount > 0 ? `${overdueCount} overdue review${overdueCount > 1 ? 's' : ''} waiting` : 'All reviews up to date'}
          </Text>
        </Box>
        <Button leftIcon={<Icon as={MdAdd} />}
          bg="linear-gradient(15.46deg, #4A25E1 26.3%, #7B5AFF 86.4%)" color="white" borderRadius="12px"
          _hover={{ boxShadow: '0px 21px 27px -10px rgba(96,60,255,0.48)', opacity: 0.92 }}
          onClick={() => router.push('/goal/new')}>
          New Goal
        </Button>
      </Flex>

      <Text fontSize="lg" fontWeight="700" color={textColor} mb="16px">Active Goals</Text>
      {goals.length === 0
        ? <Text color={subColor} fontSize="sm" mb="36px">No active goals yet. Create one to start learning.</Text>
        : <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }} gap="20px" mb="36px">
          {goals.map(g => <GoalCard key={g.id} goal={g} onContinue={() => handleContinueGoal(g.id)} />)}
        </Grid>}

      {reviewItems.length > 0 && <>
        <Flex align="center" mb="16px" gap="8px">
          <Text fontSize="lg" fontWeight="700" color={textColor}>Review Due</Text>
          <Badge colorScheme={overdueCount > 0 ? 'red' : 'gray'} borderRadius="full" px="8px">{reviewItems.length}</Badge>
        </Flex>
        <Card mb="36px" p="0px">
          <VStack spacing="0" align="stretch" px="20px">
            {reviewItems.map((item, i) => (
              <ReviewRow
                key={item.id}
                item={item}
                isLast={i === reviewItems.length - 1}
                onGrade={handleReviewGrade}
                isSubmitting={reviewingId === item.id}
              />
            ))}
          </VStack>
        </Card>
      </>}

      <Text fontSize="lg" fontWeight="700" color={textColor} mb="16px">Recent Sessions</Text>
      {sessions.length === 0
        ? <Text color={subColor} fontSize="sm">No sessions yet.</Text>
        : <VStack spacing="12px" align="stretch">
          {sessions.map(s => <SessionRow key={s.id} session={s} goals={goals} onClick={() => router.push(`/session/${s.id}/summary`)} />)}
        </VStack>}
    </Box>
  );
}
