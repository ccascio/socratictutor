'use client';
import { Box, Flex, Stack } from '@chakra-ui/react';
import Brand from '@/components/sidebar/components/Brand';
import Links from '@/components/sidebar/components/Links';
import SidebarGoals from '@/components/sidebar/components/SidebarGoals';
import { PropsWithChildren } from 'react';
import { IRoute } from '@/types/navigation';

interface SidebarContent extends PropsWithChildren {
  routes: IRoute[];
  [x: string]: any;
}

function SidebarContent(props: SidebarContent) {
  const { routes } = props;

  return (
    <Flex
      direction="column"
      height="100%"
      pt="20px"
      pb="26px"
      borderRadius="30px"
      maxW="285px"
      px="20px"
    >
      <Brand />
      <Stack direction="column" mb="auto" mt="8px">
        <Box ps="0px" pe={{ md: '0px', '2xl': '0px' }}>
          <Links routes={routes} />
        </Box>
        <SidebarGoals />
      </Stack>
    </Flex>
  );
}

export default SidebarContent;
