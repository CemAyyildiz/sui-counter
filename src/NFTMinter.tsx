import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Flex, Heading, Text, TextField, TextArea, Card, Box } from "@radix-ui/themes";
import { Upload, Image as ImageIcon, Loader2, CheckCircle, AlertCircle, Palette } from "lucide-react";
import { useNetworkVariable } from "./networkConfig";
import { getWorkingIpfsUrl } from "./constants";
import ClipLoader from "react-spinners/ClipLoader";
import { SmartImage } from "./components/SmartImage";

interface NFTMinterProps {
  onMinted?: (nftId: string) => void;
}

export function NFTMinter({ onMinted }: NFTMinterProps) {
  const currentAccount = useCurrentAccount();
  const counterPackageId = useNetworkVariable("counterPackageId");
  const collectionId = useNetworkVariable("collectionId");
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pixelatedPreview, setPixelatedPreview] = useState<string | null>(null);
  const [nftName, setNftName] = useState("");
  const [nftDescription, setNftDescription] = useState("");
  const [isPixelating, setIsPixelating] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [pixelStatus, setPixelStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [pixelatedImageHash, setPixelatedImageHash] = useState<string>("");
  const [originalImageHash, setOriginalImageHash] = useState<string>("");
  const [pixelSize] = useState(64); // Sabit 64x64 pixel boyutu
  const [mintMode, setMintMode] = useState<'original' | 'pixelated'>('original');
  const [uploadMode, setUploadMode] = useState<'select' | 'file' | 'url'>('select');
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isUrlLoading, setIsUrlLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
        setPixelatedPreview(null);
        setPixelStatus('idle');
        setPixelatedImageHash("");
        setOriginalImageHash("");
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const uploadToIPFS = useCallback(async (file: File, isPixelated: boolean = false): Promise<string> => {
    try {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          if (isPixelated) {
            // Pixel art için küçük boyut
            const currentPixelSize = pixelSize;
            const pixelWidth = currentPixelSize;
            const pixelHeight = currentPixelSize;
            
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
            
            // Görseli canvas'a çiz ve pixel art efekti uygula
            ctx.imageSmoothingEnabled = false; // Pixel art için smooth'u kapat
            ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
            
            // Şimdi büyük boyutta göster (pixel'ları belirgin yap)
            const displayCanvas = document.createElement('canvas');
            const displayCtx = displayCanvas.getContext('2d');
            
            if (!displayCtx) {
              reject(new Error('Display canvas context not available'));
              return;
            }
            
            // Display canvas'ı büyük yap (pixel'ları görmek için)
            const displaySize = 128; // 16KB limit için optimize
            displayCanvas.width = displaySize;
            displayCanvas.height = displaySize;
            
            // Smooth'u kapat ve pixel art'ı büyüt
            displayCtx.imageSmoothingEnabled = false;
            displayCtx.drawImage(canvas, 0, 0, displaySize, displaySize);
            
            // Canvas'ı blob'a çevir ve IPFS'e yükle
            displayCanvas.toBlob(async (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }
              await uploadBlobToIPFS(blob, `pixel-art-${pixelSize}x${pixelSize}.png`, resolve, reject);
            }, 'image/png', 0.9);
          } else {
            // Orijinal resim için - kaliteli şekilde
            const maxSize = 1024; // Maksimum boyut
            let { width, height } = img;
            
            // Aspect ratio'yu koru
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height * maxSize) / width;
                width = maxSize;
              } else {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Yüksek kalitede çiz
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
            
            // Canvas'ı blob'a çevir ve IPFS'e yükle
            canvas.toBlob(async (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }
              await uploadBlobToIPFS(blob, `original-${file.name}`, resolve, reject);
            }, 'image/jpeg', 0.95); // Yüksek kalite JPEG
          }
        };
        
        img.onerror = () => reject(new Error('Görsel yüklenemedi'));
        img.src = URL.createObjectURL(file);
      });
    } catch (error) {
      throw error;
    }
  }, [pixelSize]);

  const uploadBlobToIPFS = async (blob: Blob, filename: string, resolve: (value: string) => void, reject: (reason?: any) => void) => {
    try {
      const formData = new FormData();
      formData.append('file', blob, filename);
      
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT || 'YOUR_PINATA_JWT_TOKEN'}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Pinata upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      resolve(result.IpfsHash);
    } catch (error) {
      console.error('IPFS upload error:', error);
      reject(error);
    }
  };

  const createPixelArt = useCallback(async (file: File): Promise<string> => {
    setIsPixelating(true);
    try {
      return await uploadToIPFS(file, true);
    } catch (error) {
      throw error;
    } finally {
      setIsPixelating(false);
    }
  }, [uploadToIPFS]);

  const uploadOriginalImage = useCallback(async (file: File): Promise<string> => {
    try {
      return await uploadToIPFS(file, false);
    } catch (error) {
      throw error;
    }
  }, [uploadToIPFS]);

  const loadImageFromUrl = useCallback(async (url: string): Promise<File> => {
    setIsUrlLoading(true);
    
    try {
      console.log(`🔄 Attempting to load image from: ${url}`);
      
      // Sadece direkt URL'yi dene (proxy olmadan)
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*;q=0.8',
        },
        mode: 'cors' // CORS'u dene
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      
      // Dosya boyutunu kontrol et
      if (blob.size === 0) {
        throw new Error('Image file is empty (0 bytes)');
      }
      
      // Resim formatını kontrol et
      if (!blob.type.startsWith('image/')) {
        throw new Error('URL does not point to a valid image');
      }
      
      // Dosya adını belirle
      const fileName = url.split('/').pop()?.split('?')[0] || 'image-from-url';
      const fileExtension = blob.type.split('/')[1] || 'jpg';
      
      const file = new File([blob], `${fileName}.${fileExtension}`, { type: blob.type });
      console.log(`✅ Successfully loaded image: ${file.name} (${blob.size} bytes)`);
      return file;
      
    } catch (error) {
      console.error('Image loading error:', error);
      
      // CORS hatası ise özel mesaj
      if (error instanceof Error && error.message.includes('CORS')) {
        throw new Error('CORS_ERROR: This image cannot be loaded due to cross-origin restrictions');
      }
      
      throw error;
    } finally {
      setIsUrlLoading(false);
    }
  }, []);


  // Pixel boyutu değiştiğinde otomatik olarak pixel art'ı yeniden oluştur
  const regeneratePixelArt = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      setIsPixelating(true);
      const pixelatedUrl = await createPixelArt(selectedFile);
      setPixelatedImageHash(pixelatedUrl);
      setPixelatedPreview(getWorkingIpfsUrl(pixelatedUrl));
      setPixelStatus('success');
    } catch (error) {
      console.error('Pixel art regeneration failed:', error);
      setPixelStatus('error');
    } finally {
      setIsPixelating(false);
    }
  }, [selectedFile, createPixelArt]);

  // Yeni görsel yüklendiğinde otomatik olarak pixel art oluştur
  useEffect(() => {
    if (selectedFile) {
      regeneratePixelArt();
    }
  }, [selectedFile, regeneratePixelArt]);

  const handlePixelate = async () => {
    if (!selectedFile) return;
    
    try {
      const pixelatedUrl = await createPixelArt(selectedFile);
      setPixelatedImageHash(pixelatedUrl);
      setPixelatedPreview(getWorkingIpfsUrl(pixelatedUrl));
      setPixelStatus('success');
    } catch (error) {
      console.error('Pixelation failed:', error);
      setPixelStatus('error');
    }
  };

  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) return;
    
    try {
      // Google Görseller URL'lerini temizle
      let cleanUrl = imageUrl.trim();
      
      // Google Görseller URL'lerini işle
      if (cleanUrl.includes('google.com') && cleanUrl.includes('imgres')) {
        // Google Görseller URL'den gerçek resim URL'sini çıkar
        const imgUrlMatch = cleanUrl.match(/imgurl=([^&]+)/);
        if (imgUrlMatch) {
          cleanUrl = decodeURIComponent(imgUrlMatch[1]);
          console.log('Extracted Google Images URL:', cleanUrl);
        }
      }
      
      // Pinterest URL'lerini işle
      if (cleanUrl.includes('pinterest.com')) {
        cleanUrl = cleanUrl.replace('/pin/', '/pin/').split('?')[0];
      }
      
      // Instagram URL'lerini işle
      if (cleanUrl.includes('instagram.com')) {
        cleanUrl = cleanUrl.split('?')[0] + '?__a=1&__d=1';
      }
      
      const file = await loadImageFromUrl(cleanUrl);
      setSelectedFile(file);
      
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
        setPixelatedPreview(null);
        setPixelStatus('idle');
        setPixelatedImageHash("");
        setOriginalImageHash("");
      };
      reader.readAsDataURL(file);
      
      // Upload mode'u file'a çevir
      setUploadMode('file');
    } catch (error) {
      console.error('URL image loading failed:', error);
      
      // Daha detaylı hata mesajı
      let errorMessage = 'Failed to load image from URL.\n\n';
      
              if (error instanceof Error) {
          if (error.message.includes('CORS_ERROR')) {
            errorMessage += '❌ CORS Error: This website blocks external image loading.\n\n';
            errorMessage += '💡 Solutions:\n';
            errorMessage += '• Try the test URLs below (they work!)\n';
            errorMessage += '• Download the image to your computer first\n';
            errorMessage += '• Use public CDN links (Unsplash, Pexels, etc.)\n';
            errorMessage += '• Copy the direct image URL (ending with .jpg, .png)';
          } else if (error.message.includes('HTTP')) {
            errorMessage += `❌ HTTP Error: ${error.message}\n\n`;
            errorMessage += '💡 Solutions:\n';
            errorMessage += '• Check if the URL is correct\n';
            errorMessage += '• Try the test URLs below\n';
            errorMessage += '• Use public CDN links';
          } else if (error.message.includes('empty') || error.message.includes('0 bytes')) {
            errorMessage += '❌ Empty Image: The image file is empty or corrupted.\n\n';
            errorMessage += '💡 Solutions:\n';
            errorMessage += '• Try the test URLs below (they work!)\n';
            errorMessage += '• Use a different image URL\n';
            errorMessage += '• Download the image to your computer first';
          } else {
            errorMessage += `❌ Error: ${error.message}\n\n`;
            errorMessage += '💡 Solutions:\n';
            errorMessage += '• Try the test URLs below\n';
            errorMessage += '• Download the image to your computer first\n';
            errorMessage += '• Use public CDN links';
          }
        }
      
      alert(errorMessage);
    }
  };

  const handleMint = async () => {
    if (!currentAccount || !nftName.trim()) return;
    
    // Mint mode'a göre hangi resmi kullanacağımızı belirle
    let imageHash = "";
    let imageDescription = "";
    
    if (mintMode === 'original') {
      if (!originalImageHash) {
        // Orijinal resmi henüz yüklemediyse yükle
        try {
          const hash = await uploadOriginalImage(selectedFile!);
          setOriginalImageHash(hash);
          imageHash = hash;
          imageDescription = "Kullanıcı tarafından yüklenen orijinal görsel NFT";
        } catch (error) {
          console.error('Original image upload failed:', error);
          return;
        }
      } else {
        imageHash = originalImageHash;
        imageDescription = "Kullanıcı tarafından yüklenen orijinal görsel NFT";
      }
    } else {
      if (!pixelatedImageHash) {
        alert('Lütfen önce pixel art oluşturun');
        return;
      }
      imageHash = pixelatedImageHash;
      imageDescription = "Kullanıcı tarafından oluşturulan Pixel Art NFT";
    }
    
    if (!imageHash) return;

    setIsMinting(true);
    
    const tx = new Transaction();
    
    // Collection ID'yi kullan (artık deploy edilmiş durumda)
    const finalCollectionId = collectionId;
    
            tx.moveCall({
          target: `${counterPackageId}::nft_minter::mint_image_nft`,
          arguments: [
            tx.object(finalCollectionId),
            tx.pure.string(nftName),
            tx.pure.string(nftDescription || imageDescription),
            tx.pure.string(getWorkingIpfsUrl(imageHash)),
          ],
        });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async (result) => {
          console.log("NFT minted successfully!", result);
          try {
            // Transaction'ı bekle ve created object'leri al
            const txResult = await suiClient.waitForTransaction({
              digest: result.digest,
              options: {
                showEffects: true,
                showObjectChanges: true,
              },
            });
            
            // Created object'lerden NFT'yi bul
            const createdNFT = txResult.effects?.created?.find((obj: any) => 
              obj.owner && typeof obj.owner === 'object' && 'AddressOwner' in obj.owner
            );
            
            if (createdNFT && onMinted) {
              onMinted(createdNFT.reference.objectId);
            } else if (onMinted) {
              // Fallback olarak transaction digest'ini kullan
              onMinted(result.digest);
            }
          } catch (error) {
            console.error("Error getting NFT ID:", error);
            if (onMinted) {
              onMinted(result.digest);
            }
          }
          // Reset form
          setSelectedFile(null);
          setImagePreview(null);
          setPixelatedPreview(null);
          setNftName("");
          setNftDescription("");
          setPixelatedImageHash("");
          setPixelStatus('idle');
        },
        onError: (error) => {
          console.error("Minting failed:", error);
        },
        onSettled: () => {
          setIsMinting(false);
        },
      }
    );
  };

  return (
    <Flex direction="column" gap="6" style={{ maxWidth: 900, margin: "0 auto", padding: "24px", position: "relative" }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
      {/* Premium Header with Logos */}
      <Flex direction="column" align="center" gap="4" style={{ marginBottom: "32px" }}>
        {/* Main Title with Gradient */}
        <Heading size="8" align="center" style={{ 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "8px",
          fontWeight: "800",
          letterSpacing: "-0.02em"
        }}>
          🎨 Pixel Art NFT Creator
        </Heading>
        
        {/* Subtitle */}
        <Text size="4" align="center" color="gray" style={{ 
          marginBottom: "16px",
          fontWeight: "500",
          maxWidth: "600px"
        }}>
          Transform your images into stunning pixel art NFTs on the Sui blockchain
        </Text>

        {/* Logo Section */}
        <Flex align="center" gap="8" style={{ marginTop: "24px" }}>
          {/* Sui Logo */}
          <Flex align="center" gap="3" style={{
            background: "linear-gradient(135deg, #6fbcf0 0%, #4a90e2 100%)",
            padding: "16px 24px",
            borderRadius: "60px",
            boxShadow: "0 12px 40px rgba(111, 188, 240, 0.4)",
            border: "2px solid rgba(255, 255, 255, 0.2)"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}>
              <img 
                src="https://sui.io/favicon.ico" 
                alt="Sui Logo" 
                style={{ 
                  width: "24px", 
                  height: "24px",
                  borderRadius: "50%"
                }}
                onError={(e) => {
                  // Fallback to letter if image fails
                  (e.target as HTMLImageElement).style.display = "none";
                  const fallback = document.createElement("div");
                  fallback.innerHTML = "S";
                  fallback.style.color = "#4a90e2";
                  fallback.style.fontWeight = "bold";
                  fallback.style.fontSize = "18px";
                  (e.target as HTMLImageElement).parentNode?.appendChild(fallback);
                }}
              />
            </div>
            <Text size="4" weight="bold" style={{ color: "white" }}>Sui Network</Text>
          </Flex>

          {/* OverBlock Logo */}
          <Flex align="center" gap="3" style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "16px 24px",
            borderRadius: "60px",
            boxShadow: "0 12px 40px rgba(102, 126, 234, 0.4)",
            border: "2px solid rgba(255, 255, 255, 0.2)"
          }}>
            <div style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}>
              <img 
                src="https://overblock.io/favicon.ico" 
                alt="OverBlock Logo" 
                style={{ 
                  width: "24px", 
                  height: "24px",
                  borderRadius: "50%"
                }}
                onError={(e) => {
                  // Fallback to letter if image fails
                  (e.target as HTMLImageElement).style.display = "none";
                  const fallback = document.createElement("div");
                  fallback.innerHTML = "O";
                  fallback.style.color = "#667eea";
                  fallback.style.fontWeight = "bold";
                  fallback.style.fontSize = "18px";
                  (e.target as HTMLImageElement).parentNode?.appendChild(fallback);
                }}
              />
            </div>
            <Text size="4" weight="bold" style={{ color: "white" }}>OverBlock</Text>
          </Flex>
        </Flex>

        {/* Network Indicator */}
        <Flex align="center" justify="center" style={{ 
          marginTop: "16px",
          padding: "8px 16px",
          background: "rgba(16, 185, 129, 0.1)",
          borderRadius: "20px",
          border: "1px solid rgba(16, 185, 129, 0.2)"
        }}>
          <div style={{
            width: "8px",
            height: "8px",
            background: "#10b981",
            borderRadius: "50%",
            marginRight: "8px",
            animation: "pulse 2s infinite"
          }} />
          <Text size="2" color="green" weight="medium">
            Connected to Sui Testnet
          </Text>
        </Flex>

        {/* Made by OverBlock Watermark */}
        <Text size="2" color="gray" align="center" style={{ 
          marginTop: "24px",
          opacity: 0.8,
          fontStyle: "italic",
          letterSpacing: "0.05em",
          background: "rgba(102, 126, 234, 0.1)",
          padding: "8px 16px",
          borderRadius: "20px",
          border: "1px solid rgba(102, 126, 234, 0.2)"
        }}>
          Made with ❤️ by OverBlock
        </Text>
      </Flex>

      {/* Upload Mode Selection */}
      {!imagePreview && (
        <Card style={{ 
          padding: "24px", 
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.1)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(16, 185, 129, 0.1)",
          marginBottom: "24px"
        }}>
          <Flex direction="column" gap="4">
            <Text size="4" weight="medium" align="center" style={{ 
              color: "#10b981",
              marginBottom: "8px"
            }}>
              📤 Choose Upload Method
            </Text>
            <Flex justify="center" gap="4" wrap="wrap">
              <Button
                variant={uploadMode === 'file' ? 'solid' : 'outline'}
                style={{
                  background: uploadMode === 'file' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                    : 'transparent',
                  color: uploadMode === 'file' ? 'white' : '#10b981',
                  border: `2px solid ${uploadMode === 'file' ? '#10b981' : '#10b981'}`,
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setUploadMode('file')}
              >
                💾 Upload from Computer
              </Button>
              <Button
                variant={uploadMode === 'url' ? 'solid' : 'outline'}
                style={{
                  background: uploadMode === 'url' 
                    ? 'linear-gradient(135deg, #667eea 0%, #7c3aed 100%)' 
                    : 'transparent',
                  color: uploadMode === 'url' ? 'white' : '#667eea',
                  border: `2px solid ${uploadMode === 'url' ? '#667eea' : '#667eea'}`,
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setUploadMode('url')}
              >
                🌐 Load from URL
              </Button>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* URL Input Area */}
      {uploadMode === 'url' && !imagePreview && (
        <Card style={{ 
          padding: "24px", 
          background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
          border: "1px solid rgba(102, 126, 234, 0.1)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(102, 126, 234, 0.1)",
          marginBottom: "24px"
        }}>
          <Flex direction="column" gap="4">
            <Text size="4" weight="medium" align="center" style={{ 
              color: "#667eea",
              marginBottom: "8px"
            }}>
              🌐 Enter Image URL
            </Text>
            <Flex gap="3" style={{ maxWidth: "600px", margin: "0 auto" }}>
              <TextField.Root
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                size="3"
                style={{
                  flex: 1,
                  borderRadius: "12px",
                  border: "2px solid rgba(102, 126, 234, 0.2)",
                  transition: "all 0.3s ease"
                }}
              />
              <Button
                onClick={handleUrlSubmit}
                disabled={!imageUrl.trim() || isUrlLoading}
                size="3"
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #7c3aed 100%)",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 24px",
                  fontWeight: "600",
                  transition: "all 0.3s ease"
                }}
              >
                {isUrlLoading ? (
                  <>
                    <ClipLoader size={16} color="#fff" style={{ marginRight: "8px" }} />
                    Loading...
                  </>
                ) : (
                  <>
                    <ImageIcon size={16} style={{ marginRight: "8px" }} />
                    Load Image
                  </>
                )}
              </Button>
            </Flex>
            <Text size="2" color="gray" align="center" style={{ marginTop: "8px" }}>
              Enter a direct image URL (JPG, PNG, GIF, WEBP supported)
            </Text>
            <Text size="1" color="orange" align="center" style={{ marginTop: "4px", fontStyle: "italic" }}>
              ⚠️ Note: Some websites block external image loading due to CORS restrictions
            </Text>
            <Flex justify="center" gap="2" wrap="wrap" style={{ marginTop: "12px" }}>
              <Button
                size="2"
                variant="outline"
                style={{
                  border: "1px solid rgba(102, 126, 234, 0.3)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12px"
                }}
                onClick={() => setImageUrl('https://picsum.photos/400/400')}
              >
                Random Image
              </Button>
              <Button
                size="2"
                variant="outline"
                style={{
                  border: "1px solid rgba(102, 126, 234, 0.3)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12px"
                }}
                onClick={() => setImageUrl('https://images.pexels.com/photos/2014422/pexels-photo-2014422.jpeg?auto=compress&cs=tinysrgb&w=400')}
              >
                Nature Photo
              </Button>

              <Button
                size="2"
                variant="outline"
                style={{
                  border: "1px solid rgba(102, 126, 234, 0.3)",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12px"
                }}
                onClick={() => setImageUrl('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop')}
              >
                Unsplash
              </Button>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* File Upload Area with Premium Design */}
      {uploadMode === 'file' && (
        <Card style={{ 
          padding: "32px", 
          background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
          border: "1px solid rgba(102, 126, 234, 0.1)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(102, 126, 234, 0.1)"
        }}>
          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? '#667eea' : 'rgba(102, 126, 234, 0.3)'}`,
              borderRadius: "16px",
              padding: "48px 24px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: isDragActive ? "rgba(102, 126, 234, 0.08)" : "rgba(102, 126, 234, 0.02)",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative",
              overflow: "hidden"
            }}
          >
          {/* Animated Background Pattern */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.03) 0%, transparent 50%)",
            pointerEvents: "none"
          }} />
          
          <input {...getInputProps()} />
          
          {imagePreview ? (
            <Flex direction="column" align="center" gap="4">
              <div style={{
                position: "relative",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)"
              }}>
                <SmartImage 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ 
                    width: "200px", 
                    height: "200px", 
                    objectFit: "cover",
                    transition: "transform 0.3s ease"
                  }} 
                />
                <div style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  background: "rgba(16, 185, 129, 0.9)",
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "600",
                  backdropFilter: "blur(10px)"
                }}>
                  ✓ Selected
                </div>
              </div>
              <Text size="2" color="green" weight="medium">
                <CheckCircle size={16} style={{ display: "inline", marginRight: "8px" }} />
                Image selected successfully
              </Text>
              <Text size="1" color="gray" style={{ 
                background: "rgba(102, 234, 126, 0.1)",
                padding: "4px 12px",
                borderRadius: "12px",
                fontFamily: "monospace"
              }}>
                {selectedFile?.name}
              </Text>
            </Flex>
          ) : (
            <Flex direction="column" align="center" gap="4">
              <div style={{
                width: "80px",
                height: "80px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 20px 40px rgba(102, 126, 234, 0.3)",
                marginBottom: "16px"
              }}>
                <Upload size={40} color="white" />
              </div>
              <Text size="5" weight="medium" style={{ color: "#667eea", marginBottom: "8px" }}>
                {isDragActive ? "Drop your image here" : "Click to upload or drag & drop"}
              </Text>
              <Text size="3" color="gray" style={{ maxWidth: "400px", lineHeight: "1.5" }}>
                Support for PNG, JPG, GIF, WEBP formats. 
                <br />Your image will be transformed into beautiful pixel art.
              </Text>
            </Flex>
          )}
        </div>
        </Card>
      )}

      {/* Fixed Pixel Size Info */}


      {/* Create Pixel Art Button with Premium Design */}
      {selectedFile && pixelStatus === 'idle' && (
        <Button 
          onClick={handlePixelate}
          disabled={isPixelating}
          size="4"
                      style={{ 
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              borderRadius: "16px",
              padding: "16px 32px",
              fontSize: "18px",
              fontWeight: "600",
              boxShadow: "0 20px 40px rgba(102, 126, 234, 0.3)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: "translateY(0)"
            }}
        >
          {isPixelating ? (
            <>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite", marginRight: "12px" }} />
              Creating Pixel Art...
            </>
          ) : (
            <>
              <Palette size={20} style={{ marginRight: "12px" }} />
              Create Pixel Art
            </>
          )}
        </Button>
      )}



      {pixelStatus === 'error' && (
        <Flex align="center" justify="center" gap="3" style={{ 
          color: "#ef4444",
          padding: "16px 24px",
          background: "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)",
          borderRadius: "16px",
          border: "1px solid rgba(239, 68, 68, 0.2)"
        }}>
          <AlertCircle size={20} />
          <Text size="3" weight="medium">Failed to create pixel art. Please try again.</Text>
        </Flex>
      )}

      {/* Pixel Art Preview with Premium Design */}
      {pixelStatus === 'success' && pixelatedPreview && (
        <Card style={{ 
          padding: "32px", 
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.1)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(139, 92, 246, 0.1)"
        }}>
          <Flex direction="column" gap="6">
            <Text size="5" weight="medium" align="center" style={{ 
              color: "#8b5cf6",
              marginBottom: "8px"
            }}>
              🎨 NFT Preview
            </Text>
            <Flex justify="center" gap="8" wrap="wrap">
              <Flex direction="column" align="center" gap="3">
                <Text size="3" weight="medium" color="gray" style={{ marginBottom: "8px" }}>
                  Original Image
                </Text>
                <div style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 16px 32px rgba(0,0,0,0.15)",
                  border: "3px solid rgba(139, 92, 246, 0.1)"
                }}>
                  <SmartImage 
                    src={imagePreview!} 
                    alt="Original" 
                    style={{ 
                      width: "140px", 
                      height: "140px", 
                      objectFit: "cover"
                    }} 
                  />
                </div>
              </Flex>
              
              <Flex direction="column" align="center" gap="3">
                <Text size="3" weight="medium" color="gray" style={{ marginBottom: "8px" }}>
                  Pixel Art NFT
                </Text>
                <div style={{
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 16px 32px rgba(0,0,0,0.15)",
                  border: "3px solid rgba(139, 92, 246, 0.2)",
                  position: "relative"
                }}>
                  <SmartImage 
                    src={pixelatedPreview} 
                    alt="Pixelated" 
                    style={{ 
                      width: "140px", 
                      height: "140px", 
                      objectFit: "cover"
                    }} 
                  />
                                     <div style={{
                     position: "absolute",
                     bottom: "8px",
                     left: "8px",
                     right: "8px",
                     background: "rgba(139, 92, 246, 0.9)",
                     color: "white",
                     padding: "4px 8px",
                     borderRadius: "8px",
                     fontSize: "10px",
                     fontWeight: "600",
                     textAlign: "center",
                     backdropFilter: "blur(10px)"
                   }}>
                     64x64 → 128x128
                   </div>
                </div>
                <Text size="1" color="gray" style={{ 
                  background: "rgba(139, 92, 246, 0.1)",
                  padding: "4px 12px",
                  borderRadius: "12px",
                  fontFamily: "monospace"
                }}>
                  16KB limit optimized
                </Text>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* Mint Mode Selection */}
      {imagePreview && (
        <Card style={{ 
          padding: "24px", 
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.1)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(16, 185, 129, 0.1)"
        }}>
          <Flex direction="column" gap="4">
            <Text size="4" weight="medium" align="center" style={{ 
              color: "#10b981",
              marginBottom: "8px"
            }}>
              🎯 Mint Mode Seçin
            </Text>
            <Flex justify="center" gap="4" wrap="wrap">
              <Button
                variant={mintMode === 'original' ? 'solid' : 'outline'}
                style={{
                  background: mintMode === 'original' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                    : 'transparent',
                  color: mintMode === 'original' ? 'white' : '#10b981',
                  border: `2px solid ${mintMode === 'original' ? '#10b981' : '#10b981'}`,
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setMintMode('original')}
              >
                🖼️ Orijinal Resim (Yüksek Kalite)
              </Button>
              <Button
                variant={mintMode === 'pixelated' ? 'solid' : 'outline'}
                style={{
                  background: mintMode === 'pixelated' 
                    ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' 
                    : 'transparent',
                  color: mintMode === 'pixelated' ? 'white' : '#8b5cf6',
                  border: `2px solid ${mintMode === 'pixelated' ? '#8b5cf6' : '#8b5cf6'}`,
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setMintMode('pixelated')}
              >
                🎨 Pixel Art (64x64)
              </Button>
            </Flex>
            <Text size="2" color="gray" align="center" style={{ marginTop: "8px" }}>
              {mintMode === 'original' 
                ? 'Orijinal resminizi yüksek kalitede NFT olarak mintleyin' 
                : 'Resminizi pixel art formatında NFT olarak mintleyin'
              }
            </Text>
          </Flex>
        </Card>
      )}

      {/* NFT Metadata Form with Premium Design */}
      {imagePreview && (
        <Card style={{ 
          padding: "32px", 
          background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)",
          border: "1px solid rgba(59, 130, 246, 0.1)",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(59, 130, 246, 0.1)"
        }}>
          <Flex direction="column" gap="5">
            <Text size="4" weight="medium" align="center" style={{ 
              color: "#3b82f6",
              marginBottom: "8px"
            }}>
              📝 NFT Details
            </Text>
            
            <Box>
              <Text size="3" weight="medium" style={{ marginBottom: "12px", display: "block", color: "#374151" }}>
                NFT Name *
              </Text>
              <TextField.Root
                placeholder="e.g., Pixel Landscape #1"
                value={nftName}
                onChange={(e) => setNftName(e.target.value)}
                size="3"
                style={{
                  borderRadius: "12px",
                  border: "2px solid rgba(59, 130, 246, 0.2)",
                  transition: "all 0.3s ease"
                }}
              />
            </Box>

            <Box>
              <Text size="3" weight="medium" style={{ marginBottom: "12px", display: "block", color: "#374151" }}>
                Description
              </Text>
                              <TextArea
                  placeholder="Describe your pixel art NFT..."
                  value={nftDescription}
                  onChange={(e) => setNftDescription(e.target.value)}
                  rows={3}
                  resize="vertical"
                  style={{
                    borderRadius: "12px",
                    border: "2px solid rgba(59, 130, 246, 0.2)",
                    transition: "all 0.3s ease"
                  }}
                />
            </Box>

            <Button
              onClick={handleMint}
              disabled={!nftName.trim() || isMinting || (mintMode === 'pixelated' && !pixelatedImageHash)}
              size="4"
              style={{
                background: mintMode === 'original' 
                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                  : "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                border: "none",
                borderRadius: "16px",
                padding: "16px 32px",
                fontSize: "18px",
                fontWeight: "600",
                marginTop: "24px",
                boxShadow: mintMode === 'original'
                  ? "0 20px 40px rgba(16, 185, 129, 0.3)"
                  : "0 20px 40px rgba(139, 92, 246, 0.3)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: "translateY(0)"
              }}
            >
              {isMinting ? (
                <>
                  <ClipLoader size={20} color="#fff" style={{ marginRight: "12px" }} />
                  Creating NFT on Sui...
                </>
              ) : (
                <>
                  <ImageIcon size={20} style={{ marginRight: "12px" }} />
                  {mintMode === 'original' ? 'Mint Original Image NFT' : 'Mint Pixel Art NFT'}
                </>
              )}
            </Button>
          </Flex>
        </Card>
      )}

      {/* Info Card with Premium Design */}
      <Card style={{ 
        padding: "28px", 
        background: "linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)",
        border: "1px solid rgba(102, 126, 234, 0.15)",
        borderRadius: "20px",
        boxShadow: "0 20px 60px rgba(102, 126, 234, 0.1)"
      }}>
        <Flex direction="column" gap="4">
          <Text size="4" weight="medium" align="center" style={{ 
            color: "#667eea",
            marginBottom: "8px"
          }}>
            💡 How It Works
          </Text>
          <Flex direction="column" gap="3">
            {[
              "1. Upload an image from your computer or enter an image URL",
              "2. Choose between original image or pixel art NFT",
              "3. For pixel art: Click 'Create Pixel Art' to generate 64x64 → 128x128",
              "4. Images are automatically optimized and stored on IPFS",
              "5. Fill in NFT name and description, then mint on Sui blockchain"
            ].map((step, index) => (
              <Flex key={index} align="center" gap="3">
                <div style={{
                  width: "24px",
                  height: "24px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold"
                }}>
                  {index + 1}
                </div>
                <Text size="3" color="gray" style={{ lineHeight: "1.5" }}>
                  {step}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Flex>
      </Card>

      {/* Made by OverBlock Footer */}
      <Flex align="center" justify="center" style={{ 
        marginTop: "40px",
        padding: "24px",
        borderTop: "2px solid rgba(102, 126, 234, 0.15)",
        background: "rgba(102, 126, 234, 0.02)",
        borderRadius: "20px"
      }}>
        <Text size="3" color="gray" style={{ opacity: 0.8, fontWeight: "500", textAlign: "center" }}>
          Made with ❤️ by OverBlock
        </Text>
      </Flex>
    </Flex>
  );
}
