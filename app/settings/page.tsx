'use client';

import Card from '@/components/card/Card';
import ApiKeyManager from '@/components/apiKeyManager/ApiKeyManager';
import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';

export default function SettingsPage() {
  const textColor = useColorModeValue('navy.700', 'white');
  const grayColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <Flex
      w="100%"
      pt={{ base: '70px', md: '0px' }}
      direction="column"
      maxW="900px"
      mx="auto"
    >
      <Box mb="24px">
        <Text color={grayColor} fontWeight="700" fontSize="sm" mb="8px">
          Configuration
        </Text>
        <Text color={textColor} fontSize="32px" fontWeight="700">
          API Key Management
        </Text>
      </Box>
      <Card p={{ base: '24px', md: '32px' }}>
        <ApiKeyManager />
      </Card>
    </Flex>
  );
}
