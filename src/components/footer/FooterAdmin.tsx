'use client';

import { Flex, Text, useColorModeValue } from '@chakra-ui/react';

export default function Footer() {
  const textColor = useColorModeValue('gray.400', 'gray.600');
  return (
    <Flex
      zIndex="3"
      alignItems="center"
      justifyContent="center"
      px={{ base: '30px', md: '50px' }}
      pb="30px"
    >
      <Text color={textColor} fontSize="xs" fontWeight="500">
        &copy; {new Date().getFullYear()} Socratic AI
      </Text>
    </Flex>
  );
}
