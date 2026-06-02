'use client';
import { Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { HSeparator } from '@/components/separator/Separator';

export function SidebarBrand() {
  const textColor = useColorModeValue('navy.700', 'white');

  return (
    <Flex alignItems="center" flexDirection="column">
      <Flex align="center" my="30px" gap="0px">
        <Text color={textColor} fontWeight="800" fontSize="22px" letterSpacing="-0.5px">
          Socratic
        </Text>
        <Text color="brand.500" fontWeight="800" fontSize="22px" letterSpacing="-0.5px" ms="5px">
          AI
        </Text>
      </Flex>
      <HSeparator mb="20px" w="284px" />
    </Flex>
  );
}

export default SidebarBrand;
