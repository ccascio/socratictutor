'use client';
import { Box, Text, Link, useColorModeValue } from '@chakra-ui/react';

const STRIPE_DONATE_URL = 'https://buy.stripe.com/28EdR88lW0G28WgePZcjS01';

export default function SidebarCard() {
  const borderColor = useColorModeValue('brand.200', 'whiteAlpha.200');
  const bg = useColorModeValue('brand.50', 'whiteAlpha.50');
  const labelColor = useColorModeValue('brand.600', 'brand.300');
  const headingColor = useColorModeValue('navy.700', 'white');
  const bodyColor = useColorModeValue('gray.600', 'gray.400');
  const btnBg = useColorModeValue('brand.500', 'brand.400');
  const btnHoverBg = useColorModeValue('brand.600', 'brand.300');
  const btnColor = 'white';

  return (
    <Box
      mt="6px"
      borderRadius="16px"
      border="1px solid"
      borderColor={borderColor}
      bg={bg}
      px="16px"
      py="14px"
    >
      <Text
        fontSize="10px"
        fontWeight="700"
        letterSpacing="0.14em"
        textTransform="uppercase"
        color={labelColor}
        mb="6px"
      >
        Support SocraticTutor
      </Text>
      <Text fontSize="13px" fontWeight="700" color={headingColor} lineHeight="1.3" mb="6px">
        Enjoying it? Buy me a coffee
      </Text>
      <Text fontSize="11px" color={bodyColor} lineHeight="1.5" mb="12px">
        This app is free and open source. A small donation helps keep it actively maintained.
      </Text>
      <Link
        href={STRIPE_DONATE_URL}
        isExternal
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap="6px"
        bg={btnBg}
        color={btnColor}
        borderRadius="10px"
        py="8px"
        fontSize="12px"
        fontWeight="700"
        _hover={{ bg: btnHoverBg, textDecoration: 'none', transform: 'translateY(-1px)' }}
        _active={{ transform: 'translateY(0)' }}
        transition="all 0.15s"
      >
        Donate via Stripe
        <Box as="span" fontSize="13px">↗</Box>
      </Link>
    </Box>
  );
}
