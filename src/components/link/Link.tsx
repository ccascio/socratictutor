'use client';
import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import { chakra } from '@chakra-ui/react';
import { ButtonProps } from '@chakra-ui/react';

type LinkProps = ButtonProps & NextLinkProps;

const ChakraNextLink = chakra(NextLink);

function Link({ href, children, ...props }: LinkProps) {
  return (
    <ChakraNextLink href={href} {...props}>
      {children}
    </ChakraNextLink>
  );
}

export default Link;
