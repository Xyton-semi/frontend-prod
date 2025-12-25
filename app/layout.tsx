import React from 'react';
import type { Metadata } from "next";
import { Inter } from 'next/font/google'; 
import "./globals.css";
import { Providers } from './Providers';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: "XYTON Design Tool",
  description: "AI-powered analog circuit design",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        {/* Performance optimizations */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Inline critical CSS for instant smooth UI */}
        <style dangerouslySetInnerHTML={{ __html: `
          /* Force smooth fonts immediately */
          * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          }
          
          code, pre, kbd, samp {
            font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
          }
          
          .font-mono:not(code):not(pre):not(kbd):not(samp) {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          }
          
          /* Smooth scrolling */
          html {
            scroll-behavior: smooth;
          }
          
          /* GPU acceleration for performance */
          body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          
          /* Instant smooth transitions on everything */
          *, *::before, *::after {
            transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform, filter;
            transition-duration: 150ms;
            transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          /* Remove transitions for reduced motion */
          @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }
          
          /* Smooth button interactions */
          button {
            cursor: pointer;
            transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          button:hover:not(:disabled) {
            transform: translateY(-1px);
          }
          
          button:active:not(:disabled) {
            transform: translateY(0);
            transition-duration: 100ms;
          }
          
          button:disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }
          
          /* Smooth input focus */
          input:focus, textarea:focus, select:focus {
            outline: none;
            box-shadow: 0 0 0 3px rgba(64, 64, 64, 0.1);
            transform: translateY(-1px);
            transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          /* Smooth scrollbar */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
            transition: background 150ms ease;
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
          
          /* Optimize animations */
          .transform, [style*="transform"] {
            will-change: transform;
            transform: translateZ(0);
            backface-visibility: hidden;
          }
          
          /* Smooth overflow scrolling on mobile */
          .overflow-auto, .overflow-y-auto, .overflow-x-auto {
            -webkit-overflow-scrolling: touch;
          }
          
          /* Focus visible for accessibility */
          *:focus-visible {
            outline: 2px solid rgba(220, 38, 38, 0.5);
            outline-offset: 2px;
          }
        `}} />
      </head>
      <body className={`${inter.variable} antialiased h-screen w-screen overflow-hidden`}>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              var theme = prefersDark ? 'dark' : 'light';
              var html = document.documentElement;
              if (theme === 'dark') {
                html.classList.add('dark');
                html.setAttribute('data-theme','dark');
              } else {
                html.classList.remove('dark');
                html.setAttribute('data-theme','light');
              }
            } catch (e) { /* ignore */ }
          })();
        ` }} />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}