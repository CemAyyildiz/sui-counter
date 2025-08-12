import React, { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';
import { getFallbackIpfsUrls } from '../constants';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  fallbackIcon?: React.ReactNode;
  onError?: () => void;
  onLoad?: () => void;
}

export function SmartImage({ 
  src, 
  alt, 
  className, 
  style, 
  fallbackIcon,
  onError,
  onLoad 
}: SmartImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);
  const [fallbackIndex, setFallbackIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Check if this is an IPFS URL
  const isIpfsUrl = src.includes('ipfs/') || src.includes('gateway.pinata.cloud');
  // Check if this is a local data URL (only for actual file uploads)
  const isLocalDataUrl = src.startsWith('data:') && !src.includes('ipfs');
  
  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
    setFallbackIndex(0);
    
    // For local data URLs (file uploads), don't show loading state as they load immediately
    // But keep loading state for IPFS URLs and other remote images
    if (isLocalDataUrl) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [src, isLocalDataUrl]);

  const handleError = () => {
    if (!isIpfsUrl) {
      setHasError(true);
      setIsLoading(false);
      onError?.();
      return;
    }

    // Try to extract IPFS hash from the URL
    const ipfsHash = src.split('ipfs/')[1]?.split('?')[0]?.split('#')[0];
    
    if (ipfsHash && fallbackIndex < getFallbackIpfsUrls(ipfsHash).length) {
      // Try next fallback gateway
      const fallbackUrls = getFallbackIpfsUrls(ipfsHash);
      const nextUrl = fallbackUrls[fallbackIndex];
      console.log(`Trying fallback gateway ${fallbackIndex + 1}: ${nextUrl}`);
      setCurrentSrc(nextUrl);
      setFallbackIndex(prev => prev + 1);
      setIsLoading(true);
    } else {
      // All fallbacks failed
      console.log('All IPFS gateways failed, showing error state');
      setHasError(true);
      setIsLoading(false);
      onError?.();
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  if (hasError) {
    return (
      <div 
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          borderRadius: '8px',
          color: '#6b7280',
          fontSize: '14px',
          textAlign: 'center',
          padding: '20px'
        }}
      >
        {fallbackIcon || <ImageIcon size={24} />}
        <div style={{ marginLeft: '8px' }}>
          <div>Image failed to load</div>
          {isIpfsUrl && (
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              IPFS gateway unavailable
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {isLoading && (
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            zIndex: 1
          }}
        >
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            Loading...
          </div>
        </div>
      )}
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        style={style}
        onError={handleError}
        onLoad={handleLoad}
      />
    </div>
  );
}
