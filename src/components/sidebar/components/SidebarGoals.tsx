'use client';
import {
  Box,
  Flex,
  Text,
  IconButton,
  Progress,
  Spinner,
  useColorModeValue,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { MdAdd, MdDelete, MdPlayArrow } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LearningGoal } from '@/types/learning';

export default function SidebarGoals() {
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

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

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleting(id);
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setDeleting(null);
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
                <Tooltip label="Archive goal" placement="top" hasArrow openDelay={500}>
                  <IconButton
                    aria-label="Archive goal"
                    icon={<MdDelete />}
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    isLoading={deleting === goal.id}
                    onClick={(e) => handleDelete(e, goal.id)}
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
    </Box>
  );
}
