'use client';
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  Box,
  Button,
  Flex,
  Text,
  IconButton,
  Progress,
  Spinner,
  useColorModeValue,
  Tooltip,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { MdAdd, MdDelete, MdPlayArrow } from 'react-icons/md';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LearningGoal } from '@/types/learning';

export default function SidebarGoals() {
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<LearningGoal | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const labelColor = useColorModeValue('gray.400', 'gray.500');
  const textColor = useColorModeValue('navy.700', 'white');
  const subColor = useColorModeValue('gray.500', 'gray.400');
  const hoverBg = useColorModeValue('gray.50', 'whiteAlpha.100');
  const borderColor = useColorModeValue('gray.100', 'whiteAlpha.200');

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch('/api/goals');
      if (res.ok) setGoals(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals, pathname]);

  useEffect(() => {
    const refresh = () => { void fetchGoals(); };
    window.addEventListener('focus', refresh);
    window.addEventListener('socratic:goals-changed', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('socratic:goals-changed', refresh);
    };
  }, [fetchGoals]);

  const closeDeleteDialog = () => {
    if (deleting) return;
    onClose();
    setGoalToDelete(null);
  };

  const requestDelete = (e: React.MouseEvent, goal: LearningGoal) => {
    e.stopPropagation();
    setGoalToDelete(goal);
    onOpen();
  };

  const handleDelete = async () => {
    if (!goalToDelete) return;
    setDeleting(goalToDelete.id);
    try {
      const res = await fetch(`/api/goals/${goalToDelete.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`delete ${res.status}`);
      const data = await res.json() as {
        deleted?: {
          sessions: number;
          artifacts: number;
          documentChunkEmbeddings: number;
          conceptEmbeddings: number;
          messageEmbeddings: number;
          semanticSearchEmbeddings: number;
        };
      };
      setGoals((prev) => prev.filter((g) => g.id !== goalToDelete.id));
      window.dispatchEvent(new Event('socratic:goals-changed'));
      toast({
        title: 'Goal deleted',
        description: data.deleted
          ? `${data.deleted.sessions} sessions, ${data.deleted.artifacts} artifacts, and ${data.deleted.documentChunkEmbeddings + data.deleted.conceptEmbeddings + data.deleted.messageEmbeddings + data.deleted.semanticSearchEmbeddings} embeddings/cache rows removed.`
          : undefined,
        status: 'success',
        duration: 2800,
        position: 'top',
        isClosable: true,
      });
      onClose();
      setGoalToDelete(null);
    } catch {
      toast({
        title: 'Could not delete goal',
        status: 'error',
        duration: 2400,
        position: 'top',
        isClosable: true,
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleResume = async (e: React.MouseEvent, goalId: string) => {
    e.stopPropagation();
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goalId }),
    });
    if (res.ok) {
      const { id } = await res.json();
      window.dispatchEvent(new Event('socratic:goals-changed'));
      router.push(`/session/${id}`);
    }
  };

  if (loading) {
    return (
      <Flex justify="center" py="12px">
        <Spinner size="xs" color={labelColor} />
      </Flex>
    );
  }

  return (
    <Box mt="24px" px="17px">
      <Flex align="center" justify="space-between" mb="10px">
        <Text
          fontSize="10px"
          fontWeight="700"
          letterSpacing="0.05em"
          textTransform="uppercase"
          color={labelColor}
        >
          Active Goals
        </Text>
        <Tooltip label="New goal" placement="top" hasArrow openDelay={500}>
          <IconButton
            aria-label="New goal"
            icon={<MdAdd />}
            size="xs"
            variant="ghost"
            colorScheme="brand"
            onClick={() => router.push('/goal/new')}
          />
        </Tooltip>
      </Flex>
      {goals.length === 0 && (
        <Text fontSize="10px" color={subColor}>
          No active goals yet.
        </Text>
      )}
      <VStack spacing="4px" align="stretch">
        {goals.map((goal) => (
          <Box
            key={goal.id}
            borderRadius="8px"
            border="1px solid"
            borderColor={borderColor}
            px="10px"
            py="8px"
            _hover={{ bg: hoverBg }}
            transition="background 0.15s"
          >
            <Flex align="flex-start" justify="space-between" gap="4px">
              <Box flex="1" minW={0}>
                <Text
                  fontSize="xs"
                  fontWeight="600"
                  color={textColor}
                  noOfLines={1}
                  title={goal.topic}
                >
                  {goal.topic}
                </Text>
                <Text fontSize="10px" color={subColor} mt="1px">
                  {goal.sessionCount} session{goal.sessionCount !== 1 ? 's' : ''}
                  {goal.weakConceptCount > 0 && ` · ${goal.weakConceptCount} to review`}
                </Text>
              </Box>
              <Flex gap="2px" shrink={0}>
                <Tooltip label="New session" placement="top" hasArrow openDelay={500}>
                  <IconButton
                    aria-label="Start session"
                    icon={<MdPlayArrow />}
                    size="xs"
                    variant="ghost"
                    colorScheme="brand"
                    onClick={(e) => handleResume(e, goal.id)}
                  />
                </Tooltip>
                <Tooltip label="Delete goal" placement="top" hasArrow openDelay={500}>
                  <IconButton
                    aria-label="Delete goal"
                    icon={<MdDelete />}
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    isLoading={deleting === goal.id}
                    onClick={(e) => requestDelete(e, goal)}
                  />
                </Tooltip>
              </Flex>
            </Flex>
            <Progress
              value={goal.masteryPercent}
              size="xs"
              colorScheme="brand"
              borderRadius="full"
              mt="6px"
              bg={borderColor}
            />
          </Box>
        ))}
      </VStack>
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={closeDeleteDialog}
        isCentered
      >
        <AlertDialogOverlay />
        <AlertDialogContent borderRadius="16px">
          <AlertDialogHeader fontSize="md" fontWeight="700">
            Delete this goal?
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text fontSize="sm" color={textColor} mb="8px" fontWeight="600">
              {goalToDelete?.topic}
            </Text>
            <Text fontSize="sm" color={subColor}>
              This permanently removes the goal, its sessions, messages, summaries/artifacts, review items, uploaded reference documents, document chunk embeddings, concept/message embeddings, and semantic search cache rows.
            </Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} variant="ghost" onClick={closeDeleteDialog} isDisabled={!!deleting}>
              Cancel
            </Button>
            <Button colorScheme="red" onClick={handleDelete} isLoading={!!deleting} ml={3}>
              Delete goal
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Box>
  );
}
