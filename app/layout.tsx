'use client';
import React, { ReactNode } from 'react';
import { Box, Portal, useDisclosure } from '@chakra-ui/react';
import routes from '@/routes';
import Sidebar from '@/components/sidebar/Sidebar';
import Footer from '@/components/footer/FooterAdmin';
import Navbar from '@/components/navbar/NavbarAdmin';
import GuidedTour from '@/components/onboarding/GuidedTour';
import FirstRunOnboarding from '@/components/onboarding/FirstRunOnboarding';
import { getActiveRoute, getActiveNavbar } from '@/utils/navigation';
import { usePathname } from 'next/navigation';
import '@/styles/App.css';
import AppWrappers from './AppWrappers';

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { onOpen } = useDisclosure();

  return (
    <html lang="en">
      <body id="root">
        <AppWrappers>
          {pathname?.includes('register') || pathname?.includes('sign-in') ? (
            children
          ) : (
            <Box minH="100vh">
              <Sidebar routes={routes} />
              {/* Main content — offset by sidebar width instead of float */}
              <Box
                ms={{ base: '0px', xl: '290px' }}
                pt={{ base: '60px', md: '100px' }}
                minH="100vh"
                transition="margin-left 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)"
              >
                <Portal>
                  <Box>
                    <Navbar
                      onOpen={onOpen}
                      brandText={getActiveRoute(routes, pathname)}
                      secondary={getActiveNavbar(routes, pathname)}
                    />
                  </Box>
                </Portal>
                <Box
                  mx="auto"
                  px={{ base: '16px', md: '28px' }}
                  pt="40px"
                  pb="40px"
                  minH="calc(100vh - 100px)"
                >
                  {children}
                </Box>
                <Footer />
                <FirstRunOnboarding />
                <GuidedTour />
              </Box>
            </Box>
          )}
        </AppWrappers>
      </body>
    </html>
  );
}
